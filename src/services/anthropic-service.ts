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

    return `EXTRACT REAL NUMERICAL DATA FROM WEB CONTENT

User Request: "${request.userPrompt}"
Target Rows: ${request.numRows}
Content Size: ${request.scrapedContent.length} characters
Detected Domain: ${domain}

CRITICAL: You must extract ACTUAL NUMBERS and VALUES from the content below, not just create column names.

Web Content:
${request.scrapedContent}

MANDATORY DATA EXTRACTION REQUIREMENTS:
1. EXTRACT REAL VALUES: Find actual measurements, numbers, and data points from the content
2. EXTRACT RELEVANT METRICS: Find domain-specific measurements and values from research data
3. EXTRACT QUANTITATIVE DATA: Find numerical values, statistics, and measurements from studies
4. USE DOMAIN RANGES: Apply appropriate ranges and standards mentioned in the content
5. CREATE ${request.numRows} ROWS with REAL NUMERICAL VALUES, not placeholder text
6. FIND ACTUAL RESEARCH DATA: Extract measurements from case studies and research content
7. USE STATISTICAL DATA: Extract means, ranges, and distributions mentioned in content

${domainExamples}

DO NOT CREATE GENERIC COLUMN NAMES - EXTRACT REAL NUMERICAL DATA FROM THE CONTENT!

REAL DATA EXTRACTION REQUIREMENTS:
13. Extract ACTUAL NUMBERS from the content - not placeholder text
14. Find real AFI measurements, gestational ages, weights, and medical values
15. Use ranges mentioned in content to create realistic data points
16. Generate ${request.numRows} rows of REAL DATA VALUES, not just column descriptions
17. Each row must contain actual numerical values and meaningful data

DYNAMIC SCHEMA CREATION EXAMPLES:
Instead of forcing data into predetermined columns, discover what's available:
- If content has rich medical data: Create columns for symptoms, measurements, conditions, treatments, outcomes
- If content has financial data: Create columns for metrics, ratios, trends, comparisons, forecasts
- If content has research data: Create columns for variables, results, correlations, statistical measures
- If content has case studies: Create columns for scenarios, parameters, outcomes, insights
- If content has time-series data: Create columns for dates, values, changes, trends, patterns

COMPREHENSIVE EXTRACTION STRATEGIES:
- Analyze content structure first, then design optimal schema
- Extract from ALL data formats: tables, lists, paragraphs, research sections, statistical data
- Create meaningful relationships between different data points
- Use contextual information to enrich the dataset
- Extract both explicit data and derived insights
- Utilize reference ranges, normal values, and comparative data
- Include metadata and contextual information that adds value

CONTENT-DRIVEN DATA GENERATION:
Your goal is to create the most comprehensive and valuable dataset possible from the available content:

FOR SYNTHETIC DATA REQUESTS:
- Analyze all patterns, ranges, correlations, and relationships in the content
- Use medical/scientific knowledge from the content to generate realistic variations
- Create data points that represent different scenarios, conditions, and cases mentioned
- Utilize statistical distributions, normal ranges, and pathological ranges found in content
- Generate realistic combinations of parameters based on content relationships

FOR REAL DATA EXTRACTION:
- Extract every piece of valuable data from the content
- Don't limit extraction to obvious data - look for derived insights and contextual information
- Include comparative data, reference values, and statistical measures
- Extract data from research findings, case studies, and examples
- Capture relationships and correlations mentioned in the content

SCHEMA OPTIMIZATION:
- Let the content dictate the optimal column structure
- Create columns that maximize the value and comprehensiveness of the dataset
- Include both quantitative and qualitative data that adds insight
- Design schema that captures the full richness of the available content

MANDATORY OUTPUT FORMAT - EXTRACT REAL DATA:
{
  "jsonString": "[{\"column1\": value1, \"column2\": value2, \"column3\": value3}, {\"column1\": value4, \"column2\": value5, \"column3\": value6}, ...]",
  "detectedSchema": [{"name": "column1", "type": "number"}, {"name": "column2", "type": "string"}, {"name": "column3", "type": "number"}],
  "feedback": "Extracted real data from ${domain} content including relevant measurements, statistics, and research findings."
}

CRITICAL REQUIREMENTS:
- JSON keys MUST EXACTLY MATCH schema "name" fields
- Extract REAL NUMBERS and VALUES from the content based on the domain
- Create ${request.numRows} rows with ACTUAL DATA VALUES
- Use domain-appropriate ranges and research data from the content
- Adapt column names and data types to match the content and user request

Important: Only return REAL data found in the content. Quality over quantity - real data is more valuable than hitting exact row count.`;
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
