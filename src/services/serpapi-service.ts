
'use server';

import { getJson } from 'serpapi';

const serpApiKey = process.env.SERPAPI_API_KEY;

// Request deduplication and rate limiting
const requestCache = new Map<string, Promise<SearchResult[]>>();
const lastRequestTime = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between identical requests

export interface SearchResult {
    position: number;
    title: string;
    link: string;
    snippet: string;
}

/**
 * Gets Google search results for a given query using SerpApi.
 * @param query The search query.
 * @returns An array of organic search results.
 */
export async function getGoogleSearchResults(query: string): Promise<SearchResult[]> {
    if (!serpApiKey) {
        console.error('[SerpApiService] SERPAPI_API_KEY is not set.');
        throw new Error('SerpApi API key is not configured on the server.');
    }

    if (!query || !query.trim()) {
        throw new Error("Search query is missing or empty.");
    }

    const normalizedQuery = query.trim().toLowerCase();
    const now = Date.now();

    // Check if we have a recent request for the same query
    const lastTime = lastRequestTime.get(normalizedQuery);
    if (lastTime && (now - lastTime) < MIN_REQUEST_INTERVAL) {
        console.log(`[SerpApiService] Rate limiting: Request for "${query}" too soon after previous request`);
        throw new Error(`Please wait ${Math.ceil((MIN_REQUEST_INTERVAL - (now - lastTime)) / 1000)} seconds before searching again.`);
    }

    // Check if there's already a pending request for this query
    const existingRequest = requestCache.get(normalizedQuery);
    if (existingRequest) {
        console.log(`[SerpApiService] Returning cached/pending request for: "${query}"`);
        return existingRequest;
    }

    // Create new request
    const requestPromise = performSearch(query, normalizedQuery, now);
    requestCache.set(normalizedQuery, requestPromise);

    // Clean up cache after request completes
    requestPromise.finally(() => {
        requestCache.delete(normalizedQuery);
    });

    return requestPromise;
}

async function performSearch(originalQuery: string, normalizedQuery: string, requestTime: number): Promise<SearchResult[]> {
    // Record the request time
    lastRequestTime.set(normalizedQuery, requestTime);

    console.log(`[SerpApiService] 🔍 Making SerpAPI request for: "${originalQuery}"`);

    try {
        const json = await getJson({
            engine: "google",
            q: originalQuery,
            api_key: serpApiKey,
            num: 20, // Request more results for better filtering
            safe: "active", // Enable safe search
        });

        console.log(`[SerpApiService] ✅ SerpAPI response received for: "${originalQuery}"`);

        if (json.error) {
            console.error('[SerpApiService] ❌ Error from SerpApi:', json.error);

            // Handle specific error cases
            if (json.error.includes("run out of searches") || json.error.includes("account has run out")) {
                throw new Error(`SerpAPI quota exceeded. Please check your account at https://serpapi.com/dashboard - you may have hit rate limits or used all searches.`);
            }

            if (json.error.includes("Google hasn't returned any results")) {
                throw new Error(`No search results found for "${originalQuery}". Try using broader or different search terms.`);
            }

            throw new Error(`Search API error: ${json.error}`);
        }

        if (json.organic_results) {
            // Filter and validate results more thoroughly
            const validResults = json.organic_results
                .filter((result: any) => {
                    // Must have a valid link
                    if (!result.link || typeof result.link !== 'string') return false;

                    // Must have a title
                    if (!result.title || typeof result.title !== 'string') return false;

                    // Filter out common low-quality domains
                    const url = result.link.toLowerCase();
                    const lowQualityDomains = [
                        'pinterest.com',
                        'instagram.com',
                        'facebook.com',
                        'twitter.com',
                        'tiktok.com',
                        'youtube.com/shorts'
                    ];

                    if (lowQualityDomains.some(domain => url.includes(domain))) {
                        return false;
                    }

                    // Filter out PDF files and other non-HTML content
                    if (url.includes('.pdf') || url.includes('.doc') || url.includes('.xls')) {
                        return false;
                    }

                    return true;
                })
                .slice(0, 15) // Limit to top 15 results
                .map((result: any) => ({
                    position: result.position,
                    title: result.title.trim(),
                    link: result.link,
                    snippet: result.snippet || '',
                }));

            console.log(`[SerpApiService] Filtered ${validResults.length} quality results from ${json.organic_results.length} total results`);
            return validResults;
        }

        return []; // Return empty array if no results
    } catch (error) {
        console.error('[SerpApiService] Error calling SerpApi:', error);

        // Enhanced error handling
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            if (error.message.includes('429')) {
                errorMessage = 'Rate limit exceeded - too many search requests';
            } else if (error.message.includes('401')) {
                errorMessage = 'Invalid API key or authentication failed';
            } else if (error.message.includes('403')) {
                errorMessage = 'Access forbidden - check API permissions';
            } else {
                errorMessage = error.message;
            }
        }

        // If SerpAPI fails, try to provide a fallback
        if (errorMessage.includes('run out of searches') || errorMessage.includes('quota exceeded')) {
            console.log(`[SerpApiService] 🔄 SerpAPI quota exceeded, providing fallback search suggestions`);
            return getFallbackSearchResults(originalQuery);
        }

        throw new Error(`Failed to search: ${errorMessage}`);
    }
}

/**
 * Fallback search results when SerpAPI is unavailable
 */
function getFallbackSearchResults(query: string): SearchResult[] {
    console.log(`[SerpApiService] 📋 Generating fallback results for: "${query}"`);

    // Generate some basic search suggestions based on the query
    const fallbackResults: SearchResult[] = [
        {
            position: 1,
            title: `${query} - Official Information`,
            link: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            snippet: `Search results for "${query}". This is a fallback result due to search API limitations. Please try a more specific search query.`
        },
        {
            position: 2,
            title: `${query} - Latest Updates`,
            link: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
            snippet: `Find the latest information about "${query}". Consider using more specific keywords for better results.`
        },
        {
            position: 3,
            title: `${query} - Research and Data`,
            link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: `Research and data related to "${query}". This fallback suggests using alternative search engines or refining your query.`
        }
    ];

    return fallbackResults;
}
