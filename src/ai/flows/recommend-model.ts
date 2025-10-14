// src/ai/flows/recommend-model.ts
'use server';
/**
 * @fileOverview A flow for recommending a pre-trained model for data generation based on a natural language prompt.
 *
 * - recommendModel - A function that takes a data generation prompt and returns a recommended pre-trained model.
 * - RecommendModelInput - The input type for the recommendModel function.
 * - RecommendModelOutput - The return type for the recommendModel function.
 */

import { z } from 'zod';

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

import { SimpleAI } from '@/ai/simple-ai';

async function recommendModelFlow(input: RecommendModelInput): Promise<RecommendModelOutput> {
  const promptText = `You are an expert in recommending pre-trained models for data generation.

Given the following natural language prompt for data generation, recommend the best pre-trained model to use.
Explain your reasoning for the recommendation.

Prompt: ${input.prompt}

Your recommendation should be in JSON format with the following structure:
{
  "model": "recommended model name",
  "reason": "explanation for the recommendation"
}`;

  try {
    const result = await SimpleAI.generateWithSchema<RecommendModelOutput>({
      prompt: promptText,
      schema: RecommendModelOutputSchema,
      model: 'deepseek/deepseek-chat-v3-0324:free',
      temperature: 0.7
    });

    return result;
  } catch (error) {
    console.error('[RecommendModel] Error:', error);
    // Return a fallback recommendation
    return {
      modelName: 'OpenRouter DeepSeek Chat V3',
      reason: 'Default recommendation due to processing error. DeepSeek Chat V3 is a reliable general-purpose model for data generation tasks.'
    };
  }
}
