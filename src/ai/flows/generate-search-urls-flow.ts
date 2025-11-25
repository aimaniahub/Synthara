'use server';

import { z } from 'zod';
import { SimpleAI } from '@/ai/simple-ai';
import { serpapiService, type SerpAPIResult } from '@/services/serpapi-service';

// Input validation schema
const GenerateSearchUrlsInputSchema = z.object({
  userQuery: z.string().min(1, 'User query is required'),
  maxUrls: z.number().min(1).max(80).default(15),
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

type AISearchQuery = {
  query: string;
  reasoning: string;
  priority: number;
};

// Simple in-memory cache for search results to avoid duplicate API calls
const searchCache = new Map<string, { urls: any[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
}

/**
 * Deduplicate search queries by normalizing and comparing them
 */
function deduplicateQueries(queries: AISearchQuery[]): AISearchQuery[] {
  const seen = new Set<string>();
  const deduplicated: AISearchQuery[] = [];

  for (const query of queries) {
    // Normalize query: lowercase, trim, remove extra spaces
    const normalized = query.query.toLowerCase().trim().replace(/\s+/g, ' ');

    // Skip if we've seen this exact query before
    if (seen.has(normalized)) {
      console.log(`[GenerateSearchUrls] Skipping duplicate query: "${query.query}"`);
      continue;
    }

    // Skip if this query is too similar to existing ones (substring match)
    let isSimilar = false;
    for (const existing of seen) {
      if (normalized.includes(existing) || existing.includes(normalized)) {
        console.log(`[GenerateSearchUrls] Skipping similar query: "${query.query}" (similar to existing)`);
        isSimilar = true;
        break;
      }
    }

    if (!isSimilar) {
      seen.add(normalized);
      deduplicated.push(query);
    }
  }

  console.log(`[GenerateSearchUrls] Deduplicated ${queries.length} queries to ${deduplicated.length} unique queries`);
  return deduplicated;
}

/**
 * Generate and rank search URLs using AI + SerpAPI
 */
export async function generateSearchUrls(input: GenerateSearchUrlsInput): Promise<GenerateSearchUrlsOutput> {
  console.log(`[GenerateSearchUrls] Starting URL generation for: "${input.userQuery.substring(0, 100)}..."`);
  console.log(`[GenerateSearchUrls] Target URLs: ${input.maxUrls}`);

  try {
    // Clean up expired cache entries
    cleanupCache();

    // Validate input
    const validatedInput = GenerateSearchUrlsInputSchema.parse(input);
    // Over-fetch to survive filtering and scraping failures (allow larger expansions)
    const overfetchLimit = Math.min(validatedInput.maxUrls * 4, 80);

    // Check cache first
    const cacheKey = validatedInput.userQuery.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`[GenerateSearchUrls] Using cached results for: "${validatedInput.userQuery}"`);
      return {
        success: true,
        urls: cached.urls.slice(0, validatedInput.maxUrls),
        searchQueries: [{ query: validatedInput.userQuery, reasoning: 'Cached result', priority: 1 }],
      };
    }

    // Step 1: Generate search queries using OpenRouter (SimpleAI)
    console.log('[GenerateSearchUrls] Step 1: Generating search queries with AI (OpenRouter)...');

    let searchQueries: AISearchQuery[] = [];

    try {
      const aiResponse = await SimpleAI.generateWithSchema<{ queries: AISearchQuery[] }>({
        prompt: `Generate 5 simple, diverse search queries for web search.

User Query: "${validatedInput.userQuery}"

Generate queries that:
1. Are simple and natural (how humans search)
2. Use plain keywords without advanced operators
3. Focus on finding relevant data sources
4. Are DIFFERENT from each other (avoid similar queries)
5. Cover different aspects of the topic

AVOID: site: operators, OR operators, quotes, exclusions, date filters, duplicate concepts

Return JSON: { "queries": [{"query": "...", "reasoning": "...", "priority": 1}] }`,
        schema: {
          queries: [
            {
              query: 'string',
              reasoning: 'string',
              priority: 1,
            },
          ],
        },
        model: process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free',
        maxTokens: 800,
        temperature: 0.4,
      });

      if (aiResponse && Array.isArray(aiResponse.queries)) {
        searchQueries = aiResponse.queries;
      }
    } catch (error: any) {
      console.warn(`[GenerateSearchUrls] AI search query generation failed: ${error?.message || String(error)}. Using fallback queries.`);
    }

    if (!searchQueries.length) {
      const fallbackQueries = generateFallbackSearchQueries(validatedInput.userQuery);
      console.log(`[GenerateSearchUrls] Using ${fallbackQueries.length} fallback search queries`);
      searchQueries = fallbackQueries;
    }

    // Deduplicate queries to avoid unnecessary API calls
    searchQueries = deduplicateQueries(searchQueries);

    // Ensure we have at least 5 unique queries, pad using simple/fallback if needed
    const DESIRED_SERP_CALLS = 5;
    if (searchQueries.length < DESIRED_SERP_CALLS) {
      const padSimple = generateSimpleQueries(validatedInput.userQuery);
      const padFallback = generateFallbackSearchQueries(validatedInput.userQuery);
      const seenQ = new Set(searchQueries.map(q => q.query.toLowerCase().trim()));
      const pushIfNew = (q: string, reason: string) => {
        const norm = q.toLowerCase().trim();
        if (!seenQ.has(norm)) {
          searchQueries.push({ query: q, reasoning: reason, priority: 1 });
          seenQ.add(norm);
        }
      };
      for (const q of padSimple) {
        if (searchQueries.length >= DESIRED_SERP_CALLS) break;
        pushIfNew(q, 'Simple padding');
      }
      for (const q of padFallback) {
        if (searchQueries.length >= DESIRED_SERP_CALLS) break;
        pushIfNew(q.query, 'Fallback padding');
      }
    }

    // Limit to exactly 5 queries
    if (searchQueries.length > DESIRED_SERP_CALLS) {
      searchQueries = searchQueries.slice(0, DESIRED_SERP_CALLS);
    }

    console.log(`[GenerateSearchUrls] Using ${searchQueries.length} queries for SerpAPI`);

    // Step 2: Search for URLs using SerpAPI
    console.log('[GenerateSearchUrls] Step 2: Searching for URLs with SerpAPI...');
    console.log('[GenerateSearchUrls] Search queries:', searchQueries.map(q => q.query));
    const searchResponse = await serpapiService.searchMultipleQueries(
      searchQueries.map(q => q.query),
      Math.ceil(overfetchLimit / Math.max(1, searchQueries.length))
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
        Math.ceil(overfetchLimit / Math.max(1, simpleQueries.length))
      );

      if (simpleSearch.success && simpleSearch.results.length > 0) {
        console.log(`[GenerateSearchUrls] Found ${simpleSearch.results.length} results with simple queries`);

        // Rank and filter simple query results
        let rankedUrls = await rankUrlsByRelevance(
          simpleSearch.results,
          validatedInput.userQuery,
          validatedInput.maxUrls
        );
        rankedUrls = injectSectorCuratedUrls(
          rankedUrls,
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
    let rankedUrls = await rankUrlsByRelevance(
      searchResponse.results,
      validatedInput.userQuery,
      overfetchLimit
    );
    rankedUrls = injectSectorCuratedUrls(
      rankedUrls,
      validatedInput.userQuery,
      overfetchLimit
    );

    console.log(`[GenerateSearchUrls] Selected ${rankedUrls.length} most relevant URLs`);

    // Cache the results to avoid duplicate API calls
    searchCache.set(cacheKey, {
      urls: rankedUrls,
      timestamp: Date.now()
    });
    console.log(`[GenerateSearchUrls] Cached results for future use`);

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
    // Category detection from query
    const qLower = userQuery.toLowerCase();
    const isFinance = /(\b|\s)(nse|stock|stocks|equity|fno|f&o|breakout|rsi|volume|sector|nifty|banknifty|share)(\b|\s)/i.test(qLower);
    const financeDomainBoost = new Set([
      'nseindia.com', 'moneycontrol.com', 'investing.com', 'tradingview.com', 'economictimes.indiatimes.com',
      'bseindia.com', 'zerodha.com', 'tickertape.in', 'screener.in', 'livemint.com', 'finance.yahoo.com'
    ]);

    // Simple relevance scoring based on title and snippet matching with optional domain boost
    const scoredUrls = searchResults.map(result => {
      const titleScore = calculateRelevanceScore(result.title, userQuery);
      const snippetScore = calculateRelevanceScore(result.snippet, userQuery);
      let combinedScore = (titleScore * 0.7) + (snippetScore * 0.3);
      if (isFinance) {
        const src = (result.source || '').toLowerCase();
        if (financeDomainBoost.has(src)) {
          combinedScore = Math.min(1, combinedScore + 0.2);
        }
      }

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

function getSectorCuratedUrls(userQuery: string): Array<{
  url: string;
  title: string;
  snippet: string;
  source: string;
}> {
  const queryLower = userQuery.toLowerCase();
  const urls: Array<{
    url: string;
    title: string;
    snippet: string;
    source: string;
  }> = [];

  if (/(\\b|\\s)(nse|stock|stocks|equity|fno|f&o|breakout|rsi|volume|sector|nifty|banknifty|share)(\\b|\\s)/i.test(queryLower)) {
    urls.push(
      {
        url: 'https://www.nseindia.com/market-data/live-equity-market',
        title: 'NSE Live Equity Market',
        snippet: 'Official NSE India live equity market data and lists.',
        source: 'nseindia.com',
      },
      {
        url: 'https://www.bseindia.com/markets.html',
        title: 'BSE India Markets',
        snippet: 'Official Bombay Stock Exchange market data and information.',
        source: 'bseindia.com',
      },
      {
        url: 'https://www.moneycontrol.com/stocks/marketinfo/marketcap/bse/index.html',
        title: 'Moneycontrol Market Cap Rankings',
        snippet: 'Free market-cap based stock lists and sector data.',
        source: 'moneycontrol.com',
      },
      {
        url: 'https://www.screener.in/',
        title: 'Screener.in – Stock Screener',
        snippet: 'Open stock screener with fundamentals and sector classification.',
        source: 'screener.in',
      },
      {
        url: 'https://www.tickertape.in/stocks',
        title: 'Tickertape India Stocks',
        snippet: 'Indian stocks and sector/industry level data.',
        source: 'tickertape.in',
      },
    );
  }

  if (queryLower.includes('charging') || queryLower.includes('ev') || queryLower.includes('electric vehicle')) {
    urls.push(
      {
        url: 'https://openchargemap.org/site',
        title: 'Open Charge Map',
        snippet: 'Global open data registry of electric vehicle charging locations.',
        source: 'openchargemap.org',
      },
      {
        url: 'https://www.plugshare.com/',
        title: 'PlugShare EV Charging Map',
        snippet: 'Crowdsourced map of EV charging stations worldwide.',
        source: 'plugshare.com',
      },
      {
        url: 'https://www.evgo.com/',
        title: 'EVgo Charging Network',
        snippet: 'Public fast charging network information and locations.',
        source: 'evgo.com',
      },
      {
        url: 'https://data.gov.in/',
        title: 'data.gov.in – Open Government Data (EV Datasets)',
        snippet: 'Indian government open data portal, including EV/transport datasets.',
        source: 'data.gov.in',
      },
      {
        url: 'https://www.iea.org/data-and-statistics',
        title: 'IEA Energy Data & Statistics',
        snippet: 'International Energy Agency datasets including EV and charging.',
        source: 'iea.org',
      },
    );
  }

  if (queryLower.includes('restaurant') || queryLower.includes('food') || queryLower.includes('dining')) {
    urls.push(
      {
        url: 'https://www.zomato.com/',
        title: 'Zomato Restaurant Listings',
        snippet: 'Restaurant discovery and ratings platform.',
        source: 'zomato.com',
      },
      {
        url: 'https://www.swiggy.com/restaurants',
        title: 'Swiggy Restaurant Directory',
        snippet: 'Restaurant listings by location with ratings.',
        source: 'swiggy.com',
      },
      {
        url: 'https://www.yelp.com/search?find_desc=restaurants',
        title: 'Yelp – Restaurants',
        snippet: 'Crowdsourced reviews and ratings for restaurants.',
        source: 'yelp.com',
      },
      {
        url: 'https://www.tripadvisor.com/Restaurants',
        title: 'Tripadvisor – Restaurants',
        snippet: 'Global restaurant reviews and rankings.',
        source: 'tripadvisor.com',
      },
      {
        url: 'https://www.opentable.com/',
        title: 'OpenTable',
        snippet: 'Online restaurant reservations and discovery.',
        source: 'opentable.com',
      },
    );
  }

  if (queryLower.includes('hotel') || queryLower.includes('accommodation') || queryLower.includes('stay')) {
    urls.push(
      {
        url: 'https://www.booking.com/',
        title: 'Booking.com – Hotels',
        snippet: 'Global hotel and stay listings with reviews.',
        source: 'booking.com',
      },
      {
        url: 'https://www.agoda.com/',
        title: 'Agoda – Hotels & Stays',
        snippet: 'Hotel deals and accommodation data.',
        source: 'agoda.com',
      },
      {
        url: 'https://www.tripadvisor.com/Hotels',
        title: 'Tripadvisor – Hotels',
        snippet: 'Hotel reviews, rankings and traveler photos.',
        source: 'tripadvisor.com',
      },
      {
        url: 'https://www.hotels.com/',
        title: 'Hotels.com',
        snippet: 'Hotel reservations and deals with ratings.',
        source: 'hotels.com',
      },
      {
        url: 'https://www.makemytrip.com/hotels',
        title: 'MakeMyTrip – Hotels in India',
        snippet: 'Indian hotel listings and offers.',
        source: 'makemytrip.com',
      },
    );
  }

  return urls;
}

function injectSectorCuratedUrls(
  rankedUrls: Array<{
    url: string;
    title: string;
    snippet: string;
    relevanceScore: number;
    source: string;
  }>,
  userQuery: string,
  maxUrls: number
): Array<{
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  source: string;
}> {
  try {
    const curated = getSectorCuratedUrls(userQuery);
    if (!curated.length) {
      return rankedUrls.slice(0, maxUrls);
    }

    const existing = new Set(rankedUrls.map(item => item.url));
    const toInject: Array<{
      url: string;
      title: string;
      snippet: string;
      relevanceScore: number;
      source: string;
    }> = [];

    for (const entry of curated) {
      if (!existing.has(entry.url)) {
        toInject.push({
          url: entry.url,
          title: entry.title,
          snippet: entry.snippet,
          relevanceScore: 1,
          source: entry.source,
        });
        break;
      }
    }

    if (!toInject.length) {
      return rankedUrls.slice(0, maxUrls);
    }

    const merged = [...toInject, ...rankedUrls];
    const seen = new Set<string>();
    const deduped: Array<{
      url: string;
      title: string;
      snippet: string;
      relevanceScore: number;
      source: string;
    }> = [];

    for (const item of merged) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      deduped.push(item);
      if (deduped.length >= maxUrls) break;
    }

    return deduped;
  } catch {
    return rankedUrls.slice(0, maxUrls);
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
  const tokens = new Set(queryLower.split(/[^a-z0-9+\.]+/i).filter(Boolean));
  const hasWord = (w: string) => tokens.has(w);
  const hasPhrase = (p: string) => queryLower.includes(p);

  // Finance/stocks-specific fallback (avoid misclassifying 'level' as 'ev')
  const financeWords = ['nse', 'stock', 'stocks', 'equity', 'fno', 'f&o', 'breakout', 'rsi', 'volume', 'sector', 'nifty', 'banknifty', 'share'];
  const isFinance = financeWords.some(w => hasWord(w) || hasPhrase(w));
  if (isFinance) {
    const base = queryLower.replace(/\s+/g, ' ').trim();
    return [
      {
        query: `${base} nse f&o breakout stocks`,
        reasoning: 'Targets NSE F&O breakout contexts with original intent',
        priority: 1
      },
      {
        query: `nse f&o stocks breakout high volume rsi`,
        reasoning: 'Generic breakout + volume + RSI keywords',
        priority: 2
      },
      {
        query: `nse stocks technical breakout list`,
        reasoning: 'Looks for curated lists of technical breakouts',
        priority: 3
      }
    ];
  }

  // EV detection with word boundaries and phrases only
  const isEV = hasWord('ev') || hasPhrase('electric vehicle') || hasPhrase('ev charging') || hasWord('charging');
  if (isEV) {
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
  if (/(\b|\s)(nse|stock|stocks|equity|fno|f&o|breakout|rsi|volume|sector|nifty|banknifty)(\b|\s)/i.test(queryLower)) {
    urls.push({
      url: 'https://www.moneycontrol.com/markets/fno-market-snapshot',
      title: 'Moneycontrol F&O Market Snapshot',
      snippet: 'F&O stocks, derivatives, and market data',
      relevanceScore: 0.9,
      source: 'moneycontrol.com'
    });
    urls.push({
      url: 'https://www.investing.com/equities/india',
      title: 'Investing.com India Stocks',
      snippet: 'Indian equities quotes and technicals',
      relevanceScore: 0.85,
      source: 'investing.com'
    });
    urls.push({
      url: 'https://www.nseindia.com/market-data/live-equity-market',
      title: 'NSE Live Equity Market',
      snippet: 'NSE live market data and equity lists',
      relevanceScore: 0.8,
      source: 'nseindia.com'
    });
    urls.push({
      url: 'https://in.tradingview.com/markets/stocks-india/sectorandindustry-sector/',
      title: 'TradingView India Sectors',
      snippet: 'Sector performance and stocks lists',
      relevanceScore: 0.75,
      source: 'tradingview.com'
    });
  }

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
