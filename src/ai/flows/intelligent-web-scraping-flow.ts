'use server';

import { z } from 'zod';
import { generateSearchUrls } from './generate-search-urls-flow';
import { refineScrapedContent, refineScrapedContentFallback } from './refine-scraped-content-flow';
import { structureData, structureDataFallback } from './structure-data-flow';
import { crawl4aiService, type Crawl4AIRequest } from '@/services/crawl4ai-service';

// Input validation schema
const IntelligentWebScrapingInputSchema = z.object({
  userQuery: z.string().min(1, 'User query is required'),
  numRows: z.number().min(1).max(100).default(25),
  maxUrls: z.number().min(1).max(15).default(10),
  useAI: z.boolean().default(true),
  aiModel: z.string().optional(),
  aiApiKey: z.string().optional(),
});

// Output validation schema
const IntelligentWebScrapingOutputSchema = z.object({
  success: z.boolean(),
  data: z.array(z.record(z.any())),
  csv: z.string(),
  schema: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
  })),
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
  metadata: z.object({
    originalSources: z.number(),
    refinedSources: z.number(),
    dataRows: z.number(),
    tablesFound: z.number(),
    processingTime: z.number(),
  }),
  feedback: z.string(),
  error: z.string().optional(),
});

export type IntelligentWebScrapingInput = z.infer<typeof IntelligentWebScrapingInputSchema>;
export type IntelligentWebScrapingOutput = z.infer<typeof IntelligentWebScrapingOutputSchema>;

/**
 * Create enhanced extraction prompt for Crawl4AI
 */
function createEnhancedExtractionPrompt(userQuery: string, numRows: number): string {
  const queryLower = userQuery.toLowerCase();
  
  let specificInstructions = '';
  
  if (queryLower.includes('movie') || queryLower.includes('film')) {
    specificInstructions = `
Focus on extracting:
- Movie titles, release dates, directors, cast members
- Ratings, reviews, plot summaries
- Genre, runtime, production details
- Look for tables, lists, and structured data
- Extract from IMDb-style pages, Wikipedia movie lists, news articles`;
  } else if (queryLower.includes('restaurant') || queryLower.includes('food') || queryLower.includes('dining')) {
    specificInstructions = `
Focus on extracting:
- Restaurant names, addresses, phone numbers
- Ratings, reviews, price ranges
- Cuisine types, specialties, timings
- Look for review snippets, rating displays, contact info
- Extract from Zomato, TripAdvisor, Yelp-style pages`;
  } else if (queryLower.includes('charging') || queryLower.includes('ev') || queryLower.includes('electric vehicle')) {
    specificInstructions = `
Focus on extracting:
- Station names, addresses, locations
- Charging types, power levels, availability
- Network providers, contact information
- Look for station directories, maps, provider lists
- Extract from PlugShare, ChargePoint, government sites`;
  } else {
    specificInstructions = `
Focus on extracting:
- Names, titles, descriptions
- Dates, locations, contact information
- Ratings, reviews, specifications
- Look for tables, lists, structured data
- Extract comprehensive information from all content types`;
  }
  
  return `Extract all relevant data from this page for: "${userQuery}"

${specificInstructions}

Instructions:
1. Be comprehensive - extract from tables, lists, text, and structured data
2. Extract ${numRows * 2} rows if possible (we need ${numRows} final rows)
3. Include all relevant fields and details
4. If data is incomplete, extract what's available
5. Focus on factual, structured information

Extract data in a format that can be easily structured into a dataset.`;
}

/**
 * Main intelligent web scraping orchestrator
 * Combines all steps: URL generation → Scraping → Content refinement → Data structuring
 */
