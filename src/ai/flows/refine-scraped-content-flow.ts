'use server';

import { z } from 'zod';
import { SimpleAI } from '@/ai/simple-ai';

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

    // Use OpenRouter (SimpleAI) to refine the content
    console.log('[RefineScrapedContent] Using AI (OpenRouter) to filter and refine content...');

    const contentSummary = validatedInput.scrapedContent
      .map((item, index) => `Source ${index + 1}:
URL: ${item.url}
Title: ${item.title}
Content: ${item.content.substring(0, 1000)}...`)
      .join('\n\n');

    const prompt = `You are an expert at content refinement for data extraction.
Given scraped web content and a user query, filter out noise and keep only relevant information.

User Query: "${validatedInput.userQuery}"

Scraped Content:
${contentSummary}

For each source, extract only the content that is directly relevant to the user query. Remove:
- Navigation menus, footers, headers
- Advertisements and promotional content
- Irrelevant sections
- Duplicate information
- Meta information not related to the query

Keep:
- Data that directly answers the user query
- Structured information (tables, lists)
- Key facts and figures
- Relevant descriptions and details

Return your response as a JSON object with this exact structure:
{
  "refinedContent": [
    {
      "url": "source_url",
      "title": "page_title",
      "relevantContent": "cleaned_relevant_content",
      "confidence": 0.95
    }
  ]
}`;

    const aiResult = await SimpleAI.generateWithSchema<{
      refinedContent: Array<{ url: string; title: string; relevantContent: string; confidence: number }>;
    }>({
      prompt,
      schema: {
        refinedContent: [
          {
            url: 'source_url',
            title: 'page_title',
            relevantContent: 'cleaned_relevant_content',
            confidence: 0.95,
          },
        ],
      },
      model: process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free',
      maxTokens: 4000,
      temperature: 0.3,
    });

    const refinedContent = Array.isArray(aiResult.refinedContent) ? aiResult.refinedContent : [];
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

