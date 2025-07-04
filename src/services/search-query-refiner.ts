import { SimpleAI } from '@/ai/simple-ai';

export interface SearchQueryRefinement {
  originalPrompt: string;
  refinedQueries: string[];
  reasoning: string;
}

/**
 * Refine a user prompt into optimized Google search queries
 */
export async function refinePromptToSearchQueries(
  userPrompt: string,
  maxQueries: number = 3
): Promise<SearchQueryRefinement> {
    try {
      console.log(`[SearchRefiner] Refining prompt: "${userPrompt.substring(0, 100)}..."`);

      const refinementPrompt = `You are a Google search expert. Your job is to convert user prompts into effective Google search queries.

User Prompt: "${userPrompt}"

Convert this into ${maxQueries} concise, effective Google search queries that will find the most relevant data. Follow these rules:

1. **Keep queries SHORT** (3-8 words max)
2. **Use specific keywords** that people actually search for
3. **Remove unnecessary words** like "provide", "list", "details", "information"
4. **Focus on the CORE topic** and key data points
5. **Make queries diverse** to get different perspectives
6. **Use location/time modifiers** only if essential

Examples:
- User: "Provide a list of the latest bank job openings in India with details" 
  → Refined: ["bank jobs India 2025", "banking careers India", "bank recruitment India"]

- User: "Get latest movie reviews in Indian cinema for 2025"
  → Refined: ["Indian movies 2025 reviews", "Bollywood film reviews", "Indian cinema 2025"]

Respond with ONLY a JSON object in this format:
{
  "refinedQueries": ["query1", "query2", "query3"],
  "reasoning": "Brief explanation of why these queries are better"
}`;

      const result = await SimpleAI.generate({
        prompt: refinementPrompt,
        model: 'deepseek/deepseek-chat-v3-0324:free',
        temperature: 0.3, // Lower temperature for more consistent results
        maxTokens: 500
      });

      // Parse the AI response
      let cleanedResponse = result.text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validate the response
      if (!parsed.refinedQueries || !Array.isArray(parsed.refinedQueries)) {
        throw new Error('Invalid response format: missing refinedQueries array');
      }

      // Filter and clean the queries
      const cleanedQueries = parsed.refinedQueries
        .filter((query: any) => typeof query === 'string' && query.trim().length > 0)
        .map((query: string) => query.trim())
        .slice(0, maxQueries); // Ensure we don't exceed maxQueries

      if (cleanedQueries.length === 0) {
        throw new Error('No valid search queries generated');
      }

      const refinement: SearchQueryRefinement = {
        originalPrompt: userPrompt,
        refinedQueries: cleanedQueries,
        reasoning: parsed.reasoning || 'Queries optimized for better search results'
      };

      console.log(`[SearchRefiner] ✅ Generated ${cleanedQueries.length} refined queries:`, cleanedQueries);
      return refinement;

  } catch (error: any) {
    console.error('[SearchRefiner] Error refining search queries:', error);

    // Fallback: create simple queries from the original prompt
    const fallbackQueries = createFallbackQueries(userPrompt, maxQueries);

    return {
      originalPrompt: userPrompt,
      refinedQueries: fallbackQueries,
      reasoning: `AI refinement failed, using fallback extraction: ${error.message}`
    };
  }
}

/**
 * Create fallback search queries when AI refinement fails
 */
function createFallbackQueries(prompt: string, maxQueries: number): string[] {
    // Extract key terms from the prompt
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2) // Remove short words
      .filter(word => !isStopWord(word)); // Remove stop words

    // Take the most important words (first few after filtering)
    const keyWords = words.slice(0, 6);
    
    if (keyWords.length === 0) {
      return [prompt.substring(0, 50)]; // Last resort
    }

    const queries: string[] = [];
    
    // Create different combinations of keywords
    if (keyWords.length >= 3) {
      queries.push(keyWords.slice(0, 3).join(' '));
    }
    if (keyWords.length >= 4 && queries.length < maxQueries) {
      queries.push(keyWords.slice(1, 4).join(' '));
    }
    if (keyWords.length >= 5 && queries.length < maxQueries) {
      queries.push(keyWords.slice(0, 2).join(' ') + ' ' + keyWords.slice(-2).join(' '));
    }

    // If we still don't have enough queries, add the full key phrase
    if (queries.length < maxQueries && keyWords.length > 0) {
      queries.push(keyWords.join(' '));
    }

    return queries.slice(0, maxQueries);
  }

/**
 * Check if a word is a stop word (common words to filter out)
 */
function isStopWord(word: string): boolean {
  const stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'provide', 'list', 'get', 'find', 'show', 'give', 'details', 'information', 'data',
    'latest', 'recent', 'new', 'current', 'today', 'now', 'please', 'help', 'need', 'want'
  ];

  return stopWords.includes(word.toLowerCase());
}

/**
 * Quick validation of search queries
 */
export function validateSearchQueries(queries: string[]): string[] {
  return queries
    .filter(query => query && query.trim().length > 0)
    .map(query => query.trim())
    .filter(query => query.length <= 100) // Google search limit
    .slice(0, 5); // Max 5 queries to avoid API abuse
}
