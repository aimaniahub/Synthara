
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

Your task is to help the user enhance this prompt. Your goal is to make their request clearer, more focused, and better structured so an AI can generate high-quality data based on their intent.

Focus on:
- Improving the wording for clarity and precision
- Suggesting ways to structure the request if it's too loose or narrative
- Helping to narrow the scope or add necessary constraints if the prompt is too broad or ambiguous
- Pointing out if any parts are unclear or could lead to poor or irrelevant data generation
- If the user hinted at specific columns, data types, or examples, you can refine those descriptions or suggest related aspects that would improve data quality
- The enhanced prompt should still sound like it's the user's request, but improved
- If the original prompt is already quite good and specific, acknowledge this and offer minor refinements

IMPORTANT: Do not add the word "synthetic" or "artificial" to the enhanced prompt. Focus on making the request clearer and more specific.

Respond with a JSON object containing:
{
  "enhancedPrompt": "The improved version of the user's prompt",
  "reasoning": "Brief explanation of how your suggestions will help get better, more relevant data"
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


