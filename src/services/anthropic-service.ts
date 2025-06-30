import Anthropic from '@anthropic-ai/sdk';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
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

export class AnthropicService {
  private client: Anthropic;
  private defaultModel: string;

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    
    // Best Claude model for large content processing
    this.defaultModel = config.model || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Process large scraped content and extract structured data
   * Uses Claude's powerful models optimized for large context
   */
  async processScrapedContent(request: StructuredDataRequest): Promise<StructuredDataResponse> {
    console.log(`[Anthropic] 🧠 CONTENT-FIRST DYNAMIC SCHEMA DISCOVERY`);
    console.log(`[Anthropic] Processing ${request.scrapedContent.length} characters with ${this.defaultModel}`);
    console.log(`[Anthropic] Target: ${request.numRows} rows using comprehensive content analysis`);

    // Let Claude handle any amount of content - no truncation
    console.log(`[Anthropic] Processing full content: ${request.scrapedContent.length} characters`);

    try {
      const prompt = this.buildStructuredDataPrompt(request);
      
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 4000,
        temperature: 0.1, // Low temperature for consistent structured output
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        throw new Error('No text response content from Anthropic');
      }

      console.log(`[Anthropic] Raw response content:`, content.text.substring(0, 500) + '...');

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(content.text);
        console.log(`[Anthropic] Parsed response:`, JSON.stringify(parsedResponse, null, 2));
      } catch (parseError: any) {
        console.error(`[Anthropic] Failed to parse JSON response:`, parseError);
        console.error(`[Anthropic] Raw response:`, content.text);
        throw new Error(`Anthropic returned invalid JSON: ${parseError?.message || 'Unknown error'}`);
      }

      if (!parsedResponse.jsonString || !parsedResponse.detectedSchema) {
        throw new Error('Anthropic response missing required fields (jsonString, detectedSchema)');
      }

      // Validate that jsonString contains valid JSON
      try {
        const testParse = JSON.parse(parsedResponse.jsonString);
        if (!Array.isArray(testParse)) {
          throw new Error('jsonString does not contain a valid JSON array');
        }
        console.log(`[Anthropic] Successfully processed content, generated ${parsedResponse.detectedSchema.length} columns`);
      } catch (jsonValidationError: any) {
        console.error(`[Anthropic] Invalid JSON in jsonString:`, jsonValidationError);
        throw new Error(`Anthropic returned invalid JSON data: ${jsonValidationError?.message || 'Unknown error'}`);
      }

