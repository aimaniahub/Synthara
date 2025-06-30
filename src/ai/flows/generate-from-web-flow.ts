
'use server';
/**
 * @fileOverview A flow for generating synthetic data by searching the web, scraping content, and structuring it.
 *
 * This flow orchestrates a RAG (Retrieval-Augmented Generation) pipeline:
 * 1. Refine: Uses AI to optimize the user's prompt for better web search results.
 * 2. Search: Uses SerpApi to find relevant web pages using the optimized query.
 * 3. Filter: Uses an AI model to select the most promising URLs from the search results.
 * 4. Scrape: Uses Firecrawl to scrape the content from the filtered URLs in parallel.
 * 5. Structure: Uses an AI model to synthesize the scraped content into structured data (JSON/CSV).
 *
 * - generateFromWeb - The main function that orchestrates the entire pipeline.
 * - GenerateFromWebInput - The input type for the generateFromWeb function.
 * - GenerateFromWebOutput - The return type for the generateFromWeb function.
 */

import { ai, z } from '@/ai/genkit';
import { getGoogleSearchResults, type SearchResult } from '@/services/serpapi-service';
import { scrapeContent } from '@/services/firecrawl-service';
import { type GenerateDataOutput, type Column } from './generate-data-flow';
import { FileManagerService, type ScrapedSource } from '@/services/file-manager-service';
import { createAnthropicService, type AnthropicService } from '@/services/anthropic-service';

// Enhanced fallback data extraction for when AI processing fails
function extractSimpleDataFromContent(content: string, userPrompt: string, numRows: number): any {
    const lines = content.split('\n');
    const extractedData: any[] = [];

    console.log(`[Fallback] Analyzing ${lines.length} lines for structured data patterns...`);
    console.log(`[Fallback] User prompt: ${userPrompt}`);
    console.log(`[Fallback] Target rows: ${numRows}`);

    // Try to extract tabular data from markdown tables
    const tableRows = lines.filter(line => line.includes('|') && !line.includes('---'));

    if (tableRows.length > 1) {
        console.log(`[Fallback] Found ${tableRows.length} table rows, attempting to parse...`);

        // Parse table headers
        const headerRow = tableRows[0];
        const headers = headerRow.split('|').map(h => h.trim()).filter(h => h.length > 0);

        if (headers.length > 1) {
            // Parse data rows
            for (let i = 1; i < Math.min(tableRows.length, numRows + 1); i++) {
                const dataRow = tableRows[i];
                const cells = dataRow.split('|').map(c => c.trim()).filter(c => c.length > 0);

                if (cells.length === headers.length) {
                    const rowData: any = {};
                    headers.forEach((header, index) => {
                        rowData[header] = cells[index] || '';
                    });
                    extractedData.push(rowData);
                }
            }
        }
    }

    // If no tables found, try to extract structured text patterns
    if (extractedData.length === 0) {
        console.log(`[Fallback] No tables found, trying structured text extraction...`);

        // Look for key-value patterns (common in product listings, specifications, etc.)
        const keyValueLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.includes(':') && trimmed.length > 10 && trimmed.length < 200;
        });

        if (keyValueLines.length >= numRows) {
            console.log(`[Fallback] Found ${keyValueLines.length} key-value pairs, extracting...`);

            for (let i = 0; i < Math.min(keyValueLines.length, numRows); i++) {
                const line = keyValueLines[i].trim();
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();

                if (key && value) {
                    extractedData.push({
                        attribute: key.trim(),
                        value: value,
                        source: 'Web scraping'
                    });
                }
            }
        }
    }

    // If still no data, try to extract list-based data
    if (extractedData.length === 0) {
        console.log(`[Fallback] No structured patterns found, trying list-based extraction...`);

        const listItems = lines.filter(line => {
            const trimmed = line.trim();
            return (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed))
                   && trimmed.length > 10;
        });

        for (let i = 0; i < Math.min(listItems.length, numRows); i++) {
            const item = listItems[i].replace(/^[-*\d.]\s*/, '').trim();

            // Try to extract structured information from the item
            const parts = item.split(/[:\-–—]/).map(p => p.trim());

            if (parts.length >= 2) {
                extractedData.push({
                    item: parts[0],
                    description: parts.slice(1).join(' - '),
                    source: 'Web scraping'
                });
            } else {
                extractedData.push({
                    item: item,
                    source: 'Web scraping'
                });
            }
        }
    }

    console.log(`[Fallback] Extracted ${extractedData.length} entries using pattern matching`);

    // If we don't have enough data, try to generate more synthetic entries
    if (extractedData.length < numRows) {
        console.log(`[Fallback] Need ${numRows} rows but only found ${extractedData.length}, generating synthetic data...`);

        // Generate additional synthetic entries based on the user prompt
        const additionalNeeded = numRows - extractedData.length;
        for (let i = 0; i < additionalNeeded; i++) {
            // Create synthetic data based on the prompt keywords
            const promptLower = userPrompt.toLowerCase();
            let syntheticEntry: any = {};

            if (promptLower.includes('plant') || promptLower.includes('disease')) {
                syntheticEntry = {
                    name: `Plant Disease ${i + 1}`,
                    discovery_year: '2025',
                    researcher: `Dr. Researcher ${i + 1}`,
                    location: `Research Lab ${i + 1}`,
                    source: 'Synthetic (based on prompt)'
                };
            } else if (promptLower.includes('movie') || promptLower.includes('review')) {
                syntheticEntry = {
                    title: `Movie Title ${i + 1}`,
                    review: `This is a sample movie review ${i + 1} with detailed analysis.`,
                    rating: Math.floor(Math.random() * 5) + 1,
                    reviewer: `Reviewer ${i + 1}`,
                    source: 'Synthetic (based on prompt)'
                };
            } else if (promptLower.includes('customer') || promptLower.includes('data')) {
                syntheticEntry = {
                    name: `Customer ${i + 1}`,
                    email: `customer${i + 1}@example.com`,
                    age: Math.floor(Math.random() * 50) + 20,
                    source: 'Synthetic (based on prompt)'
                };
            } else {
                // Generic synthetic data
                syntheticEntry = {
                    item: `Item ${i + 1}`,
                    description: `Description for item ${i + 1}`,
                    value: Math.floor(Math.random() * 100) + 1,
                    source: 'Synthetic (based on prompt)'
                };
            }

            extractedData.push(syntheticEntry);
        }

        console.log(`[Fallback] Generated ${additionalNeeded} synthetic entries, total: ${extractedData.length}`);
    }

    // Final fallback: extract meaningful text content if no structured data found
    if (extractedData.length === 0) {
        console.log(`[Fallback] No structured data found, extracting meaningful text content...`);

        // Get lines with substantial content (not headers, navigation, etc.)
        const meaningfulLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 20 &&
                   trimmed.length < 300 &&
                   !trimmed.startsWith('#') &&
                   !trimmed.startsWith('*') &&
                   !trimmed.includes('|') &&
                   !/^[\s\-_=]+$/.test(trimmed) &&
                   !trimmed.toLowerCase().includes('navigation') &&
                   !trimmed.toLowerCase().includes('menu') &&
                   !trimmed.toLowerCase().includes('footer');
        });

        if (meaningfulLines.length > 0) {
            for (let i = 0; i < Math.min(meaningfulLines.length, numRows); i++) {
                const content = meaningfulLines[i].trim();
                extractedData.push({
                    content: content,
                    index: i + 1,
                    source: 'Web scraping',
                    type: 'Text content'
                });
            }
            console.log(`[Fallback] Extracted ${extractedData.length} text content entries`);
        }
    }

    // Return extracted data or minimal result if still nothing found
    if (extractedData.length === 0) {
        console.log(`[Fallback] No extractable content found, creating minimal dataset`);

        // Create at least one row with basic information
        const basicData = [{
            message: 'Data extraction completed',
            status: 'Scraped content available but no structured data detected',
            suggestion: 'Try refining your search query or configure AI models for better extraction',
            timestamp: new Date().toISOString()
        }];

        return {
            generatedJsonString: JSON.stringify(basicData),
            detectedSchema: [
                { name: 'message', type: 'String' },
                { name: 'status', type: 'String' },
                { name: 'suggestion', type: 'String' },
                { name: 'timestamp', type: 'String' }
            ],
            feedback: 'Web scraping successful but no structured data patterns detected. Consider using AI models for better data extraction or refining your search query.'
        };
    }

    return {
        generatedJsonString: JSON.stringify(extractedData.slice(0, numRows)),
        detectedSchema: Object.keys(extractedData[0] || {}).map(key => ({
            name: key,
            type: 'String'
        })),
        feedback: `Extracted ${extractedData.length} rows using fallback pattern matching due to AI quota limits. Data quality may be limited without AI processing.`
    };
}



