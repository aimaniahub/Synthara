'use server';

import { z } from 'zod';
import { geminiService, type GeminiSearchQuery } from '@/services/gemini-service';
import { serpapiService, type SerpAPIResult } from '@/services/serpapi-service';

// Input validation schema
const GenerateSearchUrlsInputSchema = z.object({
  userQuery: z.string().min(1, 'User query is required'),
  maxUrls: z.number().min(1).max(15).default(10),
});

// Output validation schema
const GenerateSearchUrlsOutputSchema = z.object({
  success: z.boolean(),
  urls: z.array(z.object({
    url: z.string(),
    title: z.string(),
    snippet: z.string(),
    relevanceScore: z.number(),
    source: z.string(),
  })),
  searchQueries: z.array(z.object({
    query: z.string(),
    reasoning: z.string(),
    priority: z.number(),
  })),
  error: z.string().optional(),
});

export type GenerateSearchUrlsInput = z.infer<typeof GenerateSearchUrlsInputSchema>;
export type GenerateSearchUrlsOutput = z.infer<typeof GenerateSearchUrlsOutputSchema>;

/**
 * Generate and rank search URLs using AI + SerpAPI
 */
export async function generateSearchUrls(input: GenerateSearchUrlsInput): Promise<GenerateSearchUrlsOutput> {
  console.log(`[GenerateSearchUrls] Starting URL generation for: "${input.userQuery.substring(0, 100)}..."`);
  console.log(`[GenerateSearchUrls] Target URLs: ${input.maxUrls}`);

  try {
    // Validate input
    const validatedInput = GenerateSearchUrlsInputSchema.parse(input);

    // Step 1: Generate search queries using Gemini
    console.log('[GenerateSearchUrls] Step 1: Generating search queries with AI...');
    const searchQueriesResponse = await geminiService.generateSearchQueries(validatedInput.userQuery);
    
    if (!searchQueriesResponse.success) {
      console.warn(`[GenerateSearchUrls] Gemini search query generation failed: ${searchQueriesResponse.error}. Using fallback queries.`);
      
      // Fallback: Generate basic search queries
      const searchQueries = generateFallbackSearchQueries(validatedInput.userQuery);
      console.log(`[GenerateSearchUrls] Using ${searchQueries.length} fallback search queries`);
      
      // Continue with fallback queries
      const searchResponse = await serpapiService.searchMultipleQueries(
        searchQueries.map(q => q.query),
        Math.ceil(validatedInput.maxUrls / searchQueries.length)
      );

      if (!searchResponse.success) {
        console.warn(`[GenerateSearchUrls] SerpAPI search failed: ${searchResponse.error}. Using fallback URLs.`);
        
        // Fallback: Generate default URLs based on the query
        const fallbackUrls = generateFallbackUrls(validatedInput.userQuery, validatedInput.maxUrls);
        console.log(`[GenerateSearchUrls] Using ${fallbackUrls.length} fallback URLs`);
        
        return {
          success: true,
          urls: fallbackUrls,
          searchQueries: searchQueries,
        };
      }

      console.log(`[GenerateSearchUrls] Found ${searchResponse.results.length} URLs from search`);

      // Rank and filter URLs by relevance
      const rankedUrls = await rankUrlsByRelevance(
        searchResponse.results,
        validatedInput.userQuery,
        validatedInput.maxUrls
      );

      console.log(`[GenerateSearchUrls] Selected ${rankedUrls.length} most relevant URLs`);

      return {
        success: true,
        urls: rankedUrls,
        searchQueries: searchQueries,
      };
    }

    const searchQueries = searchQueriesResponse.queries;
    console.log(`[GenerateSearchUrls] Generated ${searchQueries.length} search queries`);

    // Step 2: Search for URLs using SerpAPI
    console.log('[GenerateSearchUrls] Step 2: Searching for URLs with SerpAPI...');
    console.log('[GenerateSearchUrls] Search queries:', searchQueries.map(q => q.query));
    const searchResponse = await serpapiService.searchMultipleQueries(
      searchQueries.map(q => q.query),
      Math.ceil(validatedInput.maxUrls / searchQueries.length)
    );

    console.log('[GenerateSearchUrls] SerpAPI response:', {
      success: searchResponse.success,
      resultsCount: searchResponse.results.length,
      error: searchResponse.error
    });

    if (!searchResponse.success || searchResponse.results.length === 0) {
      console.warn(`[GenerateSearchUrls] SerpAPI search failed: ${searchResponse.error}. Trying simplified fallback queries.`);
      
      // Try ultra-simple queries first
      const simpleQueries = generateSimpleQueries(validatedInput.userQuery);
      console.log('[GenerateSearchUrls] Trying simplified fallback queries...');
      const simpleSearch = await serpapiService.searchMultipleQueries(
        simpleQueries,
        Math.ceil(validatedInput.maxUrls / simpleQueries.length)
      );
      
      if (simpleSearch.success && simpleSearch.results.length > 0) {
        console.log(`[GenerateSearchUrls] Found ${simpleSearch.results.length} results with simple queries`);
        
        // Rank and filter simple query results
        const rankedUrls = await rankUrlsByRelevance(
          simpleSearch.results,
          validatedInput.userQuery,
          validatedInput.maxUrls
        );
        
        return {
          success: true,
          urls: rankedUrls,
          searchQueries: searchQueries,
        };
      }
      
      // Final fallback: Generate default URLs based on the query
      const fallbackUrls = generateFallbackUrls(validatedInput.userQuery, validatedInput.maxUrls);
      console.log(`[GenerateSearchUrls] Using ${fallbackUrls.length} fallback URLs`);
      
      return {
        success: true,
        urls: fallbackUrls,
        searchQueries: searchQueries,
      };
    }

    console.log(`[GenerateSearchUrls] Found ${searchResponse.results.length} URLs from search`);

    // Step 3: Rank and filter URLs by relevance
    console.log('[GenerateSearchUrls] Step 3: Ranking URLs by relevance...');
    const rankedUrls = await rankUrlsByRelevance(
      searchResponse.results,
      validatedInput.userQuery,
      validatedInput.maxUrls
    );

    console.log(`[GenerateSearchUrls] Selected ${rankedUrls.length} most relevant URLs`);

    return {
      success: true,
      urls: rankedUrls,
      searchQueries: searchQueries,
    };

  } catch (error: any) {
    console.error('[GenerateSearchUrls] Error:', error);
    return {
      success: false,
      urls: [],
      searchQueries: [],
      error: error.message,
    };
  }
}

