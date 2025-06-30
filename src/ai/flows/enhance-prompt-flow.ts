
'use server';
/**
 * @fileOverview A flow for enhancing a user's data generation prompt using AI.
 *
 * - enhancePrompt - A function that takes a current prompt and returns an AI-enhanced version.
 * - EnhancePromptInput - The input type for the enhancePrompt function.
 * - EnhancePromptOutput - The return type for the enhancePrompt function.
 */

import {ai, z} from '@/ai/genkit';

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
  return enhancePromptFlow(input);
}

const enhancementUserPrompt = ai.definePrompt({
  name: 'enhancePromptUserMessage',
  input: {schema: EnhancePromptInputSchema},
  output: {schema: EnhancePromptOutputSchema},
  prompt: `
You are an expert prompt engineer specializing in refining user requests for synthetic data generation.
A user has provided the following data generation prompt:
"{{{currentPrompt}}}"

Your task is to help the user enhance this prompt. Your goal is to make their request clearer, more focused, and better structured so an AI can generate high-quality synthetic data based on *their intent*.

Focus on:
- Improving the wording for clarity and precision.
- Suggesting ways to structure the request if it's too loose or narrative.
- Helping to narrow the scope or add necessary constraints if the prompt is too broad or ambiguous.
- Pointing out if any parts are unclear or could lead to poor or irrelevant data generation.
- If the user hinted at specific columns, data types, or examples, you can refine those descriptions or suggest related aspects that would improve data quality. However, do not invent a full, detailed schema with many columns if the user did not provide a strong starting point for one.
- The enhanced prompt should still sound like it's the user's request, but improved. It should be a single, cohesive prompt ready for a data generation AI.
- If the original prompt is already quite good and specific, acknowledge this. You can then offer minor refinements for even better results or simply state that it's well-formed and ready for generation.

Output the enhanced prompt and a brief reasoning for your changes in the specified JSON format. The reasoning should explain *how* your suggestions will help the user get better, more relevant synthetic data.
For example, if the user says "I need customer data", a good enhancement might be:
Enhanced Prompt: "Generate a list of customer profiles including names, email addresses, and their city of residence. Aim for variety in the cities."
Reasoning: "Clarified the type of customer information needed (names, emails, city) and suggested aiming for variety to make the dataset more diverse and useful."
Avoid over-specifying columns if the user's prompt is very general.
`,
});

const enhancePromptFlow = ai.defineFlow(
  {
    name: 'enhancePromptFlow',
    inputSchema: EnhancePromptInputSchema,
    outputSchema: EnhancePromptOutputSchema,
  },
  async (input: EnhancePromptInput) => {
    if (!input.currentPrompt || input.currentPrompt.trim().length < 5) {
        return { enhancedPrompt: input.currentPrompt, reasoning: "Original prompt is too short to enhance effectively. Please provide more details." };
    }
    const {output} = await enhancementUserPrompt(input);
    if (!output) {
      return { 
        enhancedPrompt: input.currentPrompt, 
        reasoning: "Failed to get enhancement from AI. Using original prompt." 
      };
    }
    return output;
  }
);

    
