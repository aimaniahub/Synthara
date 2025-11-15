'use server';

import { z } from 'zod';
import { geminiService, type GeminiStructuredData } from '@/services/gemini-service';
// CSV generation utility
async function jsonToCsv(jsonData: Array<Record<string, any>>): Promise<string> {
  if (!jsonData || jsonData.length === 0) {
    return "";
  }
  const keys = Object.keys(jsonData[0]);
  const csvRows = [
    keys.join(','), // header row
    ...jsonData.map(row =>
      keys.map(key => {
        let cell = row[key] === null || row[key] === undefined ? '' : String(row[key]);
        cell = cell.replace(/"/g, '""'); // escape double quotes
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
          cell = `"${cell}"`; // quote cells with commas, quotes, or newlines
        }
        return cell;
      }).join(',')
    )
  ];
  return csvRows.join('\n');
}

// Input validation schema
const StructureDataInputSchema = z.object({
  refinedContent: z.array(z.object({
    url: z.string(),
    title: z.string(),
    relevantContent: z.string(),
    confidence: z.number(),
  })),
  userQuery: z.string().min(1, 'User query is required'),
  numRows: z.number().min(1).max(300).default(300),
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

