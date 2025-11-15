/**
 * SerpAPI Service
 * Service for searching URLs using SerpAPI
 */

export interface SerpAPIResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  source: string;
}

export interface SerpAPISearchResponse {
  success: boolean;
  results: SerpAPIResult[];
  totalResults: number;
  error?: string;
}

export class SerpAPIService {
  private apiKey: string;
  private baseUrl: string = 'https://serpapi.com/search';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('[SerpAPI] No API key provided. SerpAPI functionality will be limited.');
    }
  }

  /**
   * Search for URLs using SerpAPI
   */
  async searchUrls(query: string, maxResults: number = 10): Promise<SerpAPISearchResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          results: [],
          totalResults: 0,
          error: 'SerpAPI key not configured'
        };
      }

      console.log(`[SerpAPI] Searching for: "${query}" (max ${maxResults} results)`);

      // Detect geography preference from query (prefer India for NSE/BSE/India mentions)
      const qLower = (query || '').toLowerCase();
      const preferIN = /(\b|\s)(nse|bse|india|nifty|banknifty|mumbai|delhi|bengaluru|bangalore|chennai|hyderabad|pune|kolkata)(\b|\s)/i.test(qLower);
      const glParam = preferIN ? 'in' : (process.env.SERPAPI_GL || 'us');

      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        engine: 'google',
        num: Math.min(maxResults, 15).toString(), // Increase from 10 to 15
        safe: 'active',
        gl: glParam, // Country
        hl: 'en' // Language
        // Removed tbm: 'nws' to get all organic results, not just news
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Handle SerpAPI error responses
      if (data.error) {
        console.error('[SerpAPI] API Error:', data.error);
        return {
          success: false,
          results: [],
          totalResults: 0,
          error: data.error
        };
      }

      // Extract organic results
      const organicResults = data.organic_results || [];
      const results: SerpAPIResult[] = organicResults.map((result: any, index: number) => ({
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
        position: result.position || index + 1,
        source: this.extractDomain(result.link || '')
      }));

      console.log(`[SerpAPI] Found ${results.length} results for query: "${query}"`);

      return {
        success: true,
        results,
        totalResults: results.length
      };

    } catch (error: any) {
      console.error('[SerpAPI] Search error:', error);
      return {
        success: false,
        results: [],
        totalResults: 0,
        error: error.message
      };
    }
  }

  /**
   * Search for multiple queries and combine results
   */
  async searchMultipleQueries(queries: string[], maxResultsPerQuery: number = 5): Promise<SerpAPISearchResponse> {
    try {
      console.log(`[SerpAPI] Searching multiple queries: ${queries.length} queries`);

      const allResults: SerpAPIResult[] = [];
      const errors: string[] = [];

      // Search each query
      for (const query of queries) {
        const response = await this.searchUrls(query, maxResultsPerQuery);
        
        if (response.success) {
          allResults.push(...response.results);
        } else {
          errors.push(`Query "${query}": ${response.error || 'Unknown error'}`);
        }

        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Remove duplicates based on URL
      const uniqueResults = this.removeDuplicateUrls(allResults);

      console.log(`[SerpAPI] Combined results: ${uniqueResults.length} unique URLs from ${queries.length} queries`);

      return {
        success: uniqueResults.length > 0,
        results: uniqueResults,
        totalResults: uniqueResults.length,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };

    } catch (error: any) {
      console.error('[SerpAPI] Multiple queries error:', error);
      return {
        success: false,
        results: [],
        totalResults: 0,
        error: error.message
      };
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Remove duplicate URLs from results
   */
  private removeDuplicateUrls(results: SerpAPIResult[]): SerpAPIResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.link)) {
        return false;
      }
      seen.add(result.link);
      return true;
    });
  }

  /**
   * Health check for SerpAPI service
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      const response = await this.searchUrls('test query', 1);
      return response.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const serpapiService = new SerpAPIService();
