/**
 * Simple AI service replacement for Genkit
 * Provides direct API calls without OpenTelemetry dependencies
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI
const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

if (googleApiKey) {
  genAI = new GoogleGenerativeAI(googleApiKey);
}

export interface SimpleAIInput {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SimpleAIOutput {
  text: string;
  model: string;
}

export class SimpleAI {
  static async generate(input: SimpleAIInput): Promise<SimpleAIOutput> {
    const { prompt, model = 'gemini-1.5-flash', maxTokens = 4000, temperature = 0.7 } = input;

    if (!genAI) {
      throw new Error('Google AI not initialized. Please set GOOGLE_GENERATIVE_AI_API_KEY environment variable.');
    }

    try {
      const geminiModel = genAI.getGenerativeModel({ 
        model: model.replace('googleai/', ''),
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature,
        },
      });

      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        model: model,
      };
    } catch (error: any) {
      console.error(`[SimpleAI] Error with model ${model}:`, error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  static async generateWithSchema<T>(input: SimpleAIInput & { schema: any }): Promise<T> {
    const { schema, ...aiInput } = input;
    
    // Add JSON schema instruction to prompt
    const enhancedPrompt = `${aiInput.prompt}

Please respond with valid JSON that matches this schema. Do not include any markdown formatting or code blocks, just the raw JSON.

Required JSON structure:
${JSON.stringify(schema, null, 2)}`;

    const result = await this.generate({
      ...aiInput,
      prompt: enhancedPrompt,
    });

    try {
      return JSON.parse(result.text) as T;
    } catch (parseError) {
      console.error('[SimpleAI] Failed to parse JSON response:', result.text);
      throw new Error('AI returned invalid JSON format');
    }
  }
}

// Export a simple ai object that mimics Genkit's interface
export const ai = {
  generate: SimpleAI.generate,
  generateWithSchema: SimpleAI.generateWithSchema,
  
  // Mock defineFlow for compatibility
  defineFlow: (config: any, handler: any) => {
    return handler;
  },
  
  // Mock definePrompt for compatibility
  definePrompt: (config: any) => {
    return async (input: any) => {
      const result = await SimpleAI.generate({
        prompt: typeof config.prompt === 'function' ? config.prompt(input) : config.prompt,
        model: config.model,
      });
      
      if (config.output?.schema) {
        try {
          const parsed = JSON.parse(result.text);
          return { output: parsed };
        } catch {
          return { output: result.text };
        }
      }
      
      return { output: result.text };
    };
  },
};

// Create a chainable schema builder
class SchemaBuilder {
  private schema: any;

  constructor(schema: any) {
    this.schema = schema;
  }

  describe(description: string) {
    return new SchemaBuilder({ ...this.schema, description });
  }

  optional() {
    return new SchemaBuilder({ ...this.schema, optional: true });
  }

  default(value: any) {
    return new SchemaBuilder({ ...this.schema, default: value });
  }

  min(value: number) {
    return new SchemaBuilder({ ...this.schema, min: value });
  }

  max(value: number) {
    return new SchemaBuilder({ ...this.schema, max: value });
  }
}

// Export z for schema compatibility
export const z = {
  object: (schema: any) => new SchemaBuilder({ type: 'object', properties: schema }),
  string: () => new SchemaBuilder({ type: 'string' }),
  number: () => new SchemaBuilder({ type: 'number' }),
  boolean: () => new SchemaBuilder({ type: 'boolean' }),
  array: (items: any) => new SchemaBuilder({ type: 'array', items }),
  record: (key: any, value: any) => new SchemaBuilder({ type: 'object', additionalProperties: value }),
  any: () => new SchemaBuilder({ type: 'any' }),
  infer: (schema: any) => schema as any,
};
