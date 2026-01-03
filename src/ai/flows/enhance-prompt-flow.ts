
'use server';
/**
 * @fileOverview A flow for enhancing a user's data generation prompt using AI.
 *
 * - enhancePrompt - A function that takes a current prompt and returns an AI-enhanced version.
 * - EnhancePromptInput - The input type for the enhancePrompt function.
 * - EnhancePromptOutput - The return type for the enhancePrompt function.
 */

import { z } from 'zod';
import { SimpleAI } from '@/ai/simple-ai';

const EnhancePromptInputSchema = z.object({
  currentPrompt: z.string().describe('The user\'s current data generation prompt that needs enhancement.'),
});
export type EnhancePromptInput = z.infer<typeof EnhancePromptInputSchema>;

const EnhancePromptOutputSchema = z.object({
  enhancedPrompt: z.string().describe('The AI-enhanced version of the data generation prompt.'),
  reasoning: z.string().optional().describe('A brief explanation of why the prompt was enhanced this way and how it helps.'),
});
export type EnhancePromptOutput = z.infer<typeof EnhancePromptOutputSchema>;

export async function enhancePrompt(input: EnhancePromptInput): Promise<EnhancePromptOutput> {
  if (!input.currentPrompt || input.currentPrompt.trim().length < 5) {
    return {
      enhancedPrompt: input.currentPrompt,
      reasoning: "Original prompt is too short to enhance effectively. Please provide more details."
    };
  }

  try {
    const enhancementPrompt = `You are an expert prompt engineer specializing in refining user requests for data generation.

A user has provided the following data generation prompt:
"${input.currentPrompt}"

Your task is to help the user enhance this prompt. Make their request clearer and more focused so we can find relevant web sources and extract data.

IMPORTANT - KEEP IT SIMPLE:
- Focus on clarifying WHAT TYPE of entities the user wants (e.g., "movies", "restaurants", "products")
- Do NOT add specific column requirements - columns will be discovered automatically from scraped data
- Keep the prompt search-friendly and concise
- Add useful filters if obvious (e.g., time period, location, category)
- If the original prompt is already clear, make minimal changes

AVOID:
- Adding column specifications like "include title, genre, release date" - these limit data extraction
- Making the prompt too long or complex
- Adding unrealistic requirements for data that may not exist online

GOOD EXAMPLE:
- Original: "list of movies 2026"
- Enhanced: "List of upcoming Indian movies scheduled for release in 2026"

BAD EXAMPLE (too specific about columns):
- Enhanced: "List of 2026 movies including title, genre, director, budget, box office" ← DON'T do this

Respond with a JSON object containing:
{
  "enhancedPrompt": "The improved version of the user's prompt",
  "reasoning": "Brief explanation of how your suggestions will help find better data"
}`;

    const response = await SimpleAI.generate({
      prompt: enhancementPrompt,
      temperature: 0.3,
      maxTokens: 1000
    });

    try {
      // Extract JSON from potential markdown code blocks
      let jsonText = response.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      // Remove trailing commas before closing brackets/braces
      jsonText = jsonText.replace(/,(\s*[\]}])/g, '$1').trim();

      // Try to find JSON object if not starting with {
      if (!jsonText.startsWith('{')) {
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) {
          jsonText = match[0];
        }
      }

      const parsed = JSON.parse(jsonText);
      return {
        enhancedPrompt: parsed.enhancedPrompt || input.currentPrompt,
        reasoning: parsed.reasoning || "Enhanced for better clarity and specificity"
      };
    } catch (parseError) {
      // If JSON parsing fails, try to extract the enhanced prompt from the response
      console.warn('[EnhancePrompt] JSON parsing failed, extracting from text:', parseError);
      const lines = response.text.split('\n');
      const enhancedLine = lines.find(line => line.toLowerCase().includes('enhanced') || line.toLowerCase().includes('improved'));

      return {
        enhancedPrompt: enhancedLine ? enhancedLine.replace(/^[^:]*:/, '').trim() : input.currentPrompt,
        reasoning: "Enhanced for better clarity and data generation quality"
      };
    }
  } catch (error: any) {
    console.error('[EnhancePrompt] Error:', error);
    return {
      enhancedPrompt: input.currentPrompt,
      reasoning: "Failed to get enhancement from AI. Using original prompt."
    };
  }
}