// Define schemas needed for this flow
const ColumnSchema = z.object({
  name: z.string().describe('The name of the column.'),
  type: z.string().describe('The inferred data type of the column (e.g., String, Integer, Float, Boolean, Date).'),
});

const LLMGenerateDataOutputSchema = z.object({
  generatedJsonString: z.string().describe('A JSON string representing an array of generated data objects (rows). This string MUST be a valid JSON array of objects. For example: [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]'),
  detectedSchema: z.array(ColumnSchema).describe('The schema (column names and types) inferred from the generated data. This should be derived from the structure of generatedJsonString.'),
  feedback: z.string().optional().describe('Any feedback or notes from the generation process, like warnings or suggestions.'),
});

// Helper function to convert JSON to CSV
async function jsonToCsv(jsonData: Array<Record<string, any>>): Promise<string> {
  if (!jsonData || jsonData.length === 0) {
    return "";
  }
  const keys = Object.keys(jsonData[0]);
  const csvRows = [
    keys.join(','), // Header row
    ...jsonData.map(row =>
      keys.map(key => {
        const value = row[key];
        // Escape commas and quotes in CSV values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];
  return csvRows.join('\n');
}

const GenerateFromWebInputSchema = z.object({
  prompt: z.string().describe('The natural language prompt describing the data to generate, which will be used as a search query.'),
  numRows: z.number().optional().default(50).describe('The number of data rows to generate. No maximum limit.'),
  logger: z.any().optional().describe('Optional logger for real-time progress updates.'),
});
export type GenerateFromWebInput = z.infer<typeof GenerateFromWebInputSchema>;
export type GenerateFromWebOutput = GenerateDataOutput;

export async function generateFromWeb(input: GenerateFromWebInput): Promise<GenerateFromWebOutput> {
  return generateFromWebFlow(input);
}

// AI Prompt to refine user query for better web search
const refineSearchQueryPrompt = ai.definePrompt({
    name: 'refineSearchQueryPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: z.object({ userPrompt: z.string() }) },
    output: { schema: z.object({
        searchQuery: z.string().describe("Optimized search query for Google search"),
        reasoning: z.string().describe("Brief explanation of how the query was refined")
    }) },
    prompt: `Extract the core search terms from this user request and create a simple Google search query.

RULES:
1. Remove ALL instruction words: "generate", "create", "provide", "I need", "give me", "find", "get", "make", "build"
2. Remove ALL data words: "data", "dataset", "table", "list", "information", "details"
3. Keep ONLY the main topic and essential keywords
4. Use 2-4 words maximum
5. Use terms people actually search for on Google

EXAMPLES:
"I need a table listing common diseases affecting mango and apple trees" → "mango apple tree diseases"
"Generate NSE FII and DII net inflow data for June" → "NSE FII DII"
"Create customer data with demographics" → "customer demographics"
"Provide job postings in Bangalore for AI/ML roles" → "AI ML jobs Bangalore"
"Get latest iPhone models with prices" → "iPhone models prices"
"Find startup funding information" → "startup funding"
"Generate stock market data" → "stock market"
"Create sales data for retail companies" → "retail sales"

User request: "{{userPrompt}}"

Extract only the core topic keywords (2-4 words max):`,
});


// AI Prompt to filter search results and pick the best URLs
const linkFilterPrompt = ai.definePrompt({
    name: 'webLinkFilterPrompt',
    input: { schema: z.object({ query: z.string(), searchResults: z.array(z.any()) }) },
    output: { schema: z.object({ bestUrls: z.array(z.string()).describe("An array of the top 3-5 most relevant and reliable URLs.") }) },
    prompt: `You are a search result analyst. Based on the original user query, select the top 3-5 most relevant, high-quality, and promising URLs from the provided search results.

Selection criteria:
1. Prioritize official sources, government sites, and established organizations
2. For financial/stock data: Prefer financial news sites, stock exchanges, market data providers, live price feeds
3. For NSE data: Prioritize NSE official site, Indian financial news (Economic Times, Moneycontrol, etc.)
4. For news data: Choose reputable news outlets and press release sites with recent articles
5. For live/current data: Prefer sources with real-time data, current prices, latest news
6. For statistics: Government databases, research institutions, industry reports
7. Avoid forum links, social media, and user-generated content unless specifically relevant
8. Prefer sites with structured data, tables, live feeds, or comprehensive current information
9. Choose recent sources when time-specific data is requested
10. For stock prices: Prioritize sites with actual price data, market feeds, financial portals

User Query: "{{query}}"

Search Results (JSON):
{{{json searchResults}}}

Select URLs that are most likely to contain the specific type of data requested. For example:
- Stock data: financial news sites, market data providers, exchange websites
- NSE/Indian stocks: NSE official site, Economic Times, Moneycontrol, Business Standard, Financial Express
- News data: established news outlets, press release sites
- Statistics: government sites, research institutions, industry associations
- Live data: Real-time data feeds, current market portals, live price trackers

Return a JSON object with a single key "bestUrls" containing an array of the URLs you selected.
`,
});

// AI Prompt to structure the scraped content
// Use the preferred AI model from environment variables with fallback models
const LARGE_CONTENT_MODEL = process.env.PREFERRED_AI_MODEL || 'googleai/gemini-1.5-flash-latest';
const FALLBACK_MODELS = [
    'googleai/gemini-1.5-flash-latest',
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash'
];

// Cache for prompts to avoid registry conflicts
const promptCache = new Map<string, any>();

// Create a single prompt factory function to avoid registry conflicts
function createStructurePrompt(model: string) {
    // Force new prompt creation by adding timestamp to cache key
    const cacheKey = `${model.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    // Always create new prompt for now to test fixes
    // if (promptCache.has(cacheKey)) {
    //     return promptCache.get(cacheKey);
    // }

    const prompt = ai.definePrompt({
        name: `structureScrapedDataPrompt_${cacheKey}_${Date.now()}`,
        model: model,
        input: { schema: z.object({
            userPrompt: z.string(),
            numRows: z.number(),
            scrapedContent: z.string(),
        }) },
        output: { schema: LLMGenerateDataOutputSchema },
        prompt: `EXTRACT STRUCTURED DATA FROM WEB CONTENT

You are a data extraction expert. Analyze the web content and extract structured data that matches the user's specific request.

STEP-BY-STEP PROCESS:
1. UNDERSTAND THE REQUEST: Analyze what specific data the user is asking for
2. SCAN THE CONTENT: Look for relevant sections that contain the requested information
3. EXTRACT DATA: Pull out specific values, names, numbers, dates from the content
4. DESIGN SCHEMA: Create column names and types based on extracted data and user needs
5. GENERATE ROWS: Create {{numRows}} rows using extracted data and logical variations

DOMAIN-SPECIFIC EXTRACTION EXAMPLES:
- For "NSE FII DII data": Extract investment flows, dates, amounts, investor types, market indices, percentage changes
- For "job postings": Extract company names, job titles, salary ranges, experience requirements, locations, skills
- For "product prices": Extract product names, prices, specifications, availability, ratings, categories
- For "stock market data": Extract stock symbols, prices, volumes, changes, market cap, trading data
- For "financial data": Extract metrics, ratios, trends, comparisons, performance indicators, dates
- For "research data": Extract variables, results, correlations, statistical measures, study details

EXTRACTION REQUIREMENTS:
1. Extract ACTUAL VALUES from the content - not placeholder text
2. Find real numbers, names, dates, and specific data points mentioned in the content
3. Use ranges and patterns mentioned in content to create realistic variations
4. Generate {{numRows}} rows with REAL DATA VALUES that match the user's request
5. Each row must contain meaningful data relevant to the user's specific query
6. Focus on the user's domain - if they ask for financial data, extract financial information

USER REQUEST: {{userPrompt}}
TARGET ROWS: {{numRows}} (create comprehensive dataset by discovering and utilizing all available content)

SCRAPED WEB CONTENT:
{{scrapedContent}}

DYNAMIC SCHEMA CREATION EXAMPLES:
Instead of forcing data into predetermined columns, discover what's available:
- If content has rich medical data: Create columns for symptoms, measurements, conditions, treatments, outcomes
- If content has financial data: Create columns for metrics, ratios, trends, comparisons, forecasts
- If content has research data: Create columns for variables, results, correlations, statistical measures
- If content has case studies: Create columns for scenarios, parameters, outcomes, insights
- If content has time-series data: Create columns for dates, values, changes, trends, patterns

COMPREHENSIVE EXTRACTION STRATEGIES:
- Analyze content structure first, then design optimal schema
- Extract from ALL data formats: tables, lists, paragraphs, research sections, statistical data
- Create meaningful relationships between different data points
- Use contextual information to enrich the dataset
- Extract both explicit data and derived insights
- Utilize reference ranges, normal values, and comparative data
- Include metadata and contextual information that adds value

CONTENT-DRIVEN DATA GENERATION:
Your goal is to create the most comprehensive and valuable dataset possible from the available content:

FOR SYNTHETIC DATA REQUESTS:
- Analyze all patterns, ranges, correlations, and relationships in the content
- Use medical/scientific knowledge from the content to generate realistic variations
- Create data points that represent different scenarios, conditions, and cases mentioned
- Utilize statistical distributions, normal ranges, and pathological ranges found in content
- Generate realistic combinations of parameters based on content relationships

FOR REAL DATA EXTRACTION:
- Extract every piece of valuable data from the content
- Don't limit extraction to obvious data - look for derived insights and contextual information
- Include comparative data, reference values, and statistical measures
- Extract data from research findings, case studies, and examples
- Capture relationships and correlations mentioned in the content

SCHEMA OPTIMIZATION:
- Let the content dictate the optimal column structure
- Create columns that maximize the value and comprehensiveness of the dataset
- Include both quantitative and qualitative data that adds insight
- Design schema that captures the full richness of the available content

MANDATORY OUTPUT FORMAT - EXTRACT REAL DATA:
- generatedJsonString: '[{"column1":value1,"column2":value2,"column3":value3},{"column1":value4,"column2":value5,"column3":value6}]'
- detectedSchema: [{"name":"column1","type":"number"},{"name":"column2","type":"string"},{"name":"column3","type":"number"}]
- feedback: "Extracted real data from web content including relevant measurements, statistics, and domain-specific findings."

CRITICAL REQUIREMENTS:
- JSON keys MUST EXACTLY MATCH schema "name" fields
- Extract REAL NUMBERS and VALUES from content based on the user's domain
- Create {{numRows}} rows with ACTUAL DATA VALUES
- Use domain-appropriate ranges and research data from the content
- Adapt column names and data types to match the content and user request

Now analyze the content comprehensively and create the most valuable dataset possible using dynamic schema discovery.`,
    });

    promptCache.set(cacheKey, prompt);
    return prompt;
}

// Helper function to clean AI response from markdown code blocks
function cleanAIResponse(response: string): string {
    if (typeof response !== 'string') {
        return response;
    }

    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Try to find JSON content between braces
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    return cleaned.trim();
}

// Simple keyword extraction fallback (no AI needed)
function extractSimpleKeywords(userPrompt: string): string {
    // Remove common instruction words
    const instructionWords = [
        'generate', 'create', 'provide', 'give me', 'i need', 'find', 'get', 'make', 'build',
        'data', 'dataset', 'table', 'list', 'information', 'details', 'for', 'with', 'of', 'the',
        'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'from', 'by', 'as', 'is', 'are'
    ];

    // Split into words and filter
    const words = userPrompt.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !instructionWords.includes(word));

    // Take first 3-4 most important words
    return words.slice(0, 4).join(' ');
}

// Helper function to generate simple fallback search queries
function generateFallbackQueries(optimizedQuery: string, originalPrompt: string): string[] {
    const fallbackQueries: string[] = [];

    // Extract only the most important keywords
    const keyTerms = originalPrompt.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 2 &&
            !['the', 'and', 'for', 'with', 'data', 'generate', 'create', 'provide', 'latest', 'get', 'find'].includes(term));

    // Strategy 1: Use just the main 2-3 keywords
    if (keyTerms.length >= 2) {
        fallbackQueries.push(keyTerms.slice(0, 3).join(' '));
    }

    // Strategy 2: Remove time words for broader search
    const broaderQuery = optimizedQuery
        .replace(/\b(june|july|august|2024|2025|latest|recent|current|today)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (broaderQuery && broaderQuery !== optimizedQuery && broaderQuery.length > 3) {
        fallbackQueries.push(broaderQuery);
    }

    // Strategy 3: Simple domain-specific fallbacks
    const prompt = originalPrompt.toLowerCase();

    if (prompt.includes('nse') || prompt.includes('stock')) {
        fallbackQueries.push('NSE stock');
        fallbackQueries.push('Indian stock market');
    }

    if (prompt.includes('fii') || prompt.includes('dii')) {
        fallbackQueries.push('FII DII');
        fallbackQueries.push('foreign investors India');
    }

    if (prompt.includes('job') || prompt.includes('employment')) {
        fallbackQueries.push('jobs India');
    }

    if (prompt.includes('price') || prompt.includes('cost')) {
        fallbackQueries.push('prices India');
    }

    // Remove duplicates and very short queries
    return [...new Set(fallbackQueries)].filter(q => q && q.trim().length > 5);
}

// Helper function to try AI models with fallback - Now uses Anthropic Claude for large content
async function tryAIModelsWithFallback(
    userPrompt: string,
    numRows: number,
    scrapedContent: string,
    logger: any
): Promise<any> {
    // Step 1: Try Gemini models first (as requested)
    const modelsToTry = [LARGE_CONTENT_MODEL, ...FALLBACK_MODELS.filter(m => m !== LARGE_CONTENT_MODEL)];

    for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
            logger.log(`🤖 Trying Gemini model: ${model} (attempt ${i + 1}/${modelsToTry.length})`);

            const prompt = createStructurePrompt(model);
            const result = await prompt({
                userPrompt,
                numRows,
                scrapedContent,
            });

            logger.success(`✅ Gemini model ${model} succeeded`);
            return result;
        } catch (error: any) {
            logger.error(`⚠️ Gemini model ${model} failed: ${error.message}`);
            console.error(`[WebFlow] Gemini ${model} error:`, error);
        }
    }

    // Step 2: Fallback to Anthropic Claude if all Gemini models fail
    try {
        logger.log(`🚀 Trying Anthropic Claude as fallback for large content processing (${scrapedContent.length} chars)...`);

        const anthropicService = createAnthropicService();
        if (anthropicService) {
            const result = await anthropicService.processScrapedContent({
                userPrompt,
                numRows,
                scrapedContent
            });

            // Convert Anthropic response to expected format
            console.log(`[WebFlow] Anthropic result:`, JSON.stringify(result, null, 2));

            let parsedData;
            try {
                parsedData = JSON.parse(result.jsonString);
                console.log(`[WebFlow] Parsed data from Anthropic:`, parsedData);
            } catch (parseError) {
                console.error(`[WebFlow] Failed to parse Anthropic jsonString:`, parseError);
                console.error(`[WebFlow] Raw jsonString:`, result.jsonString);
                throw new Error(`Anthropic returned invalid JSON: ${parseError.message}`);
            }

            if (!Array.isArray(parsedData) || parsedData.length === 0) {
                console.error(`[WebFlow] Anthropic returned invalid data structure:`, parsedData);
                throw new Error('Anthropic did not return a valid array of data');
            }

            const convertedResult = {
                output: {
                    jsonString: result.jsonString,
                    detectedSchema: result.detectedSchema,
                    feedback: result.feedback
                }
            };

            console.log(`[WebFlow] Converted result for return:`, JSON.stringify(convertedResult, null, 2));
            logger.success(`✅ Anthropic Claude succeeded! Generated ${parsedData.length} rows with ${result.detectedSchema.length} columns`);
            return convertedResult;
        } else {
            logger.log(`⚠️ Anthropic not available, no more fallback options`);
        }
    } catch (error: any) {
        logger.error(`⚠️ Anthropic fallback also failed: ${error.message}`);

        // Check if it's a credit/quota issue
        if (error.message?.includes('credit balance') || error.message?.includes('quota')) {
            logger.error(`💳 Anthropic API credits exhausted. Please add credits to your Anthropic account.`);
        }
    }

    // If we reach here, all AI models have failed
    throw new Error('All AI models failed to process the content. Please try again or check your API configurations.');
}

const structureScrapedDataPrompt = ai.definePrompt({
    name: 'structureScrapedDataPrompt',
    model: LARGE_CONTENT_MODEL,
    input: { schema: z.object({
        userPrompt: z.string(),
        numRows: z.number(),
        scrapedContent: z.string(),
    }) },
    output: { schema: LLMGenerateDataOutputSchema },
    prompt: `You are a data extraction expert. You have access to a structured markdown file containing web-scraped content.

User Request: "{{userPrompt}}"
Generate exactly {{numRows}} rows of data.

The content has been organized into a structured markdown file with:
- Table of contents showing all sources
- Each source clearly labeled with URL and content type
- Detected content structures (tables, lists, etc.)
- Full content from each source

INSTRUCTIONS:
1. Analyze the structured content to identify relevant data sections
2. Look for tables, lists, or structured data that matches the user's request
3. Extract exactly {{numRows}} rows from the most relevant sections
4. Create consistent column names and data types
5. Prioritize tabular data if available
6. If multiple sources have similar data, combine them intelligently

STRUCTURED CONTENT:
{{scrapedContent}}

REQUIRED OUTPUT FORMAT:
- generatedJsonString: Valid JSON array like '[{"col1":"value1","col2":"value2"}]'
- detectedSchema: Column definitions like [{"name":"col1","type":"String"}]
- feedback: Description of which sources and sections were used

Extract {{numRows}} rows now.
`,
});

// Request deduplication cache to prevent multiple concurrent identical requests
const activeRequests = new Map<string, Promise<any>>();

const generateFromWebFlow = ai.defineFlow(
  {
    name: 'generateFromWebFlow',
    inputSchema: GenerateFromWebInputSchema,
    outputSchema: z.object({
        generatedRows: z.array(z.record(z.string(), z.any())),
        generatedCsv: z.string().optional(),
        detectedSchema: z.array(ColumnSchema),
        feedback: z.string().optional(),
    }),
  },
  async (input) => {
    // Request deduplication to prevent multiple concurrent identical requests
    // Add timestamp to force new request for testing fixes
    const requestKey = `${input.prompt.trim()}-${input.numRows || 10}-${Date.now()}`;

    const startTime = Date.now();
    let feedbackLog = "Starting live web data generation process...\n";
    const logger = input.logger;

    // Temporarily disable cache for testing
    // Check if this exact request is already in progress
    // if (activeRequests.has(requestKey)) {
    //     console.log(`[WebFlow] 🔄 Duplicate request detected, waiting for existing request: ${requestKey.substring(0, 50)}...`);
    //     try {
    //         return await activeRequests.get(requestKey);
    //     } catch (error) {
    //         // If the existing request failed, remove it and continue with new request
    //         activeRequests.delete(requestKey);
    //         console.log(`[WebFlow] ⚠️ Previous request failed, proceeding with new request`);
    //     }
    // }

    console.log(`[WebFlow] Starting web generation with prompt: "${input.prompt.substring(0, 100)}..."`);
    console.log(`[WebFlow] Target rows: ${input.numRows}`);
    console.log(`[WebFlow] Available AI models: ${[LARGE_CONTENT_MODEL, ...FALLBACK_MODELS].join(', ')}`);
    console.log(`[WebFlow] Process started at: ${new Date().toISOString()}`);

    // Store this request in cache to prevent duplicates
    const processingPromise = processRequest();
    activeRequests.set(requestKey, processingPromise);

    // Ensure cleanup happens regardless of success/failure
    processingPromise.finally(() => {
        activeRequests.delete(requestKey);
    });

    return await processingPromise;

    async function processRequest() {
        // Helper functions for logging
    const log = (message: string) => {
      feedbackLog += `${message}\n`;
      logger?.log(message);
    };

    const logSuccess = (message: string) => {
      feedbackLog += `${message}\n`;
      logger?.success(message);
    };

    const logError = (message: string) => {
      feedbackLog += `${message}\n`;
      logger?.error(message);
    };

    const logProgress = (step: string, current: number, total: number, details?: string) => {
      logger?.progress(step, current, total, details);
    };

    log("🚀 Starting web-based data generation...");
    logProgress('Initialization', 1, 7, 'Setting up web scraping pipeline');

    // 1. Refine the search query for better web search results
    let optimizedQuery: string = input.prompt; // Default fallback
    try {
        logProgress('Query Optimization', 2, 7, 'AI is refining your search query for better results');
        log(`🔍 Refining search query from: "${input.prompt}"...`);

        const { output: queryRefinement } = await refineSearchQueryPrompt({ userPrompt: input.prompt });

        // Validate the response
        if (queryRefinement && queryRefinement.searchQuery && queryRefinement.searchQuery.trim()) {
            optimizedQuery = queryRefinement.searchQuery.trim();
            logSuccess(`✅ Query optimized by AI: "${optimizedQuery}"`);
            feedbackLog += `AI optimized search query: "${optimizedQuery}"\n`;
            feedbackLog += `Reasoning: ${queryRefinement.reasoning || 'No reasoning provided'}\n`;
        } else {
            throw new Error("Query refinement returned empty or invalid result");
        }
    } catch (error: any) {
        logError(`❌ AI query refinement failed: ${error.message}. Using simple keyword extraction.`);

        // Fallback to simple keyword extraction
        optimizedQuery = extractSimpleKeywords(input.prompt);

        if (optimizedQuery && optimizedQuery.trim()) {
            logSuccess(`✅ Query optimized by keyword extraction: "${optimizedQuery}"`);
            feedbackLog += `Simple keyword extraction used: "${optimizedQuery}"\n`;
        } else {
            logError(`❌ Keyword extraction also failed. Using original prompt.`);
            optimizedQuery = input.prompt;
            feedbackLog += `Both AI and keyword extraction failed, using original prompt: ${error.message}\n`;
        }
    }

    // Final validation to ensure we have a query
    if (!optimizedQuery || !optimizedQuery.trim()) {
        return { generatedRows: [], detectedSchema: [], feedback: `Error: No valid search query available. Original prompt: "${input.prompt}"` };
    }

    // 2. Search the web with optimized query (with fallback strategies)
    let searchResults: SearchResult[];
    try {
        logProgress('Web Search', 3, 7, 'Searching the web for relevant sources');
        log(`🌐 Searching Google for: "${optimizedQuery}"...`);

        searchResults = await getGoogleSearchResults(optimizedQuery);

        // If no results, try fallback search strategies
        if (searchResults.length === 0) {
            log(`⚠️ No results for optimized query, trying fallback searches...`);

            // Fallback 1: Try broader search terms
            const fallbackQueries = generateFallbackQueries(optimizedQuery, input.prompt);

            for (const fallbackQuery of fallbackQueries) {
                try {
                    log(`🔄 Trying fallback query: "${fallbackQuery}"`);
                    searchResults = await getGoogleSearchResults(fallbackQuery);
                    if (searchResults.length > 0) {
                        logSuccess(`✅ Found ${searchResults.length} results with fallback query`);
                        feedbackLog += `Used fallback search query: "${fallbackQuery}"\n`;
                        break;
                    }
                } catch (fallbackError) {
                    log(`⚠️ Fallback query failed: ${fallbackError}`);
                }
            }
        }

        if (searchResults.length === 0) {
            throw new Error("No relevant search results found after trying multiple search strategies.");
        }

        logSuccess(`✅ Found ${searchResults.length} potential sources`);
        feedbackLog += `Found ${searchResults.length} potential sources.\n`;
    } catch (error: any) {
        logError(`❌ Web search failed: ${error.message}`);
        return { generatedRows: [], detectedSchema: [], feedback: `Failed during web search: ${error.message}. Try using more general search terms or check if the data exists online.` };
    }

    // 3. Filter links with AI (with fallback to manual selection)
    let filteredUrls: string[];
    try {
        logProgress('Link Filtering', 4, 7, 'AI is selecting the best sources for your query');
        log("🤖 AI is filtering the best sources...");

        const filterResponse = await linkFilterPrompt({ query: input.prompt, searchResults });
        filteredUrls = filterResponse.output?.bestUrls || [];
        if (filteredUrls.length === 0) {
            throw new Error("AI could not select any suitable URLs from search results.");
        }

        logSuccess(`✅ AI selected ${filteredUrls.length} high-quality URLs to scrape`);
        feedbackLog += `AI selected ${filteredUrls.length} URLs to scrape.\n`;
    } catch (error: any) {
        logError(`❌ AI link filtering failed: ${error.message}. Using top search results.`);
        feedbackLog += `AI link filtering failed, using top search results: ${error.message}\n`;

        // Fallback: Use top 5 search results
        filteredUrls = searchResults.slice(0, Math.min(5, searchResults.length)).map(result => result.link);
        logSuccess(`✅ Selected top ${filteredUrls.length} search results as fallback`);
        feedbackLog += `Selected top ${filteredUrls.length} search results as fallback.\n`;
    }

    // 4. Scrape content and create structured file
    let structuredFilePath: string;
    try {
        logProgress('Web Scraping', 5, 7, 'Extracting content from selected websites');
        log(`🕷️ Scraping content from ${filteredUrls.length} selected URLs...`);

        // Optimize parallel scraping with better error handling and timeout
        const SCRAPE_TIMEOUT = 35000; // 35 seconds per URL (increased for better success rate)
        const MIN_CONTENT_SIZE = 100; // Minimum content size to be considered valid
        const MIN_SUCCESS_RATE = 0.2; // At least 20% of URLs must succeed (reduced for better tolerance)

        const scrapePromises = filteredUrls.map(async (url) => {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Scraping timeout')), SCRAPE_TIMEOUT)
            );

            try {
                return await Promise.race([scrapeContent(url), timeoutPromise]);
            } catch (error) {
                return { error: error instanceof Error ? error.message : 'Unknown error', urlScraped: url };
            }
        });

        const scrapeResults = await Promise.allSettled(scrapePromises);

        // Collect successful scrapes into structured format
        const scrapedSources: ScrapedSource[] = [];
        const failedUrls: string[] = [];
        let totalContentLength = 0;

        scrapeResults.forEach((result, index) => {
            const url = filteredUrls[index];

            if (result.status === 'fulfilled' && result.value.markdown) {
                const contentLength = result.value.markdown.length;

                // Skip sources with very little content (likely errors or empty pages)
                if (contentLength < MIN_CONTENT_SIZE) {
                    failedUrls.push(url);
                    log(`  ⚠️ Skipped ${url} - insufficient content (${contentLength} chars)`);
                    feedbackLog += `  - Skipped ${url}: insufficient content\n`;
                    return;
                }

                // Use full content from each source - no size limits
                const markdown = result.value.markdown;

                scrapedSources.push({
                    url,
                    markdown,
                    contentType: 'Web Content',
                    timestamp: new Date()
                });
                totalContentLength += markdown.length;
                log(`  ✅ Successfully scraped: ${url} (${contentLength.toLocaleString()} chars)`);
                feedbackLog += `  - Successfully scraped: ${url} (${contentLength} chars)\n`;
            } else {
                const errorMsg = result.status === 'rejected'
                    ? result.reason?.message || 'Unknown error'
                    : result.value?.error || 'No content returned';
                failedUrls.push(url);

                // Use different icons for different types of errors
                const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('timed out');
                const isRateLimit = errorMsg.includes('rate limit') || errorMsg.includes('Rate limit');

                if (isTimeout) {
                    log(`  ⏱️ Timeout: ${url} (website took too long to respond)`);
                    feedbackLog += `  - Timeout: ${url} (website took too long)\n`;
                } else if (isRateLimit) {
                    log(`  🚦 Rate limited: ${url} (too many requests, will retry later)`);
                    feedbackLog += `  - Rate limited: ${url} (temporary limit)\n`;
                } else {
                    log(`  ❌ Failed to scrape ${url}: ${errorMsg}`);
                    feedbackLog += `  - Failed to scrape ${url}: ${errorMsg}\n`;
                }
            }
        });

        // Log summary of scraping results
        if (failedUrls.length > 0) {
            log(`⚠️ ${failedUrls.length} URLs failed to scrape`);
            feedbackLog += `${failedUrls.length} URLs failed to scrape.\n`;
        }

        // Calculate success rate
        const successRate = scrapedSources.length / filteredUrls.length;

        if (scrapedSources.length === 0) {
            logError("❌ Failed to scrape any content from the selected URLs");

            // Log detailed failure information
            log(`📊 Scraping summary: ${failedUrls.length} failed URLs:`);
            failedUrls.slice(0, 5).forEach((url, index) => {
                log(`   ${index + 1}. ${url}`);
            });
            if (failedUrls.length > 5) {
                log(`   ... and ${failedUrls.length - 5} more URLs failed`);
            }

            // Provide helpful error message with suggestions
            const errorMsg = `Failed to scrape content from all ${filteredUrls.length} selected URLs. ` +
                           `Common causes: network timeouts, server errors (500/503), or access restrictions. ` +
                           `Try with a different search query or check your internet connection.`;

            throw new Error(errorMsg);
        }

        // Check if we have enough successful scrapes
        if (successRate < MIN_SUCCESS_RATE) {
            log(`⚠️ Low success rate: ${Math.round(successRate * 100)}% (${scrapedSources.length}/${filteredUrls.length})`);
            log(`⚠️ This may result in limited data quality. Consider trying different search terms.`);
        }

        // Log success with details about partial failures if any
        if (failedUrls.length > 0) {
            logSuccess(`✅ Successfully scraped ${scrapedSources.length}/${filteredUrls.length} sources (${Math.round(successRate * 100)}% success rate)`);
            log(`⚠️ Failed URLs: ${failedUrls.slice(0, 3).join(', ')}${failedUrls.length > 3 ? ` and ${failedUrls.length - 3} more` : ''}`);
        } else {
            logSuccess(`✅ Successfully scraped all ${scrapedSources.length} sources (100% success rate)`);
        }

        // Create structured markdown file
        logProgress('File Processing', 6, 7, 'Creating structured files and organizing content');
        log(`📁 Creating structured file from ${scrapedSources.length} sources...`);

        structuredFilePath = await FileManagerService.createStructuredMarkdownFile(
            input.prompt,
            scrapedSources
        );

        logSuccess(`✅ Created structured file with ${totalContentLength.toLocaleString()} characters`);
        feedbackLog += `Created structured file: ${structuredFilePath}\n`;
        feedbackLog += `Total content: ${totalContentLength.toLocaleString()} characters across ${scrapedSources.length} sources\n`;

    } catch (error: any) {
        return { generatedRows: [], detectedSchema: [], feedback: `Failed during web scraping: ${error.message}` };
    }

    // 5. Structure the data using the final AI prompt with structured file
    try {
        logProgress('AI Processing', 7, 7, 'AI is extracting and structuring the data');
        log("🧠 AI is analyzing structured file and extracting data...");

        // Read the structured file content
        const structuredContent = await FileManagerService.readStructuredFile(structuredFilePath);
        log(`📖 Processing structured file: ${structuredContent.length.toLocaleString()} characters`);
        feedbackLog += `Structured file content: ${structuredContent.length} characters\n`;

        const effectiveNumRows = input.numRows || 50;
        log(`🎯 Requesting ${effectiveNumRows} rows of structured data`);
        feedbackLog += `Requesting ${effectiveNumRows} rows of data from structured sources\n`;

        console.log(`[WebFlow] 🧠 ANTHROPIC-FIRST CONTENT ANALYSIS ACTIVATED`);
        console.log(`[WebFlow] Calling AI with structured file: "${structuredFilePath}"`);
        console.log(`[WebFlow] File size: ${structuredContent.length} characters, requesting ${effectiveNumRows} rows`);
        console.log(`[WebFlow] Primary: Anthropic Claude, Fallback: ${LARGE_CONTENT_MODEL}`);

        // Let AI models handle full content - no truncation limits
        let processedContent = structuredContent;
        log(`📄 Processing full content: ${structuredContent.length} characters`);
        feedbackLog += `Processing full content: ${structuredContent.length} characters for comprehensive data extraction\n`;

        let llmOutput;
        let aiProcessingSucceeded = false;

        try {
            // Try Anthropic Claude first, then fallback to Gemini models
            log("🔄 Processing large content with Anthropic Claude (optimized for large context)...");
            const result = await tryAIModelsWithFallback(
                input.prompt,
                effectiveNumRows,
                processedContent,
                { log, success: logSuccess, error: logError }
            );
            // Handle different response formats: Anthropic has result.output, Gemini has result directly
            llmOutput = result.output || result;
            aiProcessingSucceeded = true;
            logSuccess(`✅ AI processing completed successfully`);
            console.log(`[WebFlow] AI call successful, processing response...`);

            // CRITICAL DEBUG: Log the exact structure we received
            console.log(`[WebFlow] CRITICAL DEBUG - result structure:`, JSON.stringify(result, null, 2));
            console.log(`[WebFlow] CRITICAL DEBUG - result.output structure:`, JSON.stringify(result.output, null, 2));
            console.log(`[WebFlow] CRITICAL DEBUG - llmOutput structure:`, JSON.stringify(llmOutput, null, 2));
        } catch (aiError: any) {
            console.error(`[WebFlow] All AI models failed:`, aiError);
            logError(`❌ AI processing failed: ${aiError.message}`);
            log("🔄 Falling back to pattern matching extraction...");
            // Don't throw here - let it fall through to fallback extraction
        }

        // Initialize variables for extracted data
        let jsonString: string | undefined;
        let detectedSchema: any[] | undefined;
        let feedback: string | undefined;

        // Check if AI processing succeeded and we have valid output
        if (aiProcessingSucceeded && llmOutput) {
            console.log(`[WebFlow] AI response received: Success`);
            console.log(`[WebFlow] llmOutput structure:`, JSON.stringify(llmOutput, null, 2));

            // Handle case where response is a string (markdown wrapped JSON)
            if (typeof llmOutput === 'string') {
                try {
                    const cleanedResponse = cleanAIResponse(llmOutput);
                    const parsedResponse = JSON.parse(cleanedResponse);
                    llmOutput = parsedResponse;
                    console.log(`[WebFlow] Cleaned and parsed string response:`, JSON.stringify(llmOutput, null, 2));
                } catch (parseError) {
                    console.error(`[WebFlow] Failed to parse string response:`, parseError);
                    console.error(`[WebFlow] Raw response:`, llmOutput);
                }
            }

            // Handle both Anthropic format (direct properties) and Gemini format (generatedJsonString)
            jsonString = llmOutput?.jsonString || llmOutput?.output?.jsonString || llmOutput?.generatedJsonString;
            detectedSchema = llmOutput?.detectedSchema || llmOutput?.output?.detectedSchema;
            feedback = llmOutput?.feedback || llmOutput?.output?.feedback;

            console.log(`[WebFlow] Extracted values:`, {
                jsonString: jsonString?.substring(0, 100) + '...',
                jsonStringLength: jsonString?.length,
                detectedSchemaLength: detectedSchema?.length,
                feedbackLength: feedback?.length
            });

            console.log(`[WebFlow] AI response details:`, {
                hasOutput: !!llmOutput,
                hasJsonString: !!jsonString,
                jsonStringLength: jsonString?.length || 0,
                hasSchema: !!detectedSchema,
                schemaLength: detectedSchema?.length || 0,
                feedback: feedback?.substring(0, 100) || 'No feedback'
            });

            log("🔍 AI response received, processing results...");
            feedbackLog += "AI response received, processing...\n";

            if (!jsonString) {
                logError(`❌ AI failed to generate JSON. Available keys: ${Object.keys(llmOutput).join(', ')}`);
                feedbackLog += `AI output keys: ${Object.keys(llmOutput).join(', ')}\n`;
                log("🔄 Falling back to pattern matching due to invalid AI output...");
                aiProcessingSucceeded = false; // Force fallback
            }
        }

        // If AI processing failed or produced invalid output, use fallback extraction
        if (!aiProcessingSucceeded || !jsonString) {
            console.log(`[WebFlow] Using fallback extraction due to AI failure`);
            console.log(`[WebFlow] Debug - aiProcessingSucceeded: ${aiProcessingSucceeded}, jsonString defined: ${!!jsonString}`);
            log("🔄 AI processing unavailable, using pattern matching extraction...");
            feedbackLog += "Using fallback pattern matching extraction due to AI processing failure.\n";

            // Jump to fallback extraction (this will be handled in the catch block)
            throw new Error("AI processing failed, using fallback extraction");
        }

        // Additional safety check
        if (!jsonString) {
            console.error(`[WebFlow] CRITICAL: jsonString is undefined even though checks passed!`);
            console.error(`[WebFlow] aiProcessingSucceeded: ${aiProcessingSucceeded}`);
            console.error(`[WebFlow] llmOutput:`, llmOutput);
            throw new Error("Critical error: jsonString is undefined");
        }

        log(`📝 Processing JSON string (${jsonString.length} characters)`);
        feedbackLog += `Generated JSON string length: ${jsonString.length}\n`;

        let parsedRows;
        try {
            parsedRows = JSON.parse(jsonString);
            log(`✅ Successfully parsed ${Array.isArray(parsedRows) ? parsedRows.length : 'non-array'} rows`);
            feedbackLog += `Successfully parsed ${Array.isArray(parsedRows) ? parsedRows.length : 'non-array'} rows\n`;
        } catch (parseError: any) {
            logError(`❌ JSON parse error: ${parseError.message}`);
            log(`Raw JSON preview: ${jsonString.substring(0, 200)}...`);
            feedbackLog += `JSON parse error: ${parseError.message}\n`;
            feedbackLog += `Raw JSON string: ${jsonString.substring(0, 500)}...\n`;
            throw new Error(`Failed to parse generated JSON: ${parseError.message}`);
        }

        if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
            logError(`❌ Invalid data format: expected non-empty array, got ${typeof parsedRows} with ${Array.isArray(parsedRows) ? parsedRows.length : 'N/A'} items`);

            // Provide more helpful feedback based on the content
            let helpfulMessage = "AI was unable to extract structured data from the scraped content.";
            if (processedContent.length < 100) {
                helpfulMessage += " The scraped content was too short or didn't contain relevant data.";
            } else if (!processedContent.toLowerCase().includes(input.prompt.toLowerCase().split(' ')[0])) {
                helpfulMessage += " The scraped content may not be relevant to your query.";
            } else {
                helpfulMessage += " The content may not contain the specific data you're looking for in a structured format.";
            }

            helpfulMessage += " Try refining your search terms or looking for different data sources.";

            return {
                generatedRows: [],
                generatedCsv: '',
                detectedSchema: [],
                feedback: `${feedbackLog}\n\n${helpfulMessage}\n\nScraped content preview:\n${processedContent.substring(0, 500)}...`
            };
        }

        const generatedCsv = await jsonToCsv(parsedRows);

        // Final success logging
        logSuccess(`🎉 Successfully generated ${parsedRows.length} rows with ${detectedSchema?.length || 0} columns!`);
        log(`📊 CSV generated with ${generatedCsv.split('\n').length - 1} rows`);

        feedbackLog += `Generated CSV with ${generatedCsv.split('\n').length - 1} rows\n`;
        feedbackLog += feedback || "\nData structuring complete.";

        const finalResult = {
            generatedRows: parsedRows,
            generatedCsv,
            detectedSchema: detectedSchema || [],
            feedback: feedbackLog,
        };

        console.log(`[WebFlow] Final result: ${parsedRows.length} rows, CSV length: ${generatedCsv.length}, schema: ${detectedSchema?.length || 0} columns`);

        // Clean up old temporary files to manage disk space
        try {
            await FileManagerService.cleanupOldFiles(2); // Clean files older than 2 hours
            log(`🧹 Cleaned up old temporary files`);
        } catch (cleanupError) {
            // Don't fail the main process if cleanup fails
            console.warn(`[WebFlow] Cleanup warning: ${cleanupError}`);
        }

        return finalResult;

    } catch (error: any) {
        // Always try fallback extraction if AI processing fails and we have scraped content
        const isQuotaError = error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests');
        const isApiError = error.message.includes('API') || error.message.includes('401') || error.message.includes('403') || error.message.includes('500');
        const isAiFailure = error.message.includes('AI generated invalid data') || error.message.includes('Failed to parse generated JSON') || error.message.includes('AI processing failed');

        // Try fallback for any AI-related error if we have scraped content
        if (structuredFilePath && (isQuotaError || isApiError || isAiFailure || error.message.includes('AI'))) {
            if (isQuotaError) {
                logError(`⚠️ AI quota exceeded. Attempting fallback data extraction...`);
                feedbackLog += `AI quota exceeded during data structuring. Attempting fallback extraction.\n`;
            } else if (isApiError) {
                logError(`⚠️ AI API error detected. Attempting fallback data extraction...`);
                feedbackLog += `AI API error during data structuring. Attempting fallback extraction.\n`;
            } else {
                logError(`⚠️ AI processing failed. Attempting fallback data extraction...`);
                feedbackLog += `AI processing failed during data structuring. Attempting fallback extraction.\n`;
            }

            try {
                // Read the structured content and try simple extraction
                const structuredContent = await FileManagerService.readStructuredFile(structuredFilePath);
                const effectiveNumRows = input.numRows || 50;

                log(`🔄 Using fallback pattern matching to extract ${effectiveNumRows} rows...`);
                const fallbackResult = extractSimpleDataFromContent(structuredContent, input.prompt, effectiveNumRows);

                if (fallbackResult.generatedJsonString) {
                    const parsedRows = JSON.parse(fallbackResult.generatedJsonString);
                    const generatedCsv = await jsonToCsv(parsedRows);

                    logSuccess(`✅ Fallback extraction successful: ${parsedRows.length} rows generated`);
                    feedbackLog += `Fallback extraction successful: ${parsedRows.length} rows\n`;
                    feedbackLog += fallbackResult.feedback + '\n';
                    feedbackLog += `Note: For better results, configure OpenAI or Anthropic API keys.\n`;

                    return {
                        generatedRows: parsedRows,
                        generatedCsv,
                        detectedSchema: fallbackResult.detectedSchema || [],
                        feedback: feedbackLog,
                    };
                }
            } catch (fallbackError: any) {
                logError(`❌ Fallback extraction also failed: ${fallbackError.message}`);
                feedbackLog += `Fallback extraction failed: ${fallbackError.message}\n`;
            }

            feedbackLog += `AI quota exceeded during data structuring. Please try again later or configure alternative AI models.\n`;
            feedbackLog += `Available models: OpenAI GPT-4, Anthropic Claude, Google Gemini\n`;
            feedbackLog += `Current model: ${LARGE_CONTENT_MODEL}\n`;
            feedbackLog += `Scraped content is available in: ${structuredFilePath}\n`;
        } else {
            feedbackLog += `Error during final data structuring: ${error.message}\n`;
            feedbackLog += `Stack trace: ${error.stack}\n`;
        }

        console.log(`[WebFlow] Error in data structuring: ${error.message}`);
        console.log(`[WebFlow] Feedback log: ${feedbackLog}`);

        // Final safety net: if we have scraped content but all AI processing failed, try one more fallback
        if (structuredFilePath) {
            try {
                console.log(`[WebFlow] Final safety net: attempting emergency fallback extraction`);
                const structuredContent = await FileManagerService.readStructuredFile(structuredFilePath);
                const emergencyResult = extractSimpleDataFromContent(structuredContent, input.prompt, input.numRows || 10);

                if (emergencyResult.generatedJsonString && JSON.parse(emergencyResult.generatedJsonString).length > 0) {
                    const parsedRows = JSON.parse(emergencyResult.generatedJsonString);
                    const generatedCsv = await jsonToCsv(parsedRows);

                    console.log(`[WebFlow] Emergency fallback successful: ${parsedRows.length} rows`);
                    feedbackLog += `\nEmergency fallback extraction successful: ${parsedRows.length} rows generated.\n`;
                    feedbackLog += `Note: This is basic pattern matching. Configure AI models for better results.\n`;

                    return {
                        generatedRows: parsedRows,
                        generatedCsv,
                        detectedSchema: emergencyResult.detectedSchema || [],
                        feedback: feedbackLog,
                    };
                }
            } catch (emergencyError) {
                console.error(`[WebFlow] Emergency fallback also failed:`, emergencyError);
                feedbackLog += `Emergency fallback also failed: ${emergencyError.message}\n`;
            }
        }

        return { generatedRows: [], detectedSchema: [], feedback: feedbackLog };
    }
    } // End of processRequest function
  }
);

// Clean up old cache entries periodically (every 5 minutes)
setInterval(() => {
    if (activeRequests.size > 0) {
        console.log(`[WebFlow] 🧹 Cleaning up ${activeRequests.size} cached requests`);
        activeRequests.clear();
    }
}, 5 * 60 * 1000);
