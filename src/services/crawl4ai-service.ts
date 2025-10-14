/**
 * Crawl4AI Service
 * TypeScript service to communicate with the Crawl4AI Python microservice
 */

export interface Crawl4AIRequest {
  urls: string[];
  prompt: string;
  numRows: number;
  useAI?: boolean;
  aiModel?: string;
  aiApiKey?: string;
}

export interface Crawl4AIResponse {
  success: boolean;
  data: Array<Record<string, any>>;
  csv: string;
  tablesFound: number;
  feedback: string;
  error?: string;
}

export class Crawl4AIService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Use Vercel API endpoint in production, fallback to localhost for development
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined') {
      // Client-side: use relative path to Vercel API
      this.baseUrl = '/api/crawl4ai';
    } else {
      // Server-side: use environment variable or default to local API
      this.baseUrl = process.env.CRAWL4AI_SERVICE_URL || '/api/crawl4ai';
    }
  }

  /**
   * Extract structured data from URLs using Crawl4AI
   */
  async extractData(request: Crawl4AIRequest): Promise<Crawl4AIResponse> {
    try {
      console.log(`[Crawl4AI] Extracting data from ${request.urls.length} URLs`);
      console.log(`[Crawl4AI] Prompt: ${request.prompt.substring(0, 100)}...`);
      console.log(`[Crawl4AI] Target rows: ${request.numRows}`);

      const response = await fetch(`${this.baseUrl}/extract-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: request.urls,
          prompt: request.prompt,
          num_rows: request.numRows,
          use_ai: request.useAI || false,
          ai_model: request.aiModel || 'openai/gpt-4o-mini',
          ai_api_key: request.aiApiKey
        }),
      });

      if (!response.ok) {
        throw new Error(`Crawl4AI service error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`[Crawl4AI] Extraction completed:`, {
        success: result.success,
        dataLength: result.data?.length || 0,
        tablesFound: result.tables_found || 0,
        csvLength: result.csv?.length || 0
      });

      return {
        success: result.success,
        data: result.data || [],
        csv: result.csv || '',
        tablesFound: result.tables_found || 0,
        feedback: result.feedback || '',
        error: result.error
      };

    } catch (error: any) {
      console.error('[Crawl4AI] Error:', error);
      return {
        success: false,
        data: [],
        csv: '',
        tablesFound: 0,
        feedback: '',
        error: error.message
      };
    }
  }

  /**
   * Health check for the Crawl4AI service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('[Crawl4AI] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get URLs from a search query (optional - can be removed if not needed)
   */
  async searchUrls(query: string, maxUrls: number = 5): Promise<string[]> {
    // This is a placeholder - you can implement search here if needed
    // For now, return empty array to indicate no search functionality
    console.log(`[Crawl4AI] Search not implemented, query: ${query}`);
    return [];
  }
}

// Export singleton instance
export const crawl4aiService = new Crawl4AIService();