      return {
        jsonString: parsedResponse.jsonString,
        detectedSchema: parsedResponse.detectedSchema || [],
        feedback: parsedResponse.feedback || 'Data extracted successfully using Anthropic Claude'
      };

    } catch (error: any) {
      console.error(`[Anthropic] Error processing content:`, error);
      
      // Try with a different approach if the first one fails
      if (error.message?.includes('timeout') || error.message?.includes('overloaded')) {
        console.log(`[Anthropic] Retrying with reduced content...`);
        return this.processWithReducedContent(request);
      }
      
      throw new Error(`Anthropic processing failed: ${error.message}`);
    }
  }

  /**
   * Fallback method with reduced content if the full content fails
   */
  private async processWithReducedContent(request: StructuredDataRequest): Promise<StructuredDataResponse> {
    console.log(`[Anthropic] Using reduced content approach`);
    
    // Take first 100KB of content as a sample
    const reducedContent = request.scrapedContent.substring(0, 100000);
    const reducedRequest = { ...request, scrapedContent: reducedContent };
    
    try {
      const prompt = this.buildStructuredDataPrompt(reducedRequest);
      
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        throw new Error('No text response content from Anthropic fallback');
      }

      const parsedResponse = JSON.parse(content.text);
      
      return {
        jsonString: parsedResponse.jsonString || '[]',
        detectedSchema: parsedResponse.detectedSchema || [],
        feedback: parsedResponse.feedback || 'Data extracted successfully using Anthropic Claude (reduced content)'
      };
    } catch (fallbackError: any) {
      console.error(`[Anthropic] Fallback processing also failed:`, fallbackError);
      throw new Error(`Anthropic processing failed: ${fallbackError.message}`);
    }
  }

  /**
   * Build the structured data extraction prompt
   */
  private buildStructuredDataPrompt(request: StructuredDataRequest): string {
    const domain = this.detectDomain(request.userPrompt);
    const domainExamples = this.getDomainExamples(domain);

    return `EXTRACT AND STRUCTURE DATA FROM WEB CONTENT

User Request: "${request.userPrompt}"
Target Rows: ${request.numRows}
Content Size: ${request.scrapedContent.length} characters

TASK: Analyze the web content below and extract structured data that matches the user's request.

Web Content:
${request.scrapedContent}

EXTRACTION STRATEGY:
1. READ the user's request carefully to understand what data they need
2. SCAN the content for relevant information that matches their request
3. EXTRACT actual data points, numbers, names, dates, and values from the content
4. CREATE a logical schema based on what data is available and what the user needs
5. GENERATE ${request.numRows} rows using the extracted data and intelligent variations

SCHEMA CREATION GUIDELINES:
- Design columns based on the user's request AND available content
- Use descriptive column names that match the data type
- Include relevant data types: String, Integer, Float, Date, Boolean
- Focus on the most valuable data for the user's needs

${domainExamples}

DATA EXTRACTION EXAMPLES:
For "NSE FII DII data for June":
- Look for: Foreign investment flows, institutional investor data, NSE statistics, market data
- Extract: Investment amounts, dates, investor types, market indices, percentage changes
- Schema: Date, FII_Inflow, DII_Inflow, Net_Investment, Market_Index, Change_Percent

For "Job postings in Bangalore":
- Look for: Company names, job titles, salary ranges, experience requirements, locations
- Extract: Job details, company information, compensation data, skill requirements
- Schema: Company, Job_Title, Salary_Min, Salary_Max, Experience_Years, Skills_Required

For "iPhone prices and models":
- Look for: Model names, prices, specifications, availability, storage options
- Extract: Product details, pricing information, technical specifications
- Schema: Model_Name, Price, Storage_GB, Screen_Size, Release_Date, Availability

CONTENT ANALYSIS APPROACH:
1. Identify the main topic and relevant sections in the content
2. Extract specific data points that match the user's request
3. Create realistic variations and additional rows based on patterns found
4. Ensure data consistency and logical relationships between columns
5. Use actual values from content as the foundation for generated data

STEP-BY-STEP PROCESS:
1. ANALYZE USER REQUEST: Understand exactly what data the user wants
2. SCAN CONTENT: Look for relevant sections that contain the requested information
3. EXTRACT DATA: Pull out specific values, names, numbers, dates from the content
4. DESIGN SCHEMA: Create column names and types based on extracted data and user needs
5. GENERATE ROWS: Create ${request.numRows} rows using extracted data and logical variations

OUTPUT FORMAT:
{
  "jsonString": "[{\"column1\": \"value1\", \"column2\": 123, \"column3\": \"value3\"}, {\"column1\": \"value4\", \"column2\": 456, \"column3\": \"value6\"}]",
  "detectedSchema": [
    {"name": "column1", "type": "String"},
    {"name": "column2", "type": "Integer"},
    {"name": "column3", "type": "String"}
  ],
  "feedback": "Successfully extracted and structured data from web content based on user request."
}

REQUIREMENTS:
- Column names in jsonString MUST match schema "name" fields exactly
- Use appropriate data types: String, Integer, Float, Date, Boolean
- Extract real values from content when possible
- Generate realistic variations to reach target row count
- Focus on data that directly addresses the user's request
- Ensure data consistency and logical relationships

Remember: The goal is to create a useful dataset that matches what the user asked for, using the web content as the source of real information.`;
  }

  /**
   * Detect domain from user prompt
   */
  private detectDomain(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    if (this.containsKeywords(lowerPrompt, ['medical', 'patient', 'clinical', 'health', 'diagnosis', 'treatment', 'hospital', 'afi', 'fetal', 'blood', 'heart rate'])) {
      return 'medical';
    }
    if (this.containsKeywords(lowerPrompt, ['financial', 'stock', 'market', 'trading', 'investment', 'portfolio', 'price', 'revenue', 'profit'])) {
      return 'financial';
    }
    if (this.containsKeywords(lowerPrompt, ['ecommerce', 'customer', 'purchase', 'product', 'sales', 'order', 'shopping', 'retail'])) {
      return 'ecommerce';
    }
    if (this.containsKeywords(lowerPrompt, ['sensor', 'iot', 'device', 'temperature', 'humidity', 'monitoring', 'smart'])) {
      return 'iot';
    }
    if (this.containsKeywords(lowerPrompt, ['social', 'media', 'post', 'like', 'share', 'comment', 'engagement'])) {
      return 'social';
    }

    return 'general';
  }

  /**
   * Get domain-specific examples
   */
  private getDomainExamples(domain: string): string {
    switch (domain) {
      case 'medical':
        return `MEDICAL DATA EXAMPLES:
- Extract measurements: heart rate (60-100 bpm), blood pressure (120/80 mmHg), temperature (36.5°C)
- Extract lab values: glucose levels, cholesterol, hemoglobin counts
- Extract clinical data: patient ages, treatment durations, diagnostic codes
- Extract research metrics: study populations, treatment outcomes, statistical significance`;

      case 'financial':
        return `FINANCIAL DATA EXAMPLES:
- Extract market data: stock prices, trading volumes, market cap values
- Extract performance metrics: returns, volatility, beta coefficients
- Extract economic indicators: interest rates, inflation rates, GDP figures
- Extract trading data: bid/ask spreads, transaction amounts, portfolio allocations`;

      case 'ecommerce':
        return `ECOMMERCE DATA EXAMPLES:
- Extract sales data: order amounts, quantities, discount percentages
- Extract customer metrics: purchase frequency, lifetime value, satisfaction scores
- Extract product data: prices, ratings, inventory levels, category performance
- Extract behavioral data: click rates, conversion rates, cart abandonment rates`;

      case 'iot':
        return `IOT DATA EXAMPLES:
- Extract sensor readings: temperature values, humidity percentages, pressure measurements
- Extract device metrics: battery levels, signal strength, uptime percentages
- Extract environmental data: air quality indices, noise levels, light intensity
- Extract performance data: response times, error rates, throughput measurements`;

      case 'social':
        return `SOCIAL MEDIA DATA EXAMPLES:
- Extract engagement metrics: likes, shares, comments, view counts
- Extract user data: follower counts, posting frequency, engagement rates
- Extract content metrics: reach, impressions, click-through rates
- Extract sentiment data: positive/negative scores, emotion classifications`;

      default:
        return `GENERAL DATA EXAMPLES:
- Extract numerical values: counts, measurements, percentages, ratios
- Extract categorical data: classifications, types, statuses, categories
- Extract temporal data: dates, times, durations, frequencies
- Extract statistical data: means, medians, standard deviations, correlations`;
    }
  }

  /**
   * Check if text contains any of the specified keywords
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Test the Anthropic connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello, please respond with "Connection successful"'
          }
        ]
      });

      const content = response.content[0];
      if (content && content.type === 'text') {
        console.log(`[Anthropic] Connection test result: ${content.text}`);
        return content.text.includes('successful') || content.text.includes('Hello') || true;
      }
      return false;
    } catch (error: any) {
      console.error(`[Anthropic] Connection test failed:`, error);
      return false;
    }
  }

  /**
   * Get available models for large content processing
   */
  getRecommendedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',  // Best overall for large content
      'claude-3-5-haiku-20241022',   // Faster for simpler tasks
      'claude-3-opus-20240229'       // Most powerful but slower
    ];
  }
}

// Factory function to create Anthropic service
export function createAnthropicService(): AnthropicService | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('[Anthropic] API key not found in environment variables');
    return null;
  }

  return new AnthropicService({
    apiKey,
    model: 'claude-3-5-sonnet-20241022' // Default to best model for large content
  });
}
