'use server';

import { z } from 'zod';
import { geminiService, type GeminiRefinedContent } from '@/services/gemini-service';

// Input validation schema
const RefineScrapedContentInputSchema = z.object({
  scrapedContent: z.array(z.object({
    url: z.string(),
    title: z.string(),
    content: z.string(),
  })),
  userQuery: z.string().min(1, 'User query is required'),
});

// Output validation schema
const RefineScrapedContentOutputSchema = z.object({
  success: z.boolean(),
  refinedContent: z.array(z.object({
    url: z.string(),
    title: z.string(),
    relevantContent: z.string(),
    confidence: z.number(),
  })),
  originalCount: z.number(),
  refinedCount: z.number(),
  error: z.string().optional(),
});

export type RefineScrapedContentInput = z.infer<typeof RefineScrapedContentInputSchema>;
export type RefineScrapedContentOutput = z.infer<typeof RefineScrapedContentOutputSchema>;

/**
 * Refine scraped content using AI to remove noise and keep relevant information
 */
export async function refineScrapedContent(input: RefineScrapedContentInput): Promise<RefineScrapedContentOutput> {
  console.log(`[RefineScrapedContent] Starting content refinement for ${input.scrapedContent.length} sources`);
  console.log(`[RefineScrapedContent] User query: "${input.userQuery.substring(0, 100)}..."`);

  try {
    // Validate input
    const validatedInput = RefineScrapedContentInputSchema.parse(input);

    // Check if we have content to refine
    if (validatedInput.scrapedContent.length === 0) {
      return {
        success: true,
        refinedContent: [],
        originalCount: 0,
        refinedCount: 0,
      };
    }

    // Use Gemini to refine the content
    console.log('[RefineScrapedContent] Using AI to filter and refine content...');
    const refinementResponse = await geminiService.refineContent(
      validatedInput.scrapedContent,
      validatedInput.userQuery
    );

    if (!refinementResponse.success) {
      throw new Error(`Failed to refine content: ${refinementResponse.error}`);
    }

    const refinedContent = refinementResponse.refinedContent;
    console.log(`[RefineScrapedContent] Refined ${validatedInput.scrapedContent.length} sources to ${refinedContent.length} relevant sources`);

    // Additional filtering based on confidence scores
    const highConfidenceContent = refinedContent.filter(item => item.confidence >= 0.3);
    console.log(`[RefineScrapedContent] ${highConfidenceContent.length} sources with high confidence (>=0.3)`);

    return {
      success: true,
      refinedContent: highConfidenceContent,
      originalCount: validatedInput.scrapedContent.length,
      refinedCount: highConfidenceContent.length,
    };

  } catch (error: any) {
    console.error('[RefineScrapedContent] Error:', error);
    return {
      success: false,
      refinedContent: [],
      originalCount: input.scrapedContent.length,
      refinedCount: 0,
      error: error.message,
    };
  }
}

