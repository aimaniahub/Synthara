'use server';

import { z } from 'zod';
import { crawl4aiService, type Crawl4AIRequest } from '@/services/crawl4ai-service';
import { jsonToCsv } from './generate-data-flow';

// Input validation schema
const SimpleWebFlowInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  numRows: z.number().min(1).max(100).default(25),
  urls: z.array(z.string().url()).optional(),
  useAI: z.boolean().default(false),
  aiModel: z.string().optional(),
  aiApiKey: z.string().optional(),
});

const SimpleWebFlowOutputSchema = z.object({
  success: z.boolean(),
  data: z.array(z.record(z.any())),
  csv: z.string(),
  feedback: z.string(),
  tablesFound: z.number(),
  error: z.string().optional(),
});

export type SimpleWebFlowInput = z.infer<typeof SimpleWebFlowInputSchema>;
export type SimpleWebFlowOutput = z.infer<typeof SimpleWebFlowOutputSchema>;

/**
 * Simple web data generation using Crawl4AI
 * Replaces the complex generate-from-web-flow with a much simpler approach
 */
export async function generateFromWeb(input: SimpleWebFlowInput): Promise<SimpleWebFlowOutput> {
  console.log(`[SimpleWebFlow] Starting web generation with prompt: "${input.prompt.substring(0, 100)}..."`);
  console.log(`[SimpleWebFlow] Target rows: ${input.numRows}`);
  console.log(`[SimpleWebFlow] URLs provided: ${input.urls?.length || 0}`);

  try {
    // Validate input
    const validatedInput = SimpleWebFlowInputSchema.parse(input);
    
    // Check if Crawl4AI service is available
    const isHealthy = await crawl4aiService.healthCheck();
    if (!isHealthy) {
      throw new Error('Crawl4AI service is not available. Please ensure the Python service is running.');
    }

    // Prepare URLs - use provided URLs or generate some default ones based on prompt
    let urls: string[] = [];
    
    if (validatedInput.urls && validatedInput.urls.length > 0) {
      urls = validatedInput.urls;
      console.log(`[SimpleWebFlow] Using provided URLs: ${urls.length}`);
    } else {
      // Generate some default URLs based on the prompt
      urls = generateDefaultUrls(validatedInput.prompt);
      console.log(`[SimpleWebFlow] Generated default URLs: ${urls.length}`);
    }

    if (urls.length === 0) {
      throw new Error('No URLs provided and unable to generate default URLs');
    }

    // Extract data using Crawl4AI
    const crawlRequest: Crawl4AIRequest = {
      urls,
      prompt: validatedInput.prompt,
      numRows: validatedInput.numRows,
      useAI: validatedInput.useAI,
      aiModel: validatedInput.aiModel,
      aiApiKey: validatedInput.aiApiKey,
    };

    const result = await crawl4aiService.extractData(crawlRequest);

    if (!result.success) {
      throw new Error(result.error || 'Crawl4AI extraction failed');
    }

    // Generate CSV if not provided by Crawl4AI
    let csv = result.csv;
    if (!csv && result.data.length > 0) {
      csv = await jsonToCsv(result.data);
    }

    console.log(`[SimpleWebFlow] Generation completed successfully:`, {
      dataLength: result.data.length,
      csvLength: csv.length,
      tablesFound: result.tablesFound
    });

    return {
      success: true,
      data: result.data,
      csv,
      feedback: result.feedback,
      tablesFound: result.tablesFound,
    };

  } catch (error: any) {
    console.error('[SimpleWebFlow] Error:', error);
    return {
      success: false,
      data: [],
      csv: '',
      feedback: '',
      tablesFound: 0,
      error: error.message,
    };
  }
}

/**
 * Generate default URLs based on the user prompt
 * This is a simple implementation - you can enhance this based on your needs
 */
function generateDefaultUrls(prompt: string): string[] {
  const urls: string[] = [];
  
  // Extract key terms from prompt
  const promptLower = prompt.toLowerCase();
  
  // Add some common data sources based on prompt content
  if (promptLower.includes('movie') || promptLower.includes('film')) {
    urls.push('https://www.imdb.com/chart/top/');
    urls.push('https://en.wikipedia.org/wiki/List_of_films_by_year');
  } else if (promptLower.includes('product') || promptLower.includes('item')) {
    urls.push('https://www.amazon.com/bestsellers');
    urls.push('https://en.wikipedia.org/wiki/List_of_best-selling_products');
  } else if (promptLower.includes('country') || promptLower.includes('nation')) {
    urls.push('https://en.wikipedia.org/wiki/List_of_countries_and_dependencies_by_population');
    urls.push('https://www.worldometers.info/world-population/population-by-country/');
  } else if (promptLower.includes('company') || promptLower.includes('business')) {
    urls.push('https://en.wikipedia.org/wiki/List_of_largest_companies_by_revenue');
    urls.push('https://fortune.com/fortune500/');
  } else {
    // Generic data sources
    urls.push('https://en.wikipedia.org/wiki/Main_Page');
    urls.push('https://www.example.com');
  }
  
  return urls;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateFromWeb instead
 */
export async function generateFromWebFlow(input: SimpleWebFlowInput): Promise<SimpleWebFlowOutput> {
  console.warn('[SimpleWebFlow] generateFromWebFlow is deprecated, use generateFromWeb instead');
  return generateFromWeb(input);
}
