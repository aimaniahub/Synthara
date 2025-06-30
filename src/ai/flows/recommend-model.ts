// src/ai/flows/recommend-model.ts
'use server';
/**
 * @fileOverview A flow for recommending a pre-trained model for data generation based on a natural language prompt.
 *
 * - recommendModel - A function that takes a data generation prompt and returns a recommended pre-trained model.
 * - RecommendModelInput - The input type for the recommendModel function.
 * - RecommendModelOutput - The return type for the recommendModel function.
 */

import {ai, z} from '@/ai/genkit';

const RecommendModelInputSchema = z.object({
  prompt: z.string().describe('The natural language prompt for data generation.'),
});
export type RecommendModelInput = z.infer<typeof RecommendModelInputSchema>;

const RecommendModelOutputSchema = z.object({
  modelName: z.string().describe('The name of the recommended pre-trained model.'),
  reason: z.string().describe('The reason for recommending this model.'),
});
export type RecommendModelOutput = z.infer<typeof RecommendModelOutputSchema>;

export async function recommendModel(input: RecommendModelInput): Promise<RecommendModelOutput> {
  return recommendModelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendModelPrompt',
  input: {schema: RecommendModelInputSchema},
  output: {schema: RecommendModelOutputSchema},
  prompt: `You are an expert in recommending pre-trained models for data generation.

  Given the following natural language prompt for data generation, recommend the best pre-trained model to use.
  Explain your reasoning for the recommendation.

  Prompt: {{{prompt}}}

  Your recommendation should be in JSON format.
`,
});

const recommendModelFlow = ai.defineFlow(
  {
    name: 'recommendModelFlow',
    inputSchema: RecommendModelInputSchema,
    outputSchema: RecommendModelOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
