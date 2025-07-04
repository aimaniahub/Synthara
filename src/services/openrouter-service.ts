import { OpenAI } from 'openai';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  siteUrl?: string;
  siteName?: string;
}

export interface StructuredDataRequest {
  userPrompt: string;
  numRows: number;
  scrapedContent: string;
}

export interface StructuredDataResponse {
  jsonString: string;
  detectedSchema: Array<{
    name: string;
    type: string;
  }>;
  feedback: string;
}

export class OpenRouterService {
  private client: OpenAI;
  private model: string;
  private siteUrl?: string;
  private siteName?: string;

  constructor(config: OpenRouterConfig) {
    this.client = new OpenAI({
      baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
    });
    
    this.model = config.model || 'deepseek/deepseek-chat-v3-0324:free';
    this.siteUrl = config.siteUrl;
    this.siteName = config.siteName;
  }

  /**
   * Process large scraped content and extract structured data
   * Uses DeepSeek Chat V3 model via OpenRouter
   */
  async processScrapedContent(request: StructuredDataRequest): Promise<StructuredDataResponse> {
    console.log(`[OpenRouter] 🧠 CONTENT-FIRST DYNAMIC SCHEMA DISCOVERY`);
    console.log(`[OpenRouter] Processing ${request.scrapedContent.length} characters with ${this.model}`);
    console.log(`[OpenRouter] Target: ${request.numRows} rows using comprehensive content analysis`);

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(request);

      console.log(`[OpenRouter] 🚀 Sending request to DeepSeek Chat V3...`);

      const extraHeaders: Record<string, string> = {};
      if (this.siteUrl) {
        extraHeaders["HTTP-Referer"] = this.siteUrl;
      }
      if (this.siteName) {
        extraHeaders["X-Title"] = this.siteName;
      }

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
      }, {
        headers: extraHeaders
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenRouter DeepSeek model');
      }

      console.log(`[OpenRouter] ✅ Received response: ${response.length} characters`);

