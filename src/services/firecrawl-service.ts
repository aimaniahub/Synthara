
'use server';

import FireCrawl from '@mendable/firecrawl-js';

const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

if (!firecrawlApiKey && process.env.NODE_ENV !== 'test') {
  console.warn(
    'WARNING: FIRECRAWL_API_KEY environment variable is not set. Web scraping functionality will not work. Please set it in your .env.local file.'
  );
}

const client = new FireCrawl({ apiKey: firecrawlApiKey || '' });

interface ScrapeResult {
  markdown?: string;
  error?: string;
  urlScraped?: string;
}

/**
 * Scrapes content from a given URL using Firecrawl with retry logic.
 * @param url The URL to scrape.
 * @returns An object containing the scraped markdown content or an error message.
 */
export async function scrapeContent(url: string): Promise<ScrapeResult> {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await scrapeContentSingle(url, attempt);

    // If successful or non-retryable error, return result
    if (!result.error || !isRetryableError(result.error)) {
      return result;
    }

    // If this was the last attempt, return the error
    if (attempt === maxRetries) {
      return result;
    }

    // Wait before retrying (exponential backoff)
    const delay = 1000 * Math.pow(2, attempt);
    console.log(`[FirecrawlService] Retrying ${url} in ${delay}ms (attempt ${attempt + 2}/${maxRetries + 1})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return { error: "Max retries exceeded", urlScraped: url };
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: string): boolean {
  const retryableErrors = [
    'Bad gateway',
    'Gateway timeout',
    'Service unavailable',
    'Connection timeout',
    'Network error',
    '502',
    '503',
    '504'
  ];

  return retryableErrors.some(retryableError =>
    error.toLowerCase().includes(retryableError.toLowerCase())
  );
}

/**
 * Single attempt to scrape content from a URL
 */
async function scrapeContentSingle(url: string, attempt: number): Promise<ScrapeResult> {
  if (!firecrawlApiKey) {
    return { error: "Firecrawl API key is not configured.", urlScraped: url };
  }
  if (!url || !url.trim()) {
      return { error: "URL to scrape is missing or empty." };
  }

  try {
    console.log(`[FirecrawlService] Attempting to scrape URL: ${url} (attempt ${attempt + 1})`);

    // Add a small delay for retries to avoid overwhelming the server
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Use the correct Firecrawl v1 API format with optimized settings
    const response = await client.scrapeUrl(url, {
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000, // 30 second timeout
        waitFor: 2000,  // Wait 2 seconds for dynamic content
    });

    console.log(`[FirecrawlService] Scrape successful for ${url}`);

    // Handle the SDK response format - check for success first
    if (!response.success) {
      const errorMsg = response?.error || 'Firecrawl API returned success: false';
      console.log(`[FirecrawlService] API returned success: false. Error: ${errorMsg}`);
      return { error: errorMsg, urlScraped: url };
    }

    // The SDK returns a flat structure with markdown directly in the response
    if (response.markdown) {
      const contentLength = response.markdown.length;

      // Basic content quality check
      if (contentLength < 50) {
        return { error: 'Content too short - likely an error page', urlScraped: url };
      }

      // Check for common error indicators
      const lowercaseContent = response.markdown.toLowerCase();
      const errorIndicators = ['404', 'not found', 'access denied', 'forbidden', 'error occurred'];
      const hasErrorIndicator = errorIndicators.some(indicator =>
        lowercaseContent.includes(indicator) && contentLength < 1000
      );

      if (hasErrorIndicator) {
        return { error: 'Content appears to be an error page', urlScraped: url };
      }

      console.log(`[FirecrawlService] Returning quality markdown content: ${contentLength} characters`);
      return { markdown: response.markdown, urlScraped: url };
    } else {
      const errorMsg = response?.error || 'Firecrawl did not return markdown content.';
      console.log(`[FirecrawlService] No markdown content found. Error: ${errorMsg}`);
      return { error: errorMsg, urlScraped: url };
    }
  } catch (error: any) {
    // Enhanced error handling with specific error types
    let errorMessage = 'An unknown error occurred during scraping.';

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Network connection failed - URL may be unreachable';
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      errorMessage = 'Request timed out - website took too long to respond';
    } else if (error.message?.includes('429')) {
      errorMessage = 'Rate limit exceeded - too many requests';
    } else if (error.message?.includes('403')) {
      errorMessage = 'Access forbidden - website blocked the request';
    } else if (error.message?.includes('404')) {
      errorMessage = 'Page not found';
    } else if (error.message?.includes('500') || error.message?.includes('Internal server error')) {
      errorMessage = 'Server error - the website is experiencing issues';
    } else if (error.message?.includes('502') || error.message?.includes('Bad gateway')) {
      errorMessage = 'Bad gateway - server connection issue';
    } else if (error.message?.includes('503') || error.message?.includes('Service unavailable')) {
      errorMessage = 'Service unavailable - server temporarily down';
    } else if (error.message?.includes('504') || error.message?.includes('Gateway timeout')) {
      errorMessage = 'Gateway timeout - server took too long to respond';
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error(`[FirecrawlService] Error scraping URL ${url}:`, errorMessage);
    return { error: errorMessage, urlScraped: url };
  }
}

/**
 * Fallback scraping method when Firecrawl fails
 */
export async function scrapeContentFallback(url: string): Promise<ScrapeResult> {
  try {
    console.log(`[FirecrawlService] Using fallback scraping for: ${url}`);

    // Simple fetch-based scraping as fallback
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}`, urlScraped: url };
    }

    const html = await response.text();

    // Basic HTML to text conversion
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (textContent.length < 100) {
      return { error: 'Insufficient content extracted from fallback scraping', urlScraped: url };
    }

    console.log(`[FirecrawlService] Fallback scraping successful: ${textContent.length} characters`);
    return { markdown: textContent, urlScraped: url };

  } catch (error: any) {
    console.error(`[FirecrawlService] Fallback scraping failed for ${url}:`, error);
    return { error: `Fallback scraping failed: ${error.message}`, urlScraped: url };
  }
}