export async function intelligentWebScraping(input: IntelligentWebScrapingInput): Promise<IntelligentWebScrapingOutput> {
  const startTime = Date.now();
  console.log(`[IntelligentWebScraping] Starting intelligent web scraping for: "${input.userQuery.substring(0, 100)}..."`);

  try {
    // Validate input
    const validatedInput = IntelligentWebScrapingInputSchema.parse(input);

    // Step 1: Generate search URLs using AI + SerpAPI
    console.log('[IntelligentWebScraping] Step 1: Generating search URLs...');
    const urlGenerationResult = await generateSearchUrls({
      userQuery: validatedInput.userQuery,
      maxUrls: validatedInput.maxUrls,
    });

    if (!urlGenerationResult.success) {
      throw new Error(`URL generation failed: ${urlGenerationResult.error}`);
    }

    const urls = urlGenerationResult.urls;
    console.log(`[IntelligentWebScraping] Generated ${urls.length} URLs`);

    // Step 2: Scrape URLs using Crawl4AI
    console.log('[IntelligentWebScraping] Step 2: Scraping URLs with Crawl4AI...');
    
    // Create enhanced extraction prompt
    const enhancedPrompt = createEnhancedExtractionPrompt(validatedInput.userQuery, validatedInput.numRows);
    
    const crawlRequest: Crawl4AIRequest = {
      urls: urls.map(u => u.url),
      prompt: enhancedPrompt,
      numRows: Math.min(validatedInput.numRows * 2, 50), // Request more data than needed
      useAI: true, // Always use AI for better extraction
      aiModel: validatedInput.aiModel,
      aiApiKey: validatedInput.aiApiKey,
    };

    const crawlResult = await crawl4aiService.extractData(crawlRequest);
    
    if (!crawlResult.success) {
      throw new Error(`Crawling failed: ${crawlResult.error}`);
    }

    console.log(`[IntelligentWebScraping] Scraped ${crawlResult.data.length} data points from ${urls.length} URLs`);

    // Step 3: Refine scraped content using AI
    console.log('[IntelligentWebScraping] Step 3: Refining scraped content...');
    const scrapedContent = crawlResult.data.map((item, index) => ({
      url: urls[index]?.url || item.source_url || 'unknown',
      title: urls[index]?.title || item.title || 'Untitled',
      content: item.content || item.text || JSON.stringify(item),
    }));

    const refinementResult = await refineScrapedContent({
      scrapedContent,
      userQuery: validatedInput.userQuery,
    });

    if (!refinementResult.success) {
      console.warn('[IntelligentWebScraping] Content refinement failed, using fallback...');
      const fallbackResult = await refineScrapedContentFallback({
        scrapedContent,
        userQuery: validatedInput.userQuery,
      });
      
      if (!fallbackResult.success) {
        throw new Error(`Content refinement failed: ${refinementResult.error}`);
      }
    }

    const refinedContent = refinementResult.success ? refinementResult.refinedContent : [];
    console.log(`[IntelligentWebScraping] Refined ${scrapedContent.length} sources to ${refinedContent.length} relevant sources`);

    // Step 4: Structure data using AI
    console.log('[IntelligentWebScraping] Step 4: Structuring data with AI...');
    const structuringResult = await structureData({
      refinedContent: refinedContent.map(item => ({
        url: item.url,
        title: item.title,
        relevantContent: item.relevantContent,
        confidence: item.confidence,
      })),
      userQuery: validatedInput.userQuery,
      numRows: validatedInput.numRows,
    });

    if (!structuringResult.success) {
      console.warn('[IntelligentWebScraping] Data structuring failed, using fallback...');
      const fallbackResult = await structureDataFallback({
        refinedContent: refinedContent.map(item => ({
          url: item.url,
          title: item.title,
          relevantContent: item.relevantContent,
          confidence: item.confidence,
        })),
        userQuery: validatedInput.userQuery,
        numRows: validatedInput.numRows,
      });
      
      if (!fallbackResult.success) {
        throw new Error(`Data structuring failed: ${structuringResult.error}`);
      }
    }

    const finalData = structuringResult.success ? structuringResult.data : [];
    const finalSchema = structuringResult.success ? structuringResult.schema : [];
    const finalCsv = structuringResult.success ? structuringResult.csv : '';
    const finalReasoning = structuringResult.success ? structuringResult.reasoning : '';

    const processingTime = Date.now() - startTime;
    console.log(`[IntelligentWebScraping] Completed in ${processingTime}ms: ${finalData.length} rows, ${finalSchema.length} columns`);

    // Generate feedback
    const feedback = generateFeedback({
      urls: urls.length,
      originalSources: scrapedContent.length,
      refinedSources: refinedContent.length,
      dataRows: finalData.length,
      tablesFound: crawlResult.tablesFound,
      processingTime,
      reasoning: finalReasoning,
    });

    return {
      success: true,
      data: finalData,
      csv: finalCsv,
      schema: finalSchema,
      urls,
      searchQueries: urlGenerationResult.searchQueries,
      metadata: {
        originalSources: scrapedContent.length,
        refinedSources: refinedContent.length,
        dataRows: finalData.length,
        tablesFound: crawlResult.tablesFound,
        processingTime,
      },
      feedback,
    };

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('[IntelligentWebScraping] Error:', error);
    
    return {
      success: false,
      data: [],
      csv: '',
      schema: [],
      urls: [],
      searchQueries: [],
      metadata: {
        originalSources: 0,
        refinedSources: 0,
        dataRows: 0,
        tablesFound: 0,
        processingTime,
      },
      feedback: `Error: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Generate feedback message for the user
 */
function generateFeedback(params: {
  urls: number;
  originalSources: number;
  refinedSources: number;
  dataRows: number;
  tablesFound: number;
  processingTime: number;
  reasoning: string;
}): string {
  const { urls, originalSources, refinedSources, dataRows, tablesFound, processingTime, reasoning } = params;
  
  let feedback = `Successfully processed ${urls} URLs and extracted ${dataRows} data rows in ${Math.round(processingTime / 1000)}s. `;
  
  if (originalSources > refinedSources) {
    feedback += `Filtered ${originalSources} sources down to ${refinedSources} most relevant ones. `;
  }
  
  if (tablesFound > 0) {
    feedback += `Found ${tablesFound} data tables. `;
  }
  
  if (reasoning) {
    feedback += `AI reasoning: ${reasoning}`;
  }
  
  return feedback.trim();
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use intelligentWebScraping instead
 */
export async function intelligentWebScrapingFlow(input: IntelligentWebScrapingInput): Promise<IntelligentWebScrapingOutput> {
  console.warn('[IntelligentWebScraping] intelligentWebScrapingFlow is deprecated, use intelligentWebScraping instead');
  return intelligentWebScraping(input);
}
