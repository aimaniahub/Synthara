'use server';

import { z } from 'zod';
import { generateSearchUrls } from './generate-search-urls-flow';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { SimpleAI } from '@/ai/simple-ai';
import { inferSchema } from '@/lib/data-processing/schema-inference';
import { generateCSV } from '@/lib/data-processing/csv-generator';
import { getWritableTempDir } from '@/lib/utils/fs-utils';

// Input validation schema
const IntelligentWebScrapingInputSchema = z.object({
  userQuery: z.string().min(1, 'User query is required'),
  numRows: z.number().min(1).max(300).default(300),
  maxUrls: z.number().min(1).max(15).default(10), // LIMITED TO 15 URLs MAX
  useAI: z.boolean().default(true),
  sessionId: z.string().optional(),
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
 * Best-effort extraction of rows from saved analyzed file
 */
function extractRowsFromAnalyzedFile(sessionId: string | undefined, logger?: WebScrapingLogger): Array<Record<string, any>> {
  try {
    if (!sessionId) return [];
    const analyzedDir = getWritableTempDir('analyzed');
    const analyzedPath = join(analyzedDir, `${sessionId}-ai-analysis.json`);
    if (!existsSync(analyzedPath)) return [];
    const raw = readFileSync(analyzedPath, { encoding: 'utf8' }).trim();

    // Strategy 1: parse full JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.data)) return parsed.data as Array<Record<string, any>>;
    } catch { }

    // Strategy 2: strip code fences
    let cleaned = raw;
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    cleaned = cleaned.trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.data)) return parsed.data as Array<Record<string, any>>;
    } catch { }

    // Strategy 3: extract data array substring
    try {
      const m = cleaned.match(/"data"\s*:\s*(\[[\s\S]*\])/);
      if (m && m[1]) {
        let dataSeg = m[1];
        dataSeg = dataSeg.replace(/,(\s*[\]}])/g, '$1');
        const wrapped = `{ "data": ${dataSeg} }`;
        const parsed = JSON.parse(wrapped);
        if (parsed && Array.isArray(parsed.data)) return parsed.data as Array<Record<string, any>>;
      }
    } catch { }

    // Strategy 4: first object/array
    try {
      const obj = cleaned.match(/\{[\s\S]*\}/);
      if (obj) {
        const parsed = JSON.parse(obj[0]);
        if (parsed && Array.isArray(parsed.data)) return parsed.data as Array<Record<string, any>>;
      }
      const arr = cleaned.match(/\[[\s\S]*\]/);
      if (arr) {
        const parsed = JSON.parse(arr[0]);
        if (Array.isArray(parsed)) return parsed as Array<Record<string, any>>;
      }
    } catch { }

    logger?.log(`No rows could be extracted from analyzed file for session ${sessionId}`);
    return [];
  } catch (e: any) {
    logger?.error(`Failed to read analyzed file: ${e.message}`);
    return [];
  }
}

/**
 * Write rows into chunk files under temp/chunks for resumable streaming
 */
