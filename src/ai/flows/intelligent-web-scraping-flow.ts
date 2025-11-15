'use server';

import { z } from 'zod';
import { generateSearchUrls } from './generate-search-urls-flow';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { crawl4aiService } from '@/services/crawl4ai-service';

// Input validation schema
const IntelligentWebScrapingInputSchema = z.object({
  userQuery: z.string().min(1, 'User query is required'),
  numRows: z.number().min(1).max(300).default(300),
  maxUrls: z.number().min(1).max(15).default(15), // LIMITED TO 4 URLs MAX
  useAI: z.boolean().default(true),
});

// Output validation schema
const IntelligentWebScrapingOutputSchema = z.object({
  success: z.boolean(),
  data: z.array(z.record(z.any())).optional(),
  csv: z.string().optional(),
  schema: z.array(z.object({
    name: z.string(),
    type: z.string(),
  })).optional(),
  urls: z.array(z.string()).optional(),
  searchQueries: z.array(z.string()).optional(),
  feedback: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  error: z.string().optional(),
  fallbackToAI: z.boolean().optional(),
});

export type IntelligentWebScrapingInput = z.infer<typeof IntelligentWebScrapingInputSchema>;
export type IntelligentWebScrapingOutput = z.infer<typeof IntelligentWebScrapingOutputSchema>;

// Type for the logger interface
export interface WebScrapingLogger {
  log: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  progress: (step: string, current: number, total: number, details?: string) => void;
}

/**
 * Heuristic filter for URLs that are likely not useful or block scraping
 */
function isScrapableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '').toLowerCase();
    const path = u.pathname.toLowerCase();

    // Block Google search and similar SERP pages
    if (host.includes('google.') && path.startsWith('/search')) return false;

    // Block social platforms which aggressively block scraping
    const socialHosts = ['facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'linkedin.com'];
    if (socialHosts.some(h => host.endsWith(h))) return false;

    // Block Wikipedia Main Page (not topical)
    if (host.endsWith('wikipedia.org') && path === '/wiki/main_page') return false;

    // Otherwise allow
    return true;
  } catch {
    return false;
  }
}

/**
 * Main intelligent web scraping flow that orchestrates the entire process
 */
