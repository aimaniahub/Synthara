
'use server';

import { getJson } from 'serpapi';

const serpApiKey = process.env.SERPAPI_API_KEY;

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
    
    try {
        const json = await getJson({
            engine: "google",
            q: query,
            api_key: serpApiKey,
            num: 20, // Request more results for better filtering
            safe: "active", // Enable safe search
        });

        if (json.error) {
            console.error('[SerpApiService] Error from SerpApi:', json.error);
            throw new Error(json.error);
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

        throw new Error(`Failed to search: ${errorMessage}`);
    }
}