function writeRowChunksToTemp(
  rows: Array<Record<string, any>>,
  schema: Array<{ name: string; type: string }>,
  sessionId: string | undefined,
  requestedRows: number | undefined,
  logger?: WebScrapingLogger
): { dir: string; count: number; size: number } | null {
  try {
    const chunksDir = getWritableTempDir('chunks');
    const sid = sessionId || new Date().getTime().toString();
    const chunkSize = 25;
    let count = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunkRows = rows.slice(i, i + chunkSize);
      const payload = {
        schema,
        rows: chunkRows,
        offset: i,
        totalRows: rows.length,
        chunkIndex: count,
        requestedRows: typeof requestedRows === 'number' ? requestedRows : rows.length,
      };
      const filePath = join(chunksDir, `${sid}-chunk-${count}.json`);
      writeFileSync(filePath, JSON.stringify(payload), 'utf8');
      count += 1;
    }
    logger?.log(`Chunked ${rows.length} rows into ${count} files @ ${chunksDir}`);
    return { dir: chunksDir, count, size: chunkSize };
  } catch (e: any) {
    logger?.error(`Failed writing row chunks: ${e.message}`);
    return null;
  }
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
        logger?.log('🔄 No content could be scraped from any URL');
        return {
          success: false,
          error: errorMsg,
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
          const existing = new Set(scrapedResults.map((r: { url: string }) => r.url));
          const uniqueNew = backfillResp.content.filter((r: { url: string }) => !existing.has(r.url));
          scrapedResults.push(...uniqueNew);
          logger?.log(`Backfill added ${uniqueNew.length} pages (total ${scrapedResults.length})`);
        } else {
          logger?.log(`Backfill batch produced no additional content`);
        }
      }
    }

    logger?.success(`Successfully scraped content from ${scrapedResults.length} pages`);
    const tempFilePath = await dumpScrapedDataToTempFile(
      scrapedResults,
      validatedInput.userQuery,
      logger,
      validatedInput.sessionId
    );
    if (tempFilePath) {
      logger?.log(`Scraped snapshot saved for reference at: ${tempFilePath}`);
    }

    if (!validatedInput.useAI) {
      const errorMsg = 'AI processing is disabled (useAI=false)';
      logger?.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
        urls: searchResult.urls.map(url => url.url),
        searchQueries: searchResult.searchQueries.map(q => q.query),
      };
    }

    // Step 3: Extract structured rows via Direct Snapshot Analysis (Gemini)
    logger?.log('Step 3: Extracting structured rows via Direct Analysis (Gemini)...');
    logger?.progress('AI Structuring', 3, 5, 'Analyzing scraped snapshot JSON');

    const geminiResult = await analyzeScrapedFileWithGemini(
      tempFilePath!,
      validatedInput.userQuery,
      validatedInput.numRows,
      logger,
      validatedInput.sessionId
    );

    if (!geminiResult.rows.length) {
      const errorMsg = 'AI analysis failed to generate data from scraped content';
      logger?.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
        urls: searchResult.urls.map(url => url.url),
        searchQueries: searchResult.searchQueries.map(q => q.query),
      };
    }

    const allRows = geminiResult.rows;
    const schema = inferSchema(allRows);

    const normalizedRows = allRows.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const col of schema) {
        obj[col.name] = row && col.name in row ? row[col.name] : '';
      }
      return obj;
    });

    const limitedRows = normalizedRows.slice(0, validatedInput.numRows);
    const csv = generateCSV(limitedRows, schema);

    logger?.log('Step 4: Saving CSV to output folder...');
    logger?.progress('Complete', 4, 5, 'Saving CSV file and finalizing');

    const chunkInfo = writeRowChunksToTemp(
      limitedRows,
      schema,
      validatedInput.sessionId,
      validatedInput.numRows,
      logger
    );

    const outputDir = getWritableTempDir('output');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFileName = `dataset-${timestamp}.csv`;
    const csvFilePath = join(outputDir, csvFileName);
    try {
      writeFileSync(csvFilePath, csv, 'utf8');
      logger?.success(`✅ SINGLE CSV saved to: ${csvFilePath}`);
      logger?.log(`📊 Final dataset: ${limitedRows.length} rows, ${schema.length} columns`);
    } catch (error) {
      logger?.error(`Failed to save CSV: ${error}`);
    }

    const resultSummary: IntelligentWebScrapingOutput = {
      success: true,
      data: limitedRows,
      csv,
      schema,
      urls: searchResult.urls.map(url => url.url),
      searchQueries: searchResult.searchQueries.map(q => q.query),
      feedback: 'Gemini direct analysis of scraped snapshot',
      metadata: {
        totalUrls: searchResult.urls.length,
        scrapedPages: scrapedResults.length,
        refinedSources: scrapedResults.length,
        generatedRows: limitedRows.length,
        timestamp: new Date().toISOString(),
        csvFilePath,
        sessionId: validatedInput.sessionId,
        scrapedRawFilePath: tempFilePath,
        chunkDir: chunkInfo?.dir,
        chunkCount: chunkInfo?.count,
        chunkSize: chunkInfo?.size,
        requestedRows: validatedInput.numRows,
      },
    };

    logger?.success(
      `🎉 Web scraping completed! Generated ${limitedRows.length} rows from ${searchResult.urls.length} URLs`
    );
    logger?.success(`📁 CSV saved to: ${csvFilePath}`);
    return resultSummary;

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
    const crawl4aiServiceUrl = process.env.CRAWL4AI_SERVICE_URL || process.env.CRAWL4AI_EXTRACT_URL || 'http://localhost:11235';
    logger?.log(`Using Crawl4AI service at: ${crawl4aiServiceUrl}`);

    // Test if the Crawl4AI service is available
    try {
      const healthCheck = await fetch(`${crawl4aiServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      if (!healthCheck.ok) {
        throw new Error(`Service health check failed: ${healthCheck.status}`);
      }
      logger?.log(`✅ Crawl4AI service is available`);
    } catch (healthError: any) {
      logger?.error(`❌ Crawl4AI service is not available: ${healthError.message}`);
      logger?.log(`🔄 Skipping scraping because Crawl4AI service is unavailable`);
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
                  browser_config: {},
                  crawler_config: {
                    extract_media: false,
                    extract_links: false,
                    extract_images: false,
                    extract_tables: true,
                    extract_markdown: true,
                    extract_clean_html: true,
                    extract_text: true,
                    wait_for: null,
                    timeout: 180000, // 3-minute timeout for scraping
                  },
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
      logger?.error('No content could be scraped from any URLs');
      return {
        success: false,
        content: [],
        error: 'No content could be scraped from any URLs',
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
  logger?: WebScrapingLogger,
  sessionId?: string
): Promise<string | null> {
  try {
    // Create temp directory which is environment-aware
    const tempDir = getWritableTempDir();
    const scrapedDir = getWritableTempDir('scraped');

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

    const metadata = {
      userQuery,
      scrapedAt: new Date().toISOString(),
      totalSources: scrapedContent.length,
      totalContentLength: cleanedSources.reduce((sum, item) => sum + item.content.length, 0),
      originalContentLength: scrapedContent.reduce((sum, item) => sum + item.content.length, 0),
      averageNoiseReduction: Math.round(cleanedSources.reduce((sum, item) => sum + item.noiseReduction, 0) / cleanedSources.length),
    };

    // Build a markdown-style "readme" similar to historical scraped-data-*.md files
    const headerLines: string[] = [
      '# Scraped Dataset Analysis',
      '',
      `**User Query:** ${JSON.stringify(userQuery)}`,
      '',
      `**Scraped At:** ${metadata.scrapedAt}`,
      '',
      `**Total Sources:** ${metadata.totalSources}`,
      '',
      `**Total Content Length:** ${metadata.totalContentLength} characters`,
      '',
      `**Average Noise Reduction:** ${metadata.averageNoiseReduction}%`,
      '',
      '## Scraped Content Sources',
      '',
    ];

    const sourceBlocks = cleanedSources.map(item => {
      return [
        `### Source ${item.id}: ${item.url}`,
        '',
        `**URL:** ${item.url}`,
        '',
        `**Content Length:** ${item.contentLength} characters (${item.wordCount} words)`,
        '',
        `**Noise Reduction:** ${item.noiseReduction}%`,
        '',
        '**Content:**',
        '',
        item.content,
        '',
        '---',
        '',
      ].join('\n');
    });

    const markdownCombined = headerLines.join('\n') + sourceBlocks.join('\n');

    const comprehensiveData = {
      metadata,
      sources: cleanedSources,
      combinedContent: markdownCombined,
    };

    // Write to temp file (JSON snapshot)
    writeFileSync(tempFilePath, JSON.stringify(comprehensiveData, null, 2), 'utf8');


    // Mirror the scraped JSON into an external backend directory for Synthara backend
    // using a lean payload (metadata + sources only).
    // DISABLED: This triggers broken polling in the frontend
    /*
    try {
      const backendDirEnv = process.env.SYNTHARA_BACKEND_SCRAPED_DIR;
      const backendBase =
        backendDirEnv && backendDirEnv.trim().length > 0
          ? backendDirEnv.trim()
          : 'C:\\Users\\punee\\OneDrive\\Desktop\\synthara backend extraction (2)\\synthara backend extraction\\scraped';

      if (backendBase) {
        if (!existsSync(backendBase)) {
          mkdirSync(backendBase, { recursive: true});
        }
        const backendFilePath = join(backendBase, `scraped-data-${timestamp}.json`);
        const backendPayload = {
          metadata,
          sources: cleanedSources,
        };
        writeFileSync(backendFilePath, JSON.stringify(backendPayload, null, 2), 'utf8');
        logger?.log(`Backend scraped JSON mirrored to: ${backendFilePath}`);
      }
    } catch (mirrorError: any) {
      logger?.error(`Failed to mirror scraped JSON to backend directory: ${mirrorError.message}`);
    }
    */


    // Additionally, if sessionId provided, write a raw combined content txt under temp/scraped
    let scrapedRawPath: string | null = null;
    if (sessionId) {
      scrapedRawPath = join(scrapedDir, `${sessionId}-raw-content.txt`);
      try {
        writeFileSync(scrapedRawPath, markdownCombined, 'utf8');
      } catch (e: any) {
        logger?.error(`Failed to save scraped raw content: ${e.message}`);
      }
    }

    logger?.log(`📁 Temp file created: ${tempFilePath}`);
    logger?.log(`📊 Dataset stats: ${scrapedContent.length} sources`);
    logger?.log(`🧹 Noise reduction: ${comprehensiveData.metadata.averageNoiseReduction}% average`);
    logger?.log(`📝 Content: ${comprehensiveData.metadata.originalContentLength} → ${comprehensiveData.metadata.totalContentLength} characters`);

    // Always return the JSON file path (not the .txt) so that analyzeScrapedFileWithGemini can parse it
    return tempFilePath;
  } catch (error: any) {
    logger?.error(`Failed to create temp file: ${error.message}`);
    return null;
  }
}

