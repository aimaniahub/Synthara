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

/**
 * Fallback content refinement without AI (basic text filtering)
 */
export async function refineScrapedContentFallback(input: RefineScrapedContentInput): Promise<RefineScrapedContentOutput> {
  console.log(`[RefineScrapedContent] Using fallback refinement for ${input.scrapedContent.length} sources`);

  try {
    const validatedInput = RefineScrapedContentInputSchema.parse(input);

    const refinedContent = validatedInput.scrapedContent.map(item => {
      // Basic content cleaning
      const cleanedContent = cleanContent(item.content);
      
      // Simple relevance check
      const relevanceScore = calculateBasicRelevance(cleanedContent, validatedInput.userQuery);
      
      return {
        url: item.url,
        title: item.title,
        relevantContent: cleanedContent,
        confidence: relevanceScore,
      };
    }).filter(item => item.confidence > 0.3); // Keep only somewhat relevant content

    console.log(`[RefineScrapedContent] Fallback refined ${validatedInput.scrapedContent.length} sources to ${refinedContent.length} relevant sources`);

    return {
      success: true,
      refinedContent,
      originalCount: validatedInput.scrapedContent.length,
      refinedCount: refinedContent.length,
    };

  } catch (error: any) {
    console.error('[RefineScrapedContent] Fallback error:', error);
    return {
      success: false,
      refinedContent: [],
      originalCount: input.scrapedContent.length,
      refinedCount: 0,
      error: error.message,
    };
  }
}

/**
 * Clean content by removing common noise patterns
 */
function cleanContent(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // Remove common noise patterns
  const noisePatterns = [
    /Advertisement\s*/gi,
    /Ad\s*/gi,
    /Sponsored\s*/gi,
    /Cookie\s*policy/gi,
    /Privacy\s*policy/gi,
    /Terms\s*of\s*service/gi,
    /Subscribe\s*to\s*newsletter/gi,
    /Follow\s*us\s*on/gi,
    /Share\s*this\s*article/gi,
    /Related\s*articles/gi,
    /You\s*might\s*also\s*like/gi,
    /©\s*\d{4}/gi,
    /All\s*rights\s*reserved/gi,
    /Last\s*updated/gi,
    /Published\s*on/gi,
    /By\s*[A-Za-z\s]+$/gm,
    /\n\s*\n\s*\n/g, // Multiple newlines
    /\s+/g, // Multiple spaces
  ];

  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Remove empty lines and trim
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return cleaned.trim();
}

/**
 * Calculate basic relevance score between content and query
 */
function calculateBasicRelevance(content: string, query: string): number {
  if (!content || !query) return 0;

  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Split query into words
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  if (queryWords.length === 0) return 0;

  // Count word matches
  let matches = 0;
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      matches++;
    }
  }

  // Calculate score as percentage of words matched
  const score = matches / queryWords.length;
  
  // Boost score for exact phrase matches
  if (contentLower.includes(queryLower)) {
    return Math.min(1.0, score + 0.2);
  }

  return score;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use refineScrapedContent instead
 */
export async function refineScrapedContentFlow(input: RefineScrapedContentInput): Promise<RefineScrapedContentOutput> {
  console.warn('[RefineScrapedContent] refineScrapedContentFlow is deprecated, use refineScrapedContent instead');
  return refineScrapedContent(input);
}