/**
 * Rank URLs by relevance to the user query
 */
async function rankUrlsByRelevance(
  searchResults: SerpAPIResult[],
  userQuery: string,
  maxUrls: number
): Promise<Array<{
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  source: string;
}>> {
  try {
    // Simple relevance scoring based on title and snippet matching
    const scoredUrls = searchResults.map(result => {
      const titleScore = calculateRelevanceScore(result.title, userQuery);
      const snippetScore = calculateRelevanceScore(result.snippet, userQuery);
      const combinedScore = (titleScore * 0.7) + (snippetScore * 0.3);
      
      return {
        url: result.link,
        title: result.title,
        snippet: result.snippet,
        relevanceScore: combinedScore,
        source: result.source,
      };
    });

    // Sort by relevance score (highest first) and take top N
    return scoredUrls
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxUrls);

  } catch (error) {
    console.error('[GenerateSearchUrls] Ranking error:', error);
    // Fallback: return first N results without scoring
    return searchResults.slice(0, maxUrls).map(result => ({
      url: result.link,
      title: result.title,
      snippet: result.snippet,
      relevanceScore: 0.5, // Default score
      source: result.source,
    }));
  }
}

/**
 * Calculate relevance score between text and query
 */
function calculateRelevanceScore(text: string, query: string): number {
  if (!text || !query) return 0;

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Split query into words
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  if (queryWords.length === 0) return 0;

  // Count word matches
  let matches = 0;
  for (const word of queryWords) {
    if (textLower.includes(word)) {
      matches++;
    }
  }

  // Calculate score as percentage of words matched
  const score = matches / queryWords.length;
  
  // Boost score for exact phrase matches
  if (textLower.includes(queryLower)) {
    return Math.min(1.0, score + 0.3);
  }

  return score;
}

/**
 * Generate ultra-simple search queries for fallback
 */
function generateSimpleQueries(userQuery: string): string[] {
  const queryLower = userQuery.toLowerCase();
  
  // Extract key entities
  const words = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  // Generate simple variations
  const simpleQueries = [
    userQuery, // Original query
    words.join(' '), // Clean version
  ];
  
  // Add location-specific variations if location is detected
  const locations = ['bengaluru', 'bangalore', 'mumbai', 'delhi', 'chennai', 'hyderabad', 'pune', 'kolkata'];
  const hasLocation = locations.some(loc => queryLower.includes(loc));
  
  if (hasLocation) {
    // Add list/directory variations
    simpleQueries.push(`${words.join(' ')} list`);
    simpleQueries.push(`${words.join(' ')} directory`);
  } else {
    // Add general variations
    simpleQueries.push(`${words.join(' ')} 2025`);
    simpleQueries.push(`${words.join(' ')} latest`);
  }
  
  return [...new Set(simpleQueries)]; // Remove duplicates
}

/**
 * Generate fallback search queries when Gemini fails
 */