export async function intelligentWebScraping(
  input: IntelligentWebScrapingInput,
  logger?: WebScrapingLogger
): Promise<IntelligentWebScrapingOutput> {
  console.log(`[IntelligentWebScraping] Starting web scraping for: "${input.userQuery.substring(0, 100)}..."`);
  console.log(`[IntelligentWebScraping] Target rows: ${input.numRows}, Max URLs: ${input.maxUrls}`);

  try {
    // Validate input
    const validatedInput = IntelligentWebScrapingInputSchema.parse(input);

    // Step 1: Generate search URLs
    logger?.log('Step 1: Generating search queries and finding relevant URLs...');
    logger?.progress('Search URLs', 1, 6, 'Finding relevant web sources');
    
    const searchResult = await generateSearchUrls({
      userQuery: validatedInput.userQuery,
      maxUrls: validatedInput.maxUrls,
    });

    if (!searchResult.success || searchResult.urls.length === 0) {
      const errorMsg = `Failed to find relevant URLs: ${searchResult.error || 'No URLs found'}`;
      logger?.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    logger?.success(`Found ${searchResult.urls.length} relevant URLs`);
    logger?.log(`Search queries used: ${searchResult.searchQueries.map(q => q.query).join(', ')}`);

    // Filter out URLs that are known to be hard to scrape or not useful (Google SERP, social, Wikipedia Main Page, etc.)
    const candidateUrls = searchResult.urls.map(url => url.url);
    let filteredUrls = candidateUrls.filter(isScrapableUrl);
    const filteredOut = candidateUrls.length - filteredUrls.length;
    if (filteredOut > 0) {
      logger?.log(`Filtered out ${filteredOut} non-scrapable/low-signal URLs`);
    }
    // Prepare initial and backfill URL sets
    const initialUrls = filteredUrls.slice(0, validatedInput.maxUrls);
    const backfillQueue = filteredUrls.slice(validatedInput.maxUrls);

    if (filteredUrls.length === 0) {
      const errorMsg = 'No scrapable URLs after filtering (Google SERP/Wikipedia Main Page/social links removed)';
      logger?.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
        fallbackToAI: true,
        urls: candidateUrls,
        searchQueries: searchResult.searchQueries.map(q => q.query),
      };
    }

    // Step 2: Scrape ALL content from URLs using Crawl4AI (wait for ALL to complete)
    logger?.log('Step 2: Scraping content from web pages...');
    logger?.progress('Web Scraping', 2, 6, 'Extracting content from URLs');

    const scrapedContent = await scrapeUrlsWithCrawl4AI(
      initialUrls,
      logger
    );

    if (!scrapedContent.success || scrapedContent.content.length === 0) {
      const errorMsg = `Failed to scrape content: ${scrapedContent.error || 'No content extracted'}`;
      logger?.error(errorMsg);
      logger?.log('🔄 Some URLs failed to scrape, but continuing with available data...');
      
      // Check if we have any partial success
      if (scrapedContent.content && scrapedContent.content.length > 0) {
        logger?.log(`✅ Proceeding with ${scrapedContent.content.length} successfully scraped sources`);
        // Continue with the partial data we have
      } else {
        logger?.log('🔄 No content could be scraped, falling back to AI-only data generation...');
        return {
          success: false,
          error: errorMsg,
          fallbackToAI: true, // Signal that we should fall back to AI generation
          urls: searchResult.urls.map(url => url.url),
          searchQueries: searchResult.searchQueries.map(q => q.query),
        };
      }
    }

    // Backfill if we didn't reach the target count and we have extra candidates
    let scrapedResults = Array.isArray(scrapedContent.content) ? [...scrapedContent.content] : [];
    if (scrapedResults.length < validatedInput.maxUrls && backfillQueue.length > 0) {
      logger?.log(`🔄 Backfilling: ${scrapedResults.length}/${validatedInput.maxUrls} scraped. Trying ${backfillQueue.length} extra candidates...`);
      // Process backfill in chunks to avoid overwhelming the service
      for (let i = 0; i < backfillQueue.length && scrapedResults.length < validatedInput.maxUrls; i += 5) {
        const backfillBatch = backfillQueue.slice(i, i + 5);
        logger?.log(`Backfill batch ${Math.floor(i / 5) + 1}/${Math.ceil(backfillQueue.length / 5)}: ${backfillBatch.length} URLs`);
        const backfillResp = await scrapeUrlsWithCrawl4AI(backfillBatch, logger);
        if (backfillResp.success && Array.isArray(backfillResp.content)) {
          const existing = new Set(scrapedResults.map(r => r.url));
          const uniqueNew = backfillResp.content.filter(r => !existing.has(r.url));
          scrapedResults.push(...uniqueNew);
          logger?.log(`Backfill added ${uniqueNew.length} pages (total ${scrapedResults.length})`);
        } else {
          logger?.log(`Backfill batch produced no additional content`);
        }
      }
    }

    logger?.success(`Successfully scraped content from ${scrapedResults.length} pages`);

    // Step 3: Try Crawl4AI structured extraction first (chunked, JSON-mode)
    logger?.log('Step 3: Extracting structured rows with Crawl4AI...');
    logger?.progress('Crawl4AI Extraction', 3, 6, 'Chunked LLM extraction to avoid token limits');

    const extraction = await crawl4aiService.extractStructuredBulk(
      scrapedResults.map(r => r.url),
      {
        query: validatedInput.userQuery,
        targetRows: validatedInput.numRows,
        chunking: { window_size: 600, overlap: 60 },
        llm: {
          provider: process.env.CRAWL4AI_LLM_PROVIDER || 'openai',
          model: process.env.CRAWL4AI_LLM_MODEL || 'gpt-4o-mini',
          temperature: 0.1,
          json_mode: true,
        },
        filters: undefined,
      }
    );

    let extractedRows: any[] = [];
    if (extraction.success && Array.isArray(extraction.results) && extraction.results.length > 0) {
      const seen = new Set<string>();
      for (const res of extraction.results) {
        const rows = Array.isArray(res.rows) ? res.rows : [];
        for (const row of rows) {
          const key = JSON.stringify(row || {});
          if (!seen.has(key)) {
            extractedRows.push(row);
            seen.add(key);
          }
        }
      }
      logger?.success(`✅ Crawl4AI extracted ${extractedRows.length} rows across ${extraction.results.length} pages`);
    } else {
      logger?.log(`⚠️ Crawl4AI structured extraction returned no rows (${extraction.error || 'no error message'})`);
    }

    if (extractedRows.length > 0) {
      const allKeys = Array.from(new Set(extractedRows.flatMap(r => Object.keys(r || {}))));
      function infer(values: any[]): string {
        const nonNull = values.filter(v => v !== null && v !== undefined);
        if (nonNull.length === 0) return 'string';
        const boolCount = nonNull.filter(v => typeof v === 'boolean' || v === 'true' || v === 'false').length;
        if (boolCount === nonNull.length) return 'boolean';
        const numCount = nonNull.filter(v => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))).length;
        if (numCount === nonNull.length) return 'number';
        const dateCount = nonNull.filter(v => !isNaN(new Date(v as any).getTime())).length;
        if (dateCount === nonNull.length) return 'date';
        return 'string';
      }
      const unifiedSchema = allKeys.map(k => ({ name: k, type: infer(extractedRows.map(r => r ? r[k] : undefined)) }));
      const normalized = extractedRows.map(r => {
        const obj: Record<string, any> = {};
        for (const k of allKeys) obj[k] = r && k in r ? r[k] : '';
        return obj;
      });
      const limitedRows = normalized.slice(0, validatedInput.numRows);

      logger?.log('Step 5: Generating CSV format...');
      logger?.progress('CSV Generation', 5, 6, 'Creating downloadable CSV');
      const csv = generateCSV(limitedRows, unifiedSchema);

      logger?.log('Step 6: Saving CSV to output folder...');
      logger?.log(`Creating CSV file with ${limitedRows.length} rows`);
      logger?.progress('Complete', 6, 6, 'Saving CSV file and finalizing');

      const outputDir = join(process.cwd(), 'output');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const csvFileName = `dataset-${timestamp}.csv`;
      const csvFilePath = join(outputDir, csvFileName);
      try {
        writeFileSync(csvFilePath, csv, 'utf8');
        logger?.success(`✅ SINGLE CSV saved to: ${csvFilePath}`);
        logger?.log(`📊 Final dataset: ${limitedRows.length} rows, ${unifiedSchema.length} columns`);
      } catch (error) {
        logger?.error(`Failed to save CSV: ${error}`);
      }

      const result: IntelligentWebScrapingOutput = {
        success: true,
        data: limitedRows,
        csv,
        schema: unifiedSchema,
        urls: searchResult.urls.map(url => url.url),
        searchQueries: searchResult.searchQueries.map(q => q.query),
        feedback: 'Crawl4AI structured extraction',
        metadata: {
          totalUrls: searchResult.urls.length,
          scrapedPages: scrapedResults.length,
          refinedSources: scrapedResults.length,
          generatedRows: limitedRows.length,
          timestamp: new Date().toISOString(),
          csvFilePath: csvFilePath,
        },
      };

      logger?.success(`🎉 Web scraping completed via Crawl4AI! Generated ${limitedRows.length} rows from ${searchResult.urls.length} URLs`);
      logger?.success(`📁 CSV saved to: ${csvFilePath}`);
      return result;
    }

    // Fallback: previous markdown + AI analysis path
    logger?.log('Step 3: Creating markdown dataset file...');
    logger?.progress('Data Preparation', 3, 6, 'Preparing markdown for AI analysis');

    const markdownFilePath = await dumpScrapedDataToMarkdown(
      scrapedResults,
      validatedInput.userQuery,
      logger
    );
    
    if (!markdownFilePath) {
      const errorMsg = 'Failed to create markdown dataset file';
      logger?.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
        fallbackToAI: true,
        urls: searchResult.urls.map(url => url.url),
        searchQueries: searchResult.searchQueries.map(q => q.query),
      };
    }

    logger?.success(`All scraped data saved to markdown file: ${markdownFilePath}`);

    logger?.log('Step 4: AI analyzing markdown dataset...');
    logger?.log(`Dataset contains ${scrapedResults.length} scraped sources`);
    logger?.progress('AI Analysis', 4, 6, 'Processing markdown with AI');

    const structuredData = await analyzeCompleteMarkdownDataset({
      markdownFilePath,
      userQuery: validatedInput.userQuery,
      numRows: validatedInput.numRows,
      logger
    });

    if (!structuredData.success || !structuredData.data || structuredData.data.length === 0) {
      const errorMsg = `Failed to analyze and structure data: ${structuredData.error || 'No structured data generated'}`;
      logger?.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
        fallbackToAI: true,
        urls: searchResult.urls.map(url => url.url),
        searchQueries: searchResult.searchQueries.map(q => q.query),
      };
    }

    logger?.success(`AI generated ${structuredData.data.length} rows from complete dataset analysis`);

    logger?.log('Step 5: Generating CSV format...');
    logger?.progress('CSV Generation', 5, 6, 'Creating downloadable CSV');

    const csv = generateCSV(structuredData.data, structuredData.schema || []);

    logger?.log('Step 6: Saving CSV to output folder...');
    logger?.log(`Creating CSV file with ${structuredData.data.length} rows`);
    logger?.progress('Complete', 6, 6, 'Saving CSV file and finalizing');

    const outputDir = join(process.cwd(), 'output');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFileName = `dataset-${timestamp}.csv`;
    const csvFilePath = join(outputDir, csvFileName);
    
    try {
      writeFileSync(csvFilePath, csv, 'utf8');
      logger?.success(`✅ SINGLE CSV saved to: ${csvFilePath}`);
      logger?.log(`📊 Final dataset: ${structuredData.data.length} rows, ${structuredData.schema?.length || 0} columns`);
    } catch (error) {
      logger?.error(`Failed to save CSV: ${error}`);
    }

    try {
      if (existsSync(markdownFilePath)) {
        require('fs').unlinkSync(markdownFilePath);
        logger?.log(`Cleaned up markdown file: ${markdownFilePath}`);
      }
    } catch (error) {
      logger?.log(`Warning: Could not clean up markdown file: ${error}`);
    }

    const result: IntelligentWebScrapingOutput = {
      success: true,
      data: structuredData.data,
      csv,
      schema: structuredData.schema,
      urls: searchResult.urls.map(url => url.url),
      searchQueries: searchResult.searchQueries.map(q => q.query),
      feedback: structuredData.feedback,
      metadata: {
        totalUrls: searchResult.urls.length,
        scrapedPages: scrapedResults.length,
        refinedSources: scrapedResults.length, // All sources were used
        generatedRows: structuredData.data.length,
        timestamp: new Date().toISOString(),
        csvFilePath: csvFilePath, // Include the saved CSV path
      },
    };

    logger?.success(`🎉 Web scraping completed! Generated ${structuredData.data.length} rows from ${searchResult.urls.length} URLs`);
    logger?.success(`📁 CSV saved to: ${csvFilePath}`);

    return result;

  } catch (error: any) {
    console.error('[IntelligentWebScraping] Error:', error);
    const errorMsg = `Web scraping failed: ${error.message}`;
    logger?.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Scrape URLs using Crawl4AI service
 */
async function scrapeUrlsWithCrawl4AI(
  urls: string[],
  logger?: WebScrapingLogger
): Promise<{
  success: boolean;
  content: Array<{
    url: string;
    title: string;
    content: string;
  }>;
  error?: string;
}> {
  try {
    const crawl4aiServiceUrl = process.env.CRAWL4AI_SERVICE_URL || 'http://localhost:11235';
    logger?.log(`Using Crawl4AI service at: ${crawl4aiServiceUrl}`);
    
    // Test if the Crawl4AI service is available
    try {
      const healthCheck = await fetch(`${crawl4aiServiceUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      if (!healthCheck.ok) {
        throw new Error(`Service health check failed: ${healthCheck.status}`);
      }
      logger?.log(`✅ Crawl4AI service is available`);
    } catch (healthError: any) {
      logger?.error(`❌ Crawl4AI service is not available: ${healthError.message}`);
      logger?.log(`🔄 Skipping scraping and triggering AI fallback`);
      return {
        success: false,
        content: [],
        error: `Crawl4AI service unavailable: ${healthError.message}`,
      };
    }

    const scrapedContent: Array<{
      url: string;
      title: string;
      content: string;
    }> = [];

    // Process URLs in batches to avoid overwhelming the service
    // IMPORTANT: Wait for ALL URLs to be scraped before proceeding
    const batchSize = 5;
    logger?.log(`Starting batch processing of ${urls.length} URLs in batches of ${batchSize}`);
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      logger?.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(urls.length / batchSize)}: ${batch.length} URLs`);

      const batchPromises = batch.map(async (url) => {
        try {
            logger?.log(`Scraping: ${url.substring(0, 50)}...`);
          
          // Add retry logic for failed requests
          let response;
          let lastError;
          const maxRetries = 3;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              logger?.log(`Attempt ${attempt}/${maxRetries} for ${url.substring(0, 50)}...`);
              
              response = await fetch(`${crawl4aiServiceUrl}/crawl`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  urls: [url],
                  options: {
                    extract_media: false,
                    extract_links: false,
                    extract_images: false,
                    extract_tables: true,
                    extract_markdown: true,
                    extract_clean_html: true,
                    extract_text: true,
                    wait_for: 3000,
                    timeout: 20000, // Reduced timeout for faster failure detection
                    // Additional options for better content extraction
                    remove_forms: true,
                    remove_scripts: true,
                    remove_styles: true,
                    remove_comments: true,
                  }
                }),
              });
              
              // If we get a response, break out of retry loop
              break;
            } catch (retryError: any) {
              lastError = retryError;
              if (attempt < maxRetries) {
                logger?.log(`⚠️ Attempt ${attempt} failed for ${url.substring(0, 50)}..., retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
              }
            }
          }
          
          if (!response) {
            throw lastError || new Error('Failed to get response after retries');
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          
          // Debug: Log the structure of the response
          console.log(`[Crawl4AI] Response structure for ${url}:`, {
            success: result.success,
            hasResults: !!result.results,
            resultsLength: result.results?.length || 0,
            firstResultKeys: result.results?.[0] ? Object.keys(result.results[0]) : [],
            firstResultContentType: typeof result.results?.[0]?.content,
            firstResultMarkdownType: typeof result.results?.[0]?.markdown,
          });
          
          if (result.success && result.results && result.results.length > 0) {
            const crawlResult = result.results[0];
            
            // Prioritize markdown for cleaner content and better AI analysis
            let contentString = '';
            
            // 1. Try markdown first (cleanest, most AI-friendly)
            if (crawlResult.markdown) {
              if (typeof crawlResult.markdown === 'string') {
                contentString = crawlResult.markdown;
                logger?.log(`✅ Using markdown content for ${url} (${contentString.length} chars)`);
              } else if (typeof crawlResult.markdown === 'object' && crawlResult.markdown.text) {
                contentString = crawlResult.markdown.text;
                logger?.log(`✅ Using markdown object text for ${url} (${contentString.length} chars)`);
              }
            }
            
            // 2. Fallback to extracted_content if markdown not available
            if (!contentString && crawlResult.extracted_content) {
              if (typeof crawlResult.extracted_content === 'string') {
                contentString = crawlResult.extracted_content;
                logger?.log(`⚠️ Using extracted_content for ${url} (${contentString.length} chars)`);
              } else if (typeof crawlResult.extracted_content === 'object' && crawlResult.extracted_content.text) {
                contentString = crawlResult.extracted_content.text;
                logger?.log(`⚠️ Using extracted_content object for ${url} (${contentString.length} chars)`);
              }
            }
            
            // 3. Last resort: cleaned HTML
            if (!contentString && crawlResult.cleaned_html && typeof crawlResult.cleaned_html === 'string') {
              contentString = crawlResult.cleaned_html;
              logger?.log(`⚠️ Using cleaned_html for ${url} (${contentString.length} chars)`);
            }
            
            // 4. Final fallback: raw HTML
            if (!contentString && crawlResult.html && typeof crawlResult.html === 'string') {
              contentString = crawlResult.html;
              logger?.log(`⚠️ Using raw HTML for ${url} (${contentString.length} chars)`);
            }
            
            // 5. If still no content, log warning and continue with empty content
            if (!contentString) {
              logger?.error(`❌ No usable content found for ${url} - continuing with empty content`);
              logger?.log(`🔍 Debug info for ${url}: title="${crawlResult.title}", content length=${crawlResult.content?.length || 0}, markdown length=${crawlResult.markdown?.length || 0}, html length=${crawlResult.html?.length || 0}`);
              contentString = '';
            }
            
            const content = {
              url: url,
              title: crawlResult.title || url,
              content: contentString,
            };
            
            // Send scraped content to logger for real-time display
            logger?.info(`SCRAPED_CONTENT:${JSON.stringify(content)}`);
            
            return content;
          } else {
            throw new Error(result.error || 'Failed to extract content');
          }
        } catch (error: any) {
          // Handle different types of errors gracefully
          if (error.message.includes('HTTP 500')) {
            logger?.error(`❌ Failed to scrape ${url}: HTTP 500: Internal Server Error`);
            logger?.log(`⚠️ Server error for ${url} - this is likely a temporary issue with the target website`);
          } else if (error.message.includes('HTTP 403')) {
            logger?.error(`❌ Failed to scrape ${url}: HTTP 403: Forbidden - Access denied`);
            logger?.log(`⚠️ Access denied for ${url} - the website may be blocking automated requests`);
          } else if (error.message.includes('HTTP 404')) {
            logger?.error(`❌ Failed to scrape ${url}: HTTP 404: Not Found`);
            logger?.log(`⚠️ Page not found for ${url} - the URL may be invalid or moved`);
          } else if (error.message.includes('timeout')) {
            logger?.error(`❌ Failed to scrape ${url}: Request timeout`);
            logger?.log(`⚠️ Timeout for ${url} - the website may be slow or unresponsive`);
          } else {
            logger?.error(`❌ Failed to scrape ${url}: ${error.message}`);
          }
          
          // Don't fail completely - continue with other URLs
          logger?.log(`🔄 Continuing with remaining URLs...`);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null) as Array<{
        url: string;
        title: string;
        content: string;
      }>;
      
      scrapedContent.push(...validResults);
      logger?.log(`Batch ${Math.floor(i / batchSize) + 1} completed: ${validResults.length}/${batch.length} successful`);
    }

    // CRITICAL: Ensure ALL URLs have been processed before proceeding
    logger?.log(`Scraping complete: ${scrapedContent.length}/${urls.length} URLs successfully scraped`);
    
    if (scrapedContent.length === 0) {
      logger?.error('No content could be scraped from any URLs - falling back to AI generation');
      return {
        success: false,
        content: [],
        error: 'No content could be scraped from any URLs - will fall back to AI generation',
      };
    }

    // Only proceed if we have scraped content from at least some URLs
    if (scrapedContent.length < urls.length) {
      const failedCount = urls.length - scrapedContent.length;
      logger?.log(`⚠️ Warning: Only scraped ${scrapedContent.length} out of ${urls.length} URLs (${failedCount} failed), but proceeding with available data`);
      logger?.log(`✅ This is normal - some websites may be temporarily unavailable or block automated requests`);
    }

    return {
      success: true,
      content: scrapedContent,
    };

  } catch (error: any) {
    console.error('[ScrapeUrlsWithCrawl4AI] Error:', error);
    return {
      success: false,
      content: [],
      error: error.message,
    };
  }
}

/**
 * Clean content for AI analysis by removing noise and unwanted data
 */
function cleanContentForAI(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // 1. Remove HTML tags but keep the text content
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  
  // 2. Remove excessive whitespace and normalize
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // 3. Remove common noise patterns
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // 4. Remove excessive punctuation and special characters
  cleaned = cleaned
    .replace(/[^\w\s.,!?;:()\-'"]/g, ' ')
    .replace(/\s+/g, ' ');
  
  // 5. Remove very short lines (likely navigation or ads)
  cleaned = cleaned
    .split('\n')
    .filter(line => line.trim().length > 10)
    .join('\n');
  
  // 6. Remove duplicate lines
  const lines = cleaned.split('\n');
  const uniqueLines = [...new Set(lines)];
  cleaned = uniqueLines.join('\n');
  
  // 7. Remove excessive repeated words (likely navigation)
  const words = cleaned.split(/\s+/);
  const wordCounts = new Map();
  words.forEach(word => {
    const lowerWord = word.toLowerCase();
    wordCounts.set(lowerWord, (wordCounts.get(lowerWord) || 0) + 1);
  });
  
  // Remove words that appear too frequently (likely noise)
  const filteredWords = words.filter(word => {
    const lowerWord = word.toLowerCase();
    const count = wordCounts.get(lowerWord) || 0;
    return count < 10 || word.length > 3; // Keep longer words even if frequent
  });
  
  cleaned = filteredWords.join(' ');
  
  // 8. Final cleanup
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

/**
 * Dump all scraped content to a temporary file for AI analysis
 */
async function dumpScrapedDataToTempFile(
  scrapedContent: Array<{
    url: string;
    title: string;
    content: string;
  }>,
  userQuery: string,
  logger?: WebScrapingLogger
): Promise<string | null> {
  try {
    // Create temp directory if it doesn't exist
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Create a comprehensive dataset file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempFilePath = join(tempDir, `scraped-data-${timestamp}.json`);

    // Filter and clean content before AI analysis
    const cleanedSources = scrapedContent.map((item, index) => {
      const cleanedContent = cleanContentForAI(item.content);
      return {
        id: index + 1,
        url: item.url,
        title: item.title,
        content: cleanedContent,
        contentLength: cleanedContent.length,
        wordCount: cleanedContent.split(/\s+/).length,
        originalLength: item.content.length,
        noiseReduction: Math.round(((item.content.length - cleanedContent.length) / item.content.length) * 100),
      };
    });

    const comprehensiveData = {
      metadata: {
        userQuery,
        scrapedAt: new Date().toISOString(),
        totalSources: scrapedContent.length,
        totalContentLength: cleanedSources.reduce((sum, item) => sum + item.content.length, 0),
        originalContentLength: scrapedContent.reduce((sum, item) => sum + item.content.length, 0),
        averageNoiseReduction: Math.round(cleanedSources.reduce((sum, item) => sum + item.noiseReduction, 0) / cleanedSources.length),
      },
      sources: cleanedSources,
      // Create a combined text for AI analysis (using cleaned content)
      combinedContent: cleanedSources.map(item => 
        `=== SOURCE ${item.id}: ${item.title} (${item.url}) ===\n${item.content}\n\n`
      ).join('\n'),
    };

    // Write to temp file
    writeFileSync(tempFilePath, JSON.stringify(comprehensiveData, null, 2), 'utf8');
    
    logger?.log(`📁 Temp file created: ${tempFilePath}`);
    logger?.log(`📊 Dataset stats: ${scrapedContent.length} sources`);
    logger?.log(`🧹 Noise reduction: ${comprehensiveData.metadata.averageNoiseReduction}% average`);
    logger?.log(`📝 Content: ${comprehensiveData.metadata.originalContentLength} → ${comprehensiveData.metadata.totalContentLength} characters`);

    return tempFilePath;
  } catch (error: any) {
    logger?.error(`Failed to create temp file: ${error.message}`);
    return null;
  }
}

/**
 * Analyze the complete scraped dataset and create structured output
 */
async function analyzeCompleteDatasetAndStructure({
  tempFilePath,
  userQuery,
  numRows,
  logger
}: {
  tempFilePath: string;
  userQuery: string;
  numRows: number;
  logger?: WebScrapingLogger;
}): Promise<{
  success: boolean;
  data?: any[];
  schema?: Array<{ name: string; type: string }>;
  feedback?: string;
  error?: string;
}> {
  try {
    // Read the comprehensive dataset
    const comprehensiveData = JSON.parse(readFileSync(tempFilePath, 'utf8'));
    
    logger?.log(`📖 Reading comprehensive dataset: ${comprehensiveData.sources.length} sources`);
    logger?.log(`📝 Total content length: ${comprehensiveData.metadata.totalContentLength} characters`);

    // Use Gemini to analyze the complete dataset and create structured output
    const { geminiService } = await import('@/services/gemini-service');
    const combinedLen = String(comprehensiveData.combinedContent || '').length;
    const shouldChunk = combinedLen > 140000 || comprehensiveData.sources.length > 10;
    if (!shouldChunk) {
      logger?.log('🤖 Sending complete dataset to AI for analysis...');
      const analysisResult = await geminiService.analyzeCompleteDataset({
        userQuery,
        comprehensiveData,
        targetRows: numRows,
      });
      if (analysisResult.success && analysisResult.data.length > 0) {
        // If fewer rows than requested, perform a top-up pass over the full dataset
        let directRows = Array.isArray(analysisResult.data) ? [...analysisResult.data] : [];
        if (directRows.length < numRows) {
          logger?.log(`🔄 Direct analysis returned ${directRows.length}/${numRows} rows; attempting top-up extraction`);
          const sources = Array.isArray(comprehensiveData.sources) ? comprehensiveData.sources : [];
          const fullMd = sources.map((item: any) => `=== SOURCE ${item.id}: ${item.title} (${item.url}) ===\n${item.content}\n`).join('\n');
          const seen = new Set<string>(directRows.map(r => JSON.stringify(r)));
          let attempts = 0;
          while (directRows.length < numRows && attempts < 2) {
            const remaining = numRows - directRows.length;
            logger?.log(`🧪 Direct-path top-up attempt ${attempts + 1}: requesting up to ${remaining} more rows`);
            const resp = await geminiService.analyzeMarkdownContent(fullMd, userQuery, remaining);
            if (resp.success && resp.structuredData.data.length > 0) {
              let added = 0;
              for (const row of resp.structuredData.data) {
                const key = JSON.stringify(row || {});
                if (!seen.has(key)) {
                  directRows.push(row);
                  seen.add(key);
                  added++;
                  if (directRows.length >= numRows) break;
                }
              }
              logger?.log(`✅ Direct-path top-up attempt ${attempts + 1}: added ${added} rows (total ${directRows.length})`);
            } else {
              logger?.log(`⚠️ Direct-path top-up attempt ${attempts + 1} produced no rows`);
            }
            attempts++;
          }
          // Recompute schema over combined rows
          const allKeys = Array.from(new Set(directRows.flatMap(r => Object.keys(r || {}))));
          function infer(values: any[]): string {
            const nonNull = values.filter(v => v !== null && v !== undefined);
            if (nonNull.length === 0) return 'string';
            const boolCount = nonNull.filter(v => typeof v === 'boolean' || v === 'true' || v === 'false').length;
            if (boolCount === nonNull.length) return 'boolean';
            const numCount = nonNull.filter(v => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))).length;
            if (numCount === nonNull.length) return 'number';
            const dateCount = nonNull.filter(v => !isNaN(new Date(v as any).getTime())).length;
            if (dateCount === nonNull.length) return 'date';
            return 'string';
          }
          const unifiedSchema = allKeys.map(k => ({ name: k, type: infer(directRows.map(r => r ? r[k] : undefined)) }));
          const normalized = directRows.map(r => {
            const obj: Record<string, any> = {};
            for (const k of allKeys) obj[k] = r && k in r ? r[k] : '';
            return obj;
          });
          const limited = normalized.slice(0, numRows);
          logger?.success(`✅ AI analysis complete after top-up: ${limited.length} rows generated`);
          return {
            success: true,
            data: limited,
            schema: unifiedSchema,
            feedback: analysisResult.feedback,
          };
        }
        logger?.success(`✅ AI analysis complete: ${analysisResult.data.length} rows generated`);
        return {
          success: true,
          data: analysisResult.data,
          schema: analysisResult.schema,
          feedback: analysisResult.feedback,
        };
      }
      logger?.log(`⚠️ Direct analysis returned ${analysisResult.success ? '0 rows' : 'an error'} - falling back to chunked map-reduce`);
      // Fall through to chunked path
    }

    logger?.log('⚠️ Dataset is large. Using chunked map-reduce analysis to respect token limits...');
    const sources = Array.isArray(comprehensiveData.sources) ? comprehensiveData.sources : [];
    const chunkSize = Math.max(3, Math.ceil(sources.length / 4));
    const chunks: typeof sources[] = [];
    for (let i = 0; i < sources.length; i += chunkSize) {
      chunks.push(sources.slice(i, i + chunkSize));
    }
    const partialDatasets: { data: any[]; schema: Array<{ name: string; type: string }>; feedback?: string }[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const group = chunks[i];
      const md = group.map((item: any) => `=== SOURCE ${item.id}: ${item.title} (${item.url}) ===\n${item.content}\n`).join('\n');
      const target = Math.max(1, Math.round((group.length / Math.max(1, sources.length)) * numRows));
      logger?.log(`🧩 Analyzing chunk ${i + 1}/${chunks.length} with target ${target} rows...`);
      const resp = await geminiService.analyzeMarkdownContent(md, userQuery, target);
      if (resp.success && resp.structuredData.data.length > 0) {
        partialDatasets.push({ data: resp.structuredData.data, schema: (resp.structuredData.schema || []).map((c: any) => ({ name: String(c.name), type: String(c.type || 'string') })), feedback: resp.structuredData.reasoning });
        logger?.success(`✅ Chunk ${i + 1}: ${resp.structuredData.data.length} rows`);
      } else {
        logger?.log(`⚠️ Chunk ${i + 1} produced no rows`);
      }
    }
    const rows = partialDatasets.flatMap(p => p.data);

    // Top-up pass: if we have fewer rows than requested, try one or two more targeted analyses over the full dataset
    if (rows.length < numRows) {
      logger?.log(`🔄 Top-up analysis: have ${rows.length}/${numRows} rows; attempting to extract additional rows`);
      const sources = Array.isArray(comprehensiveData.sources) ? comprehensiveData.sources : [];
      const fullMd = sources.map((item: any) => `=== SOURCE ${item.id}: ${item.title} (${item.url}) ===\n${item.content}\n`).join('\n');
      const seen = new Set<string>(rows.map(r => JSON.stringify(r)));
      let attempts = 0;
      while (rows.length < numRows && attempts < 2) {
        const remaining = numRows - rows.length;
        logger?.log(`🧪 Top-up attempt ${attempts + 1}: requesting up to ${remaining} more rows`);
        const resp = await geminiService.analyzeMarkdownContent(fullMd, userQuery, remaining);
        if (resp.success && resp.structuredData.data.length > 0) {
          let added = 0;
          for (const row of resp.structuredData.data) {
            const key = JSON.stringify(row || {});
            if (!seen.has(key)) {
              rows.push(row);
              seen.add(key);
              added++;
              if (rows.length >= numRows) break;
            }
          }
          logger?.log(`✅ Top-up attempt ${attempts + 1}: added ${added} new rows (total ${rows.length})`);
        } else {
          logger?.log(`⚠️ Top-up attempt ${attempts + 1} produced no additional rows`);
        }
        attempts++;
      }
    }
    const allKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r || {}))));
    function infer(values: any[]): string {
      const nonNull = values.filter(v => v !== null && v !== undefined);
      if (nonNull.length === 0) return 'string';
      const boolCount = nonNull.filter(v => typeof v === 'boolean' || v === 'true' || v === 'false').length;
      if (boolCount === nonNull.length) return 'boolean';
      const numCount = nonNull.filter(v => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))).length;
      if (numCount === nonNull.length) return 'number';
      const dateCount = nonNull.filter(v => !isNaN(new Date(v as any).getTime())).length;
      if (dateCount === nonNull.length) return 'date';
      return 'string';
    }
    const unifiedSchema = allKeys.map(k => ({ name: k, type: infer(rows.map(r => r ? r[k] : undefined)) }));
    const normalizedRows = rows.map(r => {
      const obj: Record<string, any> = {};
      for (const k of allKeys) obj[k] = r && k in r ? r[k] : '';
      return obj;
    });
    const limited = normalizedRows.slice(0, numRows);
    logger?.success(`✅ Chunked analysis complete: ${limited.length} rows (from ${rows.length}) across ${unifiedSchema.length} columns`);
    return {
      success: true,
      data: limited,
      schema: unifiedSchema,
      feedback: partialDatasets.map(p => p.feedback).filter(Boolean).join(' | '),
    };
  } catch (error: any) {
    logger?.error(`Failed to analyze complete dataset: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate CSV from structured data
 */
function generateCSV(data: any[], schema: Array<{ name: string; type: string }>): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headers = schema.map(col => col.name);
  const csvRows = [headers.join(',')];

  // Create data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape CSV values (handle quotes and commas)
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Dump all scraped content to a markdown file for AI analysis
 */
async function dumpScrapedDataToMarkdown(
  scrapedContent: Array<{
    url: string;
    title: string;
    content: string;
  }>,
  userQuery: string,
  logger?: WebScrapingLogger
): Promise<string | null> {
  try {
    // Create temp directory if it doesn't exist
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Create a comprehensive markdown dataset file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const markdownFilePath = join(tempDir, `scraped-data-${timestamp}.md`);

    // Clean content before creating markdown
    const cleanedSources = scrapedContent.map((item, index) => {
      const cleanedContent = cleanContentForAI(item.content);
      return {
        id: index + 1,
        url: item.url,
        title: item.title,
        content: cleanedContent,
        contentLength: cleanedContent.length,
        wordCount: cleanedContent.split(/\s+/).length,
        originalLength: item.content.length,
        noiseReduction: Math.round(((item.content.length - cleanedContent.length) / item.content.length) * 100),
      };
    });

    // Create markdown content
    let markdownContent = `# Scraped Dataset Analysis\n\n`;
    markdownContent += `**User Query:** ${userQuery}\n\n`;
    markdownContent += `**Scraped At:** ${new Date().toISOString()}\n\n`;
    markdownContent += `**Total Sources:** ${scrapedContent.length}\n\n`;
    markdownContent += `**Total Content Length:** ${cleanedSources.reduce((sum, item) => sum + item.content.length, 0)} characters\n\n`;
    markdownContent += `**Average Noise Reduction:** ${Math.round(cleanedSources.reduce((sum, item) => sum + item.noiseReduction, 0) / cleanedSources.length)}%\n\n`;
    
    markdownContent += `## Scraped Content Sources\n\n`;
    
    // Add each source as a markdown section
    cleanedSources.forEach((source, index) => {
      markdownContent += `### Source ${source.id}: ${source.title}\n\n`;
      markdownContent += `**URL:** ${source.url}\n\n`;
      markdownContent += `**Content Length:** ${source.contentLength} characters (${source.wordCount} words)\n\n`;
      markdownContent += `**Noise Reduction:** ${source.noiseReduction}%\n\n`;
      markdownContent += `**Content:**\n\n`;
      markdownContent += `${source.content}\n\n`;
      markdownContent += `---\n\n`;
    });

    // Write to markdown file
    writeFileSync(markdownFilePath, markdownContent, 'utf8');
    
    logger?.log(`📁 Markdown file created: ${markdownFilePath}`);
    logger?.log(`📊 Dataset stats: ${scrapedContent.length} sources`);
    logger?.log(`🧹 Noise reduction: ${Math.round(cleanedSources.reduce((sum, item) => sum + item.noiseReduction, 0) / cleanedSources.length)}% average`);
    logger?.log(`📝 Content: ${cleanedSources.reduce((sum, item) => sum + item.originalLength, 0)} → ${cleanedSources.reduce((sum, item) => sum + item.contentLength, 0)} characters`);

    return markdownFilePath;
  } catch (error: any) {
    logger?.error(`Failed to create markdown file: ${error.message}`);
    return null;
  }
}

/**
 * Analyze the complete markdown dataset and create structured output
 */
async function analyzeCompleteMarkdownDataset({
  markdownFilePath,
  userQuery,
  numRows,
  logger
}: {
  markdownFilePath: string;
  userQuery: string;
  numRows: number;
  logger?: WebScrapingLogger;
}): Promise<{
  success: boolean;
  data?: any[];
  schema?: Array<{ name: string; type: string }>;
  feedback?: string;
  error?: string;
}> {
  try {
    // Read the markdown file
    const markdownContent = readFileSync(markdownFilePath, 'utf8');
    
    logger?.log(`📖 Reading markdown file: ${markdownContent.length} characters`);
    
    // Use Gemini to analyze the markdown content and generate structured data
    const geminiService = (await import('@/services/gemini-service')).geminiService;
    
    // Compute an effective target based on available content capacity
    const approxTokens = Math.ceil(markdownContent.length / 4);
    const capacityRows = Math.max(5, Math.floor(approxTokens / 400));
    const effectiveTarget = Math.max(5, Math.min(numRows, capacityRows));
    logger?.log(`🎯 Effective target rows: ${effectiveTarget} (requested ${numRows}, capacity ≈ ${capacityRows})`);

    logger?.log('🤖 Sending markdown content to AI for analysis...');
    const collected: any[] = [];
    const seen = new Set<string>();
    let feedback: string = '';

    // First attempt
    const first = await geminiService.analyzeMarkdownContent(markdownContent, userQuery, effectiveTarget);
    if (first.success && Array.isArray(first.structuredData.data)) {
      for (const row of first.structuredData.data) {
        const key = JSON.stringify(row || {});
        if (!seen.has(key)) {
          collected.push(row);
          seen.add(key);
        }
      }
      feedback = first.structuredData.reasoning || '';
      logger?.success(`✅ Markdown analysis: ${collected.length} rows`);
    } else {
      logger?.log(`⚠️ Markdown analysis returned no rows (${first.error || 'unknown error'})`);
    }

    // Top-up attempts if under target
    let attempts = 0;
    while (collected.length < effectiveTarget && attempts < 2) {
      const remaining = effectiveTarget - collected.length;
      logger?.log(`🔄 Markdown top-up attempt ${attempts + 1}: requesting up to ${remaining} more rows`);
      const resp = await geminiService.analyzeMarkdownContent(markdownContent, userQuery, remaining);
      if (resp.success && Array.isArray(resp.structuredData.data) && resp.structuredData.data.length > 0) {
        let added = 0;
        for (const row of resp.structuredData.data) {
          const key = JSON.stringify(row || {});
          if (!seen.has(key)) {
            collected.push(row);
            seen.add(key);
            added++;
            if (collected.length >= effectiveTarget) break;
          }
        }
        logger?.success(`✅ Top-up attempt ${attempts + 1}: added ${added} rows (total ${collected.length})`);
      } else {
        logger?.log(`⚠️ Top-up attempt ${attempts + 1} produced no rows`);
      }
      attempts++;
    }

    if (collected.length === 0) {
      throw new Error('No structured data generated from markdown');
    }

    // Unify schema across collected rows and normalize
    const allKeys = Array.from(new Set(collected.flatMap(r => Object.keys(r || {}))));
    function infer(values: any[]): string {
      const nonNull = values.filter(v => v !== null && v !== undefined);
      if (nonNull.length === 0) return 'string';
      const boolCount = nonNull.filter(v => typeof v === 'boolean' || v === 'true' || v === 'false').length;
      if (boolCount === nonNull.length) return 'boolean';
      const numCount = nonNull.filter(v => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))).length;
      if (numCount === nonNull.length) return 'number';
      const dateCount = nonNull.filter(v => !isNaN(new Date(v as any).getTime())).length;
      if (dateCount === nonNull.length) return 'date';
      return 'string';
    }
    const unifiedSchema = allKeys.map(k => ({ name: k, type: infer(collected.map(r => r ? r[k] : undefined)) }));
    const normalized = collected.map(r => {
      const obj: Record<string, any> = {};
      for (const k of allKeys) obj[k] = r && k in r ? r[k] : '';
      return obj;
    });

    return {
      success: true,
      data: normalized,
      schema: unifiedSchema,
      feedback,
    };
  } catch (error: any) {
    logger?.error(`Markdown analysis failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