      return this.parseResponse(response, request.numRows);

    } catch (error: any) {
      console.error(`[OpenRouter] ❌ Error processing content:`, error);
      throw new Error(`OpenRouter processing failed: ${error.message}`);
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert data analyst and schema designer specializing in extracting structured datasets from web content. Your task is to analyze scraped web content and create comprehensive, realistic datasets.

CORE PRINCIPLES:
1. CONTENT-FIRST APPROACH: Let the scraped content dictate the optimal dataset structure
2. DYNAMIC SCHEMA DISCOVERY: Analyze content to determine the most valuable columns
3. REAL DATA EXTRACTION: Extract actual values, measurements, and statistics from content
4. COMPREHENSIVE UTILIZATION: Use all available information to maximize dataset value

RESPONSE FORMAT:
You must respond with a JSON object containing exactly these fields:
{
  "detectedSchema": [{"name": "column_name", "type": "data_type"}],
  "generatedRows": [{"column1": "value1", "column2": "value2"}],
  "feedback": "explanation of your analysis and approach"
}

SCHEMA DESIGN RULES:
- Create 5-15 columns based on content richness
- Use descriptive, professional column names
- Include data types: string, number, boolean, date
- Prioritize columns with the most valuable information

DATA GENERATION RULES:
- Extract real values from the scraped content when possible
- Generate realistic values that match the content context
- Ensure data consistency and logical relationships
- Use proper data types and formats
- Create diverse, meaningful datasets

QUALITY STANDARDS:
- All JSON keys must exactly match schema column names
- Numerical values should be realistic and contextually appropriate
- String values should be meaningful and varied
- Dates should be in ISO format when applicable
- Boolean values should be logically consistent`;
  }

  private buildUserPrompt(request: StructuredDataRequest): string {
    return `USER REQUEST: "${request.userPrompt}"

TARGET ROWS: ${request.numRows}

SCRAPED CONTENT TO ANALYZE:
${request.scrapedContent}

INSTRUCTIONS:
1. Analyze the scraped content thoroughly
2. Design an optimal schema based on available data
3. Generate ${request.numRows} rows of data
4. Ensure all data is contextually appropriate and valuable
5. Respond with the exact JSON format specified in the system prompt

Focus on creating a high-quality dataset that maximizes the value of the scraped content while meeting the user's specific requirements.`;
  }

  private fixJsonIssues(jsonString: string): string {
    try {
      // Fix common JSON formatting issues
      let fixed = jsonString.trim();

      // Remove trailing commas before closing brackets/braces
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

      // Fix incomplete objects - find the last complete closing brace
      if (!fixed.endsWith('}') && !fixed.endsWith(']')) {
        const lastBraceIndex = fixed.lastIndexOf('}');
        const lastBracketIndex = fixed.lastIndexOf(']');
        const lastIndex = Math.max(lastBraceIndex, lastBracketIndex);

        if (lastIndex > 0) {
          fixed = fixed.substring(0, lastIndex + 1);
        }
      }

      // Fix missing quotes around property names
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      // Fix single quotes to double quotes
      fixed = fixed.replace(/'/g, '"');

      // Remove any control characters that might break JSON
      fixed = fixed.replace(/[\x00-\x1F\x7F]/g, '');

      // Try to balance braces and brackets
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;

      // Add missing closing braces
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }

      // Add missing closing brackets
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
      }

      return fixed;
    } catch (error) {
      console.warn('[OpenRouter] JSON fix attempt failed:', error);
      return jsonString; // Return original if fixing fails
    }
  }

  private parseResponse(response: string, targetRows: number): StructuredDataResponse {
    try {
      // Clean the response and extract JSON
      let cleanedResponse = response.trim();

      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to find the JSON object
      let jsonString = '';
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      } else {
        // If no JSON found, try the whole response
        jsonString = cleanedResponse;
      }

      // Try to fix common JSON issues
      jsonString = this.fixJsonIssues(jsonString);

      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseError: any) {
        console.error('[OpenRouter] JSON parse failed, attempting recovery:', parseError);

        // Try to extract partial data from the malformed JSON
        const partialMatch = jsonString.match(/"generatedRows"\s*:\s*\[([\s\S]*?)\]/);
        if (partialMatch) {
          try {
            const rowsData = `[${partialMatch[1]}]`;
            const partialRows = JSON.parse(rowsData);
            console.log('[OpenRouter] ✅ Recovered partial data:', partialRows.length, 'rows');

            // Create a minimal valid response
            parsed = {
              detectedSchema: [],
              generatedRows: partialRows,
              feedback: `Recovered ${partialRows.length} rows from corrupted response`
            };
          } catch (recoveryError) {
            console.error('[OpenRouter] Recovery failed:', recoveryError);
            throw new Error(`JSON parsing failed: ${parseError?.message || parseError}`);
          }
        } else {
          throw new Error(`JSON parsing failed and no recoverable data found: ${parseError?.message || parseError}`);
        }
      }

      // Check if this is an analysis response (no data generation)
      if (targetRows === 0) {
        // This is an analysis request, return the analysis directly
        return {
          jsonString: JSON.stringify(parsed, null, 2),
          detectedSchema: [], // Not needed for analysis
          feedback: 'Analysis completed successfully'
        };
      }

      // Validate required fields for data generation
      if (!parsed.detectedSchema || !Array.isArray(parsed.detectedSchema)) {
        console.warn('[OpenRouter] Missing or invalid detectedSchema, attempting to infer...');
        // Try to infer schema from the first row if available
        if (parsed.generatedRows && Array.isArray(parsed.generatedRows) && parsed.generatedRows.length > 0) {
          const firstRow = parsed.generatedRows[0];
          parsed.detectedSchema = Object.keys(firstRow).map(key => ({
            name: key,
            type: typeof firstRow[key] === 'number' ? 'number' : 'string'
          }));
          console.log('[OpenRouter] ✅ Inferred schema from data:', parsed.detectedSchema.length, 'columns');
        } else {
          throw new Error('Invalid or missing detectedSchema and cannot infer from data');
        }
      }

      if (!parsed.generatedRows || !Array.isArray(parsed.generatedRows)) {
        throw new Error('Invalid or missing generatedRows');
      }

      // Ensure we have the target number of rows
      const actualRows = parsed.generatedRows.length;
      console.log(`[OpenRouter] 📊 Generated ${actualRows} rows (target: ${targetRows})`);

      return {
        jsonString: JSON.stringify(parsed.generatedRows, null, 2),
        detectedSchema: parsed.detectedSchema,
        feedback: parsed.feedback || `Successfully generated ${actualRows} rows using DeepSeek Chat V3 via OpenRouter`
      };

    } catch (error: any) {
      console.error(`[OpenRouter] ❌ Error parsing response:`, error);
      console.log(`[OpenRouter] Raw response (first 1000 chars):`, response.substring(0, 1000));

      // Try to extract any valid JSON arrays from the response
      try {
        const arrayMatches = response.match(/\[[\s\S]*?\]/g);
        if (arrayMatches && arrayMatches.length > 0) {
          // Try to parse the largest array found
          const largestArray = arrayMatches.reduce((a, b) => a.length > b.length ? a : b);
          const parsedArray = JSON.parse(largestArray);

          if (Array.isArray(parsedArray) && parsedArray.length > 0) {
            // Generate schema from the first object
            const firstObj = parsedArray[0];
            const detectedSchema = Object.keys(firstObj).map(key => ({
              name: key,
              type: typeof firstObj[key] === 'number' ? 'number' :
                    typeof firstObj[key] === 'boolean' ? 'boolean' : 'string'
            }));

            return {
              jsonString: JSON.stringify(parsedArray, null, 2),
              detectedSchema,
              feedback: `Recovered ${parsedArray.length} rows from partially corrupted response`
            };
          }
        }
      } catch (recoveryError) {
        console.error(`[OpenRouter] Recovery attempt failed:`, recoveryError);
      }

      // Return a fallback response
      return {
        jsonString: '[]',
        detectedSchema: [
          { name: 'id', type: 'number' },
          { name: 'data', type: 'string' },
          { name: 'status', type: 'string' }
        ],
        feedback: `Error parsing OpenRouter response: ${error.message}. Please check the model output format.`
      };
    }
  }

  /**
   * Test the OpenRouter connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`[OpenRouter] 🔍 Testing connection to ${this.model}...`);
      
      const extraHeaders: Record<string, string> = {};
      if (this.siteUrl) {
        extraHeaders["HTTP-Referer"] = this.siteUrl;
      }
      if (this.siteName) {
        extraHeaders["X-Title"] = this.siteName;
      }

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: 'Hello! Please respond with "Connection successful" to test the API.' }
        ],
        max_tokens: 50
      }, {
        headers: extraHeaders
      });

      const response = completion.choices[0]?.message?.content;
      console.log(`[OpenRouter] ✅ Connection test response:`, response);
      
      return !!response;
    } catch (error: any) {
      console.error(`[OpenRouter] ❌ Connection test failed:`, error);
      return false;
    }
  }
}