function generateFallbackSearchQueries(userQuery: string): Array<{
  query: string;
  reasoning: string;
  priority: number;
}> {
  const queryLower = userQuery.toLowerCase();
  
  if (queryLower.includes('ev') || queryLower.includes('charging') || queryLower.includes('electric vehicle')) {
    return [
      {
        query: `"electric vehicle charging stations" ${queryLower.includes('bengaluru') ? 'Bengaluru Karnataka' : 'India'}`,
        reasoning: 'Targets EV charging stations with location specificity',
        priority: 1
      },
      {
        query: `ev charging infrastructure ${queryLower.includes('bengaluru') ? 'Bengaluru' : 'India'} site:gov.in`,
        reasoning: 'Searches government websites for official EV infrastructure data',
        priority: 2
      },
      {
        query: `"charging stations" ${queryLower.includes('bengaluru') ? 'Bengaluru' : 'India'} map`,
        reasoning: 'Looks for mapping services and directories with charging station locations',
        priority: 3
      }
    ];
  }
  
  if (queryLower.includes('restaurant') || queryLower.includes('food')) {
    return [
      {
        query: `"best restaurants" ${queryLower.includes('bengaluru') ? 'Bengaluru' : 'India'} ratings`,
        reasoning: 'Targets restaurant reviews and ratings',
        priority: 1
      },
      {
        query: `"top restaurants" ${queryLower.includes('bengaluru') ? 'Bengaluru' : 'India'} reviews`,
        reasoning: 'Searches for curated restaurant lists and reviews',
        priority: 2
      }
    ];
  }
  
  // Generic fallback
  return [
    {
      query: userQuery,
      reasoning: 'Direct search using the original query',
      priority: 1
    },
    {
      query: `${userQuery} site:gov.in`,
      reasoning: 'Searches government websites for authoritative information',
      priority: 2
    }
  ];
}

/**
 * Generate fallback URLs when SerpAPI is not available
 */
function generateFallbackUrls(userQuery: string, maxUrls: number): Array<{
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  source: string;
}> {
  const queryLower = userQuery.toLowerCase();
  const urls: Array<{
    url: string;
    title: string;
    snippet: string;
    relevanceScore: number;
    source: string;
  }> = [];

  // Generate URLs based on query content
  if (queryLower.includes('restaurant') || queryLower.includes('food') || queryLower.includes('dining')) {
    urls.push({
      url: 'https://www.yelp.com/search?find_desc=restaurants',
      title: 'Yelp Restaurants',
      snippet: 'Find restaurants, reviews, and ratings',
      relevanceScore: 0.9,
      source: 'yelp.com'
    });
    urls.push({
      url: 'https://www.tripadvisor.com/Restaurants',
      title: 'TripAdvisor Restaurants',
      snippet: 'Restaurant reviews and ratings',
      relevanceScore: 0.8,
      source: 'tripadvisor.com'
    });
  }

  if (queryLower.includes('charging') || queryLower.includes('ev') || queryLower.includes('electric vehicle')) {
    urls.push({
      url: 'https://www.plugshare.com/',
      title: 'PlugShare EV Charging',
      snippet: 'Find electric vehicle charging stations',
      relevanceScore: 0.9,
      source: 'plugshare.com'
    });
    urls.push({
      url: 'https://www.evgo.com/',
      title: 'EVgo Charging Network',
      snippet: 'Electric vehicle charging stations',
      relevanceScore: 0.8,
      source: 'evgo.com'
    });
  }

  if (queryLower.includes('hotel') || queryLower.includes('accommodation') || queryLower.includes('stay')) {
    urls.push({
      url: 'https://www.booking.com/',
      title: 'Booking.com Hotels',
      snippet: 'Hotel bookings and reviews',
      relevanceScore: 0.9,
      source: 'booking.com'
    });
    urls.push({
      url: 'https://www.hotels.com/',
      title: 'Hotels.com',
      snippet: 'Hotel reservations and deals',
      relevanceScore: 0.8,
      source: 'hotels.com'
    });
  }

  // Add generic search URLs if we don't have enough
  if (urls.length < maxUrls) {
    urls.push({
      url: 'https://www.google.com/search?q=' + encodeURIComponent(userQuery),
      title: 'Google Search Results',
      snippet: `Search results for: ${userQuery}`,
      relevanceScore: 0.7,
      source: 'google.com'
    });
  }

  // Add Wikipedia for general information
  if (urls.length < maxUrls) {
    urls.push({
      url: 'https://en.wikipedia.org/wiki/Main_Page',
      title: 'Wikipedia',
      snippet: 'Free encyclopedia with comprehensive information',
      relevanceScore: 0.6,
      source: 'wikipedia.org'
    });
  }

  return urls.slice(0, maxUrls);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateSearchUrls instead
 */
export async function generateSearchUrlsFlow(input: GenerateSearchUrlsInput): Promise<GenerateSearchUrlsOutput> {
  console.warn('[GenerateSearchUrls] generateSearchUrlsFlow is deprecated, use generateSearchUrls instead');
  return generateSearchUrls(input);
}