interface GeminiStructuredResult {
  rows: Array<Record<string, any>>;
  schema: Array<{ name: string; type: string }>;
  reasoning?: string;
  rawAiFilePath?: string;
  modelId: string;
}

/**
 * Main entry point - now uses Map-Reduce for multi-source extraction
 */
async function analyzeScrapedFileWithGemini(
  scrapedFilePath: string,
  userQuery: string,
  numRows: number,
  logger?: WebScrapingLogger,
  sessionId?: string
): Promise<GeminiStructuredResult> {
  const raw = readFileSync(scrapedFilePath, 'utf8');
  const modelId = process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free';

  logger?.log(`📂 Loading scraped data from: ${scrapedFilePath}`);

  // Parse the scraped JSON to extract individual sources
  let scrapedData: { sources?: Array<{ id: number; url: string; title: string; content: string }> };
  try {
    scrapedData = JSON.parse(raw);
  } catch (parseErr: any) {
    logger?.error(`Failed to parse scraped JSON: ${parseErr?.message}`);
    return { rows: [], schema: [], reasoning: 'Failed to parse scraped data', modelId };
  }

  const sources = scrapedData.sources || [];

  if (sources.length === 0) {
    logger?.error('No sources found in scraped data');
    return { rows: [], schema: [], reasoning: 'No sources found in scraped data', modelId };
  }

  logger?.info(`📊 Found ${sources.length} sources with total content length: ${sources.reduce((sum, s) => sum + (s.content?.length || 0), 0).toLocaleString()} characters`);

  // Reverting to single-file analysis logic (as requested: "instead of mapping and logic")
  // Using SimpleAI.structureRelevantChunksToDataset which handles character limits and single prompt extraction
  const result = await SimpleAI.structureRelevantChunksToDataset({
    chunks: sources.map(s => ({
      url: s.url,
      title: s.title,
      content: s.content
    })),
    userQuery,
    numRows,
    sessionId: sessionId || `session-${Date.now()}`,
    logger
  });

  // Save raw AI analysis result
  try {
    const analyzedDir = getWritableTempDir('analyzed');
    const sid = sessionId || Date.now().toString();
    const analyzedPath = join(analyzedDir, `${sid}-ai-analysis.json`);

    // SimpleAI already saves to analyzedPath if sessionId is provided, 
    // but we ensure it matches the expected return format here.

    return {
      rows: result.data,
      schema: result.schema,
      reasoning: result.reasoning || '',
      rawAiFilePath: result.rawFilePath || analyzedPath,
      modelId,
    };
  } catch (saveErr: any) {
    console.error(`[analyzeScrapedFileWithGemini] Error finalizing result: ${saveErr?.message}`);
    return {
      rows: result.data,
      schema: result.schema,
      reasoning: result.reasoning || '',
      rawAiFilePath: result.rawFilePath,
      modelId,
    };
  }
}




