/**
 * Simple AI service replacement for Genkit
 * Now uses OpenRouter DeepSeek instead of Google AI
 */

import { OpenAI } from 'openai';

// Initialize OpenRouter client
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
let openRouterClient: OpenAI | null = null;

if (openRouterApiKey) {
  openRouterClient = new OpenAI({
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: openRouterApiKey,
  });
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
    const { prompt, model = 'deepseek/deepseek-chat-v3-0324:free', maxTokens = 4000, temperature = 0.7 } = input;

    if (!openRouterClient) {
      throw new Error('OpenRouter not initialized. Please set OPENROUTER_API_KEY environment variable.');
    }

    try {
      const extraHeaders: Record<string, string> = {};
      if (process.env.OPENROUTER_SITE_URL) {
        extraHeaders["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
      }
      if (process.env.OPENROUTER_SITE_NAME) {
        extraHeaders["X-Title"] = process.env.OPENROUTER_SITE_NAME;
      }

      const completion = await openRouterClient.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        max_tokens: maxTokens
      }, {
        headers: extraHeaders
      });

      const text = completion.choices[0]?.message?.content || '';

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
      // Clean the response text to handle markdown code blocks
      let cleanedText = result.text.trim();

      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Remove any leading/trailing whitespace
      cleanedText = cleanedText.trim();

      return JSON.parse(cleanedText) as T;
    } catch (parseError) {
      console.error('[SimpleAI] Failed to parse JSON response:', result.text);
      console.error('[SimpleAI] Parse error:', parseError);
      throw new Error('AI returned invalid JSON format');
    }
  }
}

// Note: ai object, compatibility functions, and schema builder removed since we're using zod directly
