'use server';

import { z } from 'zod';
import { geminiService, type GeminiStructuredData } from '@/services/gemini-service';
import { jsonToCsv } from './generate-data-flow';

// Input validation schema
const StructureDataInputSchema = z.object({
  refinedContent: z.array(z.object({
    url: z.string(),
    title: z.string(),
    relevantContent: z.string(),
    confidence: z.number(),
  })),
  userQuery: z.string().min(1, 'User query is required'),
  numRows: z.number().min(1).max(100).default(25),
});

// Output validation schema
const StructureDataOutputSchema = z.object({
  success: z.boolean(),
  data: z.array(z.record(z.any())),
  csv: z.string(),
  schema: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
  })),
  reasoning: z.string(),
  dataCount: z.number(),
  error: z.string().optional(),
});

export type StructureDataInput = z.infer<typeof StructureDataInputSchema>;
export type StructureDataOutput = z.infer<typeof StructureDataOutputSchema>;

/**
 * Structure refined content into a dataset with proper schema using AI
 */
export async function structureData(input: StructureDataInput): Promise<StructureDataOutput> {
  console.log(`[StructureData] Starting data structuring for ${input.refinedContent.length} sources`);
  console.log(`[StructureData] User query: "${input.userQuery.substring(0, 100)}..."`);
  console.log(`[StructureData] Target rows: ${input.numRows}`);

  try {
    // Validate input
    const validatedInput = StructureDataInputSchema.parse(input);

    // Check if we have content to structure
    if (validatedInput.refinedContent.length === 0) {
      return {
        success: true,
        data: [],
        csv: '',
        schema: [],
        reasoning: 'No content available to structure',
        dataCount: 0,
      };
    }

    // Use Gemini to structure the data
    console.log('[StructureData] Using AI to structure data with schema...');
    const structuringResponse = await geminiService.structureData(
      validatedInput.refinedContent,
      validatedInput.userQuery,
      validatedInput.numRows
    );

    if (!structuringResponse.success) {
      throw new Error(`Failed to structure data: ${structuringResponse.error}`);
    }

    const structuredData = structuringResponse.structuredData;
    console.log(`[StructureData] AI structured data: ${structuredData.data.length} rows, ${structuredData.schema.length} columns`);

    // Generate CSV from structured data
    let csv = '';
    if (structuredData.data.length > 0) {
      csv = await jsonToCsv(structuredData.data);
      console.log(`[StructureData] Generated CSV: ${csv.length} characters`);
    }

    return {
      success: true,
      data: structuredData.data,
      csv,
      schema: structuredData.schema,
      reasoning: structuredData.reasoning,
      dataCount: structuredData.data.length,
    };

  } catch (error: any) {
    console.error('[StructureData] Error:', error);
    return {
      success: false,
      data: [],
      csv: '',
      schema: [],
      reasoning: '',
      dataCount: 0,
      error: error.message,
    };
  }
}

/**
 * Fallback data structuring without AI (basic extraction)
 */
export async function structureDataFallback(input: StructureDataInput): Promise<StructureDataOutput> {
  console.log(`[StructureData] Using fallback structuring for ${input.refinedContent.length} sources`);

  try {
    const validatedInput = StructureDataInputSchema.parse(input);

    if (validatedInput.refinedContent.length === 0) {
      return {
        success: true,
        data: [],
        csv: '',
        schema: [],
        reasoning: 'No content available to structure',
        dataCount: 0,
      };
    }

    // Basic data extraction
    const extractedData = extractBasicData(validatedInput.refinedContent, validatedInput.userQuery);
    
    // Generate basic schema
    const schema = generateBasicSchema(extractedData, validatedInput.userQuery);
    
    // Generate CSV
    let csv = '';
    if (extractedData.length > 0) {
      csv = await jsonToCsv(extractedData);
    }

    console.log(`[StructureData] Fallback structured data: ${extractedData.length} rows, ${schema.length} columns`);

    return {
      success: true,
      data: extractedData,
      csv,
      schema,
      reasoning: 'Basic data extraction using fallback method',
      dataCount: extractedData.length,
    };

  } catch (error: any) {
    console.error('[StructureData] Fallback error:', error);
    return {
      success: false,
      data: [],
      csv: '',
      schema: [],
      reasoning: '',
      dataCount: 0,
      error: error.message,
    };
  }
}

/**
 * Extract basic data from refined content
 */
function extractBasicData(
  refinedContent: Array<{url: string, title: string, relevantContent: string, confidence: number}>,
  userQuery: string
): Array<Record<string, any>> {
  const extractedData: Array<Record<string, any>> = [];

  for (const item of refinedContent) {
    // Basic data extraction - create a simple record
    const dataRow: Record<string, any> = {
      source_url: item.url,
      source_title: item.title,
      content: item.relevantContent.substring(0, 500), // Limit content length
      confidence: item.confidence,
      extracted_at: new Date().toISOString(),
    };

    // Try to extract some basic information based on common patterns
    const content = item.relevantContent.toLowerCase();
    
    // Look for common data patterns
    if (content.includes('price') || content.includes('$') || content.includes('cost')) {
      dataRow.price = extractPrice(item.relevantContent);
    }
    
    if (content.includes('rating') || content.includes('score') || content.includes('stars')) {
      dataRow.rating = extractRating(item.relevantContent);
    }
    
    if (content.includes('address') || content.includes('location')) {
      dataRow.location = extractLocation(item.relevantContent);
    }

    extractedData.push(dataRow);
  }

  return extractedData;
}

/**
 * Generate basic schema from extracted data
 */
function generateBasicSchema(data: Array<Record<string, any>>, userQuery: string): Array<{name: string, type: string, description: string}> {
  if (data.length === 0) {
    return [];
  }

  const schema: Array<{name: string, type: string, description: string}> = [];
  const sampleRow = data[0];

  for (const [key, value] of Object.entries(sampleRow)) {
    let type = 'String';
    if (typeof value === 'number') {
      type = 'Number';
    } else if (typeof value === 'boolean') {
      type = 'Boolean';
    } else if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
      type = 'Date';
    }

    let description = key.replace(/_/g, ' ').toLowerCase();
    if (key === 'source_url') description = 'URL of the source page';
    else if (key === 'source_title') description = 'Title of the source page';
    else if (key === 'content') description = 'Relevant content from the source';
    else if (key === 'confidence') description = 'AI confidence score for this data';
    else if (key === 'extracted_at') description = 'Timestamp when data was extracted';

    schema.push({
      name: key,
      type,
      description,
    });
  }

  return schema;
}

/**
 * Extract price information from content
 */
function extractPrice(content: string): string | null {
  const priceRegex = /\$[\d,]+\.?\d*/g;
  const matches = content.match(priceRegex);
  return matches ? matches[0] : null;
}

/**
 * Extract rating information from content
 */
function extractRating(content: string): string | null {
  const ratingRegex = /(\d+(?:\.\d+)?)\s*(?:stars?|rating|score|out of \d+)/gi;
  const matches = content.match(ratingRegex);
  return matches ? matches[0] : null;
}

/**
 * Extract location information from content
 */
function extractLocation(content: string): string | null {
  const locationRegex = /(?:address|location|located at):\s*([^,\n]+)/gi;
  const matches = content.match(locationRegex);
  return matches ? matches[1].trim() : null;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use structureData instead
 */
export async function structureDataFlow(input: StructureDataInput): Promise<StructureDataOutput> {
  console.warn('[StructureData] structureDataFlow is deprecated, use structureData instead');
  return structureData(input);
}
