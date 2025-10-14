/**
 * Gemini AI Service
 * Service for interacting with Google Gemini 2.5 Flash API
 */

export interface GeminiSearchQuery {
  query: string;
  reasoning: string;
  priority: number;
}

export interface GeminiSearchQueriesResponse {
  success: boolean;
  queries: GeminiSearchQuery[];
  error?: string;
}

export interface GeminiRefinedContent {
  url: string;
  title: string;
  relevantContent: string;
  confidence: number;
}

export interface GeminiContentRefinementResponse {
  success: boolean;
  refinedContent: GeminiRefinedContent[];
  error?: string;
}

export interface GeminiDataSchema {
  name: string;
  type: string;
  description: string;
}

export interface GeminiStructuredData {
  schema: GeminiDataSchema[];
  data: Array<Record<string, any>>;
  reasoning: string;
}

export interface GeminiDataStructuringResponse {
  success: boolean;
  structuredData: GeminiStructuredData;
  error?: string;
}

export class GeminiService {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_GEMINI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('[Gemini] No API key provided. Gemini functionality will be limited.');
    }
  }

  /**
   * Generate search queries from user prompt
   */
  async generateSearchQueries(userQuery: string): Promise<GeminiSearchQueriesResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          queries: [],
          error: 'Gemini API key not configured'
        };
      }

      console.log(`[Gemini] Generating search queries for: "${userQuery.substring(0, 100)}..."`);

      const prompt = `Generate 2-3 simple, natural search queries for web search.

User Query: "${userQuery}"

Generate queries that:
1. Are simple and natural (how humans search)
2. Use plain keywords without advanced operators
3. Focus on finding relevant data sources

AVOID: site: operators, OR operators, quotes, exclusions, date filters

Examples of GOOD queries:
- "restaurants in mumbai with ratings"
- "electric vehicle charging bangalore"
- "kannada movies 2025"

Examples of BAD queries:
- "restaurants site:zomato.com OR site:tripadvisor.com"
- ""best restaurants" mumbai "2024" -ads"

Return JSON: { "queries": [{"query": "...", "reasoning": "...", "priority": 1}] }`;

      const response = await this.callGeminiAPI(prompt);
      
      if (!response.success) {
        return response;
      }

      // Extract JSON from markdown code blocks if present
      const jsonText = this.extractJsonFromResponse(response.text);
      const parsed = JSON.parse(jsonText);
      const queries: GeminiSearchQuery[] = parsed.queries || [];

      console.log(`[Gemini] Generated ${queries.length} search queries`);

      return {
        success: true,
        queries
      };

    } catch (error: any) {
      console.error('[Gemini] Generate search queries error:', error);
      return {
        success: false,
        queries: [],
        error: error.message
      };
    }
  }

  /**
   * Refine scraped content to remove noise and keep relevant information
   */
  async refineContent(
    scrapedContent: Array<{url: string, title: string, content: string}>,
    userQuery: string
  ): Promise<GeminiContentRefinementResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          refinedContent: [],
          error: 'Gemini API key not configured'
        };
      }

      console.log(`[Gemini] Refining content from ${scrapedContent.length} sources`);

      const contentSummary = scrapedContent.map((item, index) => 
        `Source ${index + 1}:
URL: ${item.url}
Title: ${item.title}
Content: ${item.content.substring(0, 1000)}...`
      ).join('\n\n');

      const prompt = `You are an expert at content refinement for data extraction. 
Given scraped web content and a user query, filter out noise and keep only relevant information.

User Query: "${userQuery}"

Scraped Content:
${contentSummary}

For each source, extract only the content that is directly relevant to the user query. Remove:
- Navigation menus, footers, headers
- Advertisements and promotional content
- Irrelevant sections
- Duplicate information
- Meta information not related to the query

Keep:
- Data that directly answers the user query
- Structured information (tables, lists)
- Key facts and figures
- Relevant descriptions and details

Return your response as a JSON object with this exact structure:
{
  "refinedContent": [
    {
      "url": "source_url",
      "title": "page_title",
      "relevantContent": "cleaned_relevant_content",
      "confidence": 0.95
    }
  ]
}

Set confidence between 0-1 based on how relevant the content is to the user query. Rate content 0.3+ if it contains ANY relevant data, even if the page has other content.`;

      const response = await this.callGeminiAPI(prompt);
      
      if (!response.success) {
        return response;
      }

      // Extract JSON from markdown code blocks if present
      const jsonText = this.extractJsonFromResponse(response.text);
      const parsed = JSON.parse(jsonText);
      const refinedContent: GeminiRefinedContent[] = parsed.refinedContent || [];

      console.log(`[Gemini] Refined content from ${scrapedContent.length} to ${refinedContent.length} sources`);

      return {
        success: true,
        refinedContent
      };

    } catch (error: any) {
      console.error('[Gemini] Refine content error:', error);
      return {
        success: false,
        refinedContent: [],
        error: error.message
      };
    }
  }

  /**
   * Structure refined content into a dataset with proper schema
   */
  async structureData(
    refinedContent: GeminiRefinedContent[],
    userQuery: string,
    numRows: number
  ): Promise<GeminiDataStructuringResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          structuredData: { schema: [], data: [], reasoning: '' },
          error: 'Gemini API key not configured'
        };
      }

      console.log(`[Gemini] Structuring data from ${refinedContent.length} sources for ${numRows} rows`);

      const contentSummary = refinedContent.map((item, index) => 
        `Source ${index + 1}:
URL: ${item.url}
Title: ${item.title}
Content: ${item.relevantContent}
Confidence: ${item.confidence}`
      ).join('\n\n');

      const prompt = `You are an expert at data structuring and schema design. 
Given refined web content and a user query, create a structured dataset with appropriate columns and data.

User Query: "${userQuery}"
Target Rows: ${numRows}

Refined Content:
${contentSummary}

Analyze the user query to determine what kind of data structure would be most useful. Create a schema with columns that would best represent the information the user is looking for.

IMPORTANT: Combine data from ALL sources to create comprehensive dataset. If sources have partial data, merge them intelligently. Extract maximum possible rows, even if some fields are null.

For movie data: Extract from IMDb ratings, cast lists, plot summaries
For restaurant data: Extract from review snippets, rating displays, address text  
For EV stations: Extract from location maps, station lists, provider directories

For each piece of relevant content, extract data that fits the schema and create data rows. If there isn't enough data to fill all ${numRows} rows, create as many as possible with the available information.

Return your response as a JSON object with this exact structure:
{
  "schema": [
    {
      "name": "column_name",
      "type": "String|Number|Date|Boolean",
      "description": "what this column represents"
    }
  ],
  "data": [
    {
      "column1": "value1",
      "column2": "value2"
    }
  ],
  "reasoning": "explanation of the schema design and data extraction approach"
}

Make sure the data is clean, consistent, and directly relevant to the user query.`;

      const response = await this.callGeminiAPI(prompt);
      
      if (!response.success) {
        return response;
      }

      // Extract JSON from markdown code blocks if present
      const jsonText = this.extractJsonFromResponse(response.text);
      const parsed = JSON.parse(jsonText);
      const structuredData: GeminiStructuredData = {
        schema: parsed.schema || [],
        data: parsed.data || [],
        reasoning: parsed.reasoning || ''
      };

      console.log(`[Gemini] Structured data: ${structuredData.data.length} rows, ${structuredData.schema.length} columns`);

      return {
        success: true,
        structuredData
      };

    } catch (error: any) {
      console.error('[Gemini] Structure data error:', error);
      return {
        success: false,
        structuredData: { schema: [], data: [], reasoning: '' },
        error: error.message
      };
    }
  }

  /**
   * Call Gemini API with retry logic
   */
  private async callGeminiAPI(prompt: string, maxRetries: number = 3): Promise<{success: boolean, text: string, error?: string}> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(`Gemini API error: ${data.error.message}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('No response text from Gemini API');
        }

        return {
          success: true,
          text
        };

      } catch (error: any) {
        console.warn(`[Gemini] Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            text: '',
            error: error.message
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      success: false,
      text: '',
      error: 'Max retries exceeded'
    };
  }

  /**
   * Extract JSON from markdown code blocks if present
   */
  private extractJsonFromResponse(text: string): string {
    // Check if the response is wrapped in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    
    // Check for JSON array pattern
    const arrayMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (arrayMatch) {
      return arrayMatch[1].trim();
    }
    
    // If no code blocks found, return the text as-is
    return text.trim();
  }

  /**
   * Health check for Gemini service
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      const response = await this.callGeminiAPI('Test query');
      return response.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
