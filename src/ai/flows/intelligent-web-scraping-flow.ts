'use server';

import { z } from 'zod';
import { generateSearchUrls } from './generate-search-urls-flow';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Input validation schema
const IntelligentWebScrapingInputSchema = z.object({
  userQuery: z.string().min(1, 'User query is required'),
  numRows: z.number().min(1).max(100).default(50),
  maxUrls: z.number().min(1).max(4).default(4), // LIMITED TO 4 URLs MAX
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
    logger?.log('🔍 Step 1: Generating search queries and finding relevant URLs...');
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

    // Step 2: Scrape ALL content from URLs using Crawl4AI (wait for ALL to complete)
    logger?.log('🕷️ Step 2: Scraping ALL content from web pages...');
    logger?.progress('Web Scraping', 2, 6, 'Extracting raw content from all URLs - WAITING FOR ALL TO COMPLETE');

    const scrapedContent = await scrapeUrlsWithCrawl4AI(
      searchResult.urls.map(url => url.url),
      logger
    );

    if (!scrapedContent.success || scrapedContent.content.length === 0) {
      const errorMsg = `Failed to scrape content: ${scrapedContent.error || 'No content extracted'}`;
      logger?.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
        urls: searchResult.urls.map(url => url.url),
        searchQueries: searchResult.searchQueries.map(q => q.query),
      };
    }

    logger?.success(`Successfully scraped content from ${scrapedContent.content.length} pages`);

    // Step 3: Dump ALL scraped data to markdown file for AI analysis
    logger?.log('📝 Step 3: Creating comprehensive markdown dataset...');
    logger?.progress('Data Preparation', 3, 6, 'Dumping ALL scraped content to markdown file');

    const markdownFilePath = await dumpScrapedDataToMarkdown(
      scrapedContent.content, 
      validatedInput.userQuery, 
      logger
    );
    
    if (!markdownFilePath) {
      const errorMsg = 'Failed to create markdown dataset file';
      logger?.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
        urls: searchResult.urls.map(url => url.url),
        searchQueries: searchResult.searchQueries.map(q => q.query),
      };
    }

    logger?.success(`All scraped data saved to markdown file: ${markdownFilePath}`);

    // Step 4: Let AI analyze the complete markdown dataset and create structured output
    // CRITICAL: This should only happen ONCE after ALL scraping is complete
    logger?.log('🧠 Step 4: AI analyzing complete markdown dataset...');
    logger?.log(`📊 Dataset contains ${scrapedContent.content.length} scraped sources`);
    logger?.progress('AI Analysis', 4, 6, 'Processing comprehensive markdown data - SINGLE ANALYSIS');

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
        urls: searchResult.urls.map(url => url.url),
        searchQueries: searchResult.searchQueries.map(q => q.query),
      };
    }

    logger?.success(`AI generated ${structuredData.data.length} rows from complete dataset analysis`);

    // Step 5: Generate CSV
    logger?.log('📄 Step 5: Generating CSV format...');
    logger?.progress('CSV Generation', 5, 6, 'Creating downloadable CSV');

    const csv = generateCSV(structuredData.data, structuredData.schema || []);

    // Step 6: Save CSV to output folder and finalize
    // CRITICAL: Only create ONE CSV file after all processing is complete
    logger?.log('💾 Step 6: Saving CSV to output folder...');
    logger?.log(`📄 Creating SINGLE CSV file with ${structuredData.data.length} rows`);
    logger?.progress('Complete', 6, 6, 'Saving SINGLE CSV file and finalizing');

    // Save CSV to output folder
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

    // Clean up markdown file
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
        scrapedPages: scrapedContent.content.length,
        refinedSources: scrapedContent.content.length, // All sources were used
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

    const scrapedContent: Array<{
      url: string;
      title: string;
      content: string;
    }> = [];

    // Process URLs in batches to avoid overwhelming the service
    // IMPORTANT: Wait for ALL URLs to be scraped before proceeding
    const batchSize = 3;
    logger?.log(`🔄 Starting batch processing of ${urls.length} URLs in batches of ${batchSize}`);
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      logger?.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(urls.length / batchSize)}: ${batch.length} URLs`);

      const batchPromises = batch.map(async (url) => {
        try {
          logger?.log(`Scraping: ${url}`);
          
          const response = await fetch(`${crawl4aiServiceUrl}/crawl`, {
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
                timeout: 30000,
                // Additional options for better content extraction
                remove_forms: true,
                remove_scripts: true,
                remove_styles: true,
                remove_comments: true,
              }
            }),
          });

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
            
            // 5. If still no content, log warning
            if (!contentString) {
              logger?.error(`❌ No usable content found for ${url}`);
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
          logger?.error(`Failed to scrape ${url}: ${error.message}`);
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
      logger?.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed: ${validResults.length}/${batch.length} successful`);
    }

    // CRITICAL: Ensure ALL URLs have been processed before proceeding
    logger?.log(`🎯 Scraping complete: ${scrapedContent.length}/${urls.length} URLs successfully scraped`);
    
    if (scrapedContent.length === 0) {
      return {
        success: false,
        content: [],
        error: 'No content could be scraped from any URLs',
      };
    }

    // Only proceed if we have scraped content from at least some URLs
    if (scrapedContent.length < urls.length) {
      logger?.log(`⚠️ Warning: Only scraped ${scrapedContent.length} out of ${urls.length} URLs, but proceeding with available data`);
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
    
    logger?.log('🤖 Sending complete dataset to AI for analysis...');
    
    const analysisResult = await geminiService.analyzeCompleteDataset({
      userQuery,
      comprehensiveData,
      targetRows: numRows,
    });

    if (!analysisResult.success) {
      throw new Error(analysisResult.error || 'AI analysis failed');
    }

    logger?.success(`✅ AI analysis complete: ${analysisResult.data.length} rows generated`);

    return {
      success: true,
      data: analysisResult.data,
      schema: analysisResult.schema,
      feedback: analysisResult.feedback,
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
    
    logger?.log('🤖 Sending markdown content to AI for analysis...');
    
    const analysisResult = await geminiService.analyzeMarkdownContent(
      markdownContent,
      userQuery,
      numRows
    );

    if (!analysisResult.success) {
      throw new Error(`AI analysis failed: ${analysisResult.error}`);
    }

    logger?.success(`AI generated ${analysisResult.structuredData.data.length} rows from markdown analysis`);
    logger?.log(`Schema: ${analysisResult.structuredData.schema.map(s => s.name).join(', ')}`);

    return {
      success: true,
      data: analysisResult.structuredData.data,
      schema: analysisResult.structuredData.schema,
      feedback: analysisResult.structuredData.reasoning,
    };
  } catch (error: any) {
    logger?.error(`Markdown analysis failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
