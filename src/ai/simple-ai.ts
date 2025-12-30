/**
 * Simple AI service replacement for Genkit
 * Now uses OpenRouter DeepSeek instead of Google AI
 */

import { OpenAI } from 'openai';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { getWritableTempDir } from '@/lib/utils/fs-utils';

// Initialize OpenRouter client
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
let openRouterClient: OpenAI | null = null;

if (openRouterApiKey) {
  openRouterClient = new OpenAI({
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: openRouterApiKey,
  });
}

export interface SimpleAIInput {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SimpleAIOutput {
  text: string;
  model: string;
}

export interface StructuredDatasetSchemaColumn {
  name: string;
  type: string;
  description?: string;
}

export interface StructuredDataset {
  schema: StructuredDatasetSchemaColumn[];
  data: Array<Record<string, any>>;
  reasoning?: string;
  rawFilePath?: string;
}

export interface StructureRelevantChunksInput {
  chunks: Array<{ url: string; title: string; content: string }>;
  userQuery: string;
  numRows: number;
  sessionId?: string;
}

export class SimpleAI {
  static async generate(input: SimpleAIInput): Promise<SimpleAIOutput> {
    const { prompt, model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free', maxTokens = 8000, temperature = 0.7 } = input;

    if (!openRouterClient) {
      throw new Error('OpenRouter not initialized. Please set OPENROUTER_API_KEY environment variable.');
    }

    try {
      const extraHeaders: Record<string, string> = {};
      if (process.env.OPENROUTER_SITE_URL) {
        extraHeaders["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
      }
      if (process.env.OPENROUTER_SITE_NAME) {
        extraHeaders["X-Title"] = process.env.OPENROUTER_SITE_NAME;
      }

      const completion = await openRouterClient.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        max_tokens: maxTokens,
        response_format: prompt.toLowerCase().includes('json') ? { type: 'json_object' } : undefined
      }, {
        headers: extraHeaders
      });

      // Get the response text from the completion
      const choice = completion.choices[0];
      let text = choice?.message?.content || '';

      // Final fallback for models that use reasoning field, but we prefer content
      if (!text && (choice?.message as any)?.reasoning) {
        text = (choice?.message as any).reasoning;
      }

      // If still empty, check for reasoning_content (OpenAI O1/R1 style)
      if (!text && (choice?.message as any)?.reasoning_content) {
        text = (choice?.message as any).reasoning_content;
      }

      if (!text || text.trim().length === 0) {
        console.warn(`[SimpleAI] Model ${model} returned an empty response. Choices:`, JSON.stringify(completion.choices));
      }

      return {
        text,
        model: model,
      };
    } catch (error: any) {
      console.error(`[SimpleAI] Error with model ${model}:`, error.message);

      // Handle specific error types
      if (error.message?.includes('429') || error.status === 429) {
        throw new Error(`Rate limit exceeded. Please wait a moment and try again. If this persists, check your OpenRouter API key and model availability.`);
      } else if (error.message?.includes('401') || error.status === 401) {
        throw new Error(`Invalid API key. Please check your OPENROUTER_API_KEY in .env.local`);
      } else if (error.message?.includes('404') || error.status === 404) {
        throw new Error(`Model not found. Please check your OPENROUTER_MODEL in .env.local`);
      } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
        throw new Error(`API quota exceeded. Please check your OpenRouter account limits.`);
      }

      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  static async generateWithSchema<T>(input: SimpleAIInput & { schema: any; sessionId?: string }): Promise<T> {
    const { schema, sessionId, ...aiInput } = input;

    // Add JSON schema instruction to prompt
    const enhancedPrompt = `${aiInput.prompt}

Please respond with valid JSON that matches this schema. Do not include any markdown formatting or code blocks, just the raw JSON.

Required JSON structure:
${JSON.stringify(schema, null, 2)}`;

    const result = await this.generate({
      ...aiInput,
      prompt: enhancedPrompt,
    });

    // Always persist the raw AI response so we can debug or post-process it later
    let rawResponsePath: string | null = null;
    try {
      const tempDir = getWritableTempDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      rawResponsePath = join(tempDir, `ai-raw-response-${timestamp}.json`);
      writeFileSync(rawResponsePath, result.text, 'utf8');
      console.log(`[SimpleAI] Raw AI response saved to: ${rawResponsePath}`);

      // If we have a sessionId, also copy to analyzed/{sessionId}-ai-analysis.json immediately
      if (sessionId) {
        const analyzedDir = getWritableTempDir('analyzed');
        const analyzedPath = join(analyzedDir, `${sessionId}-ai-analysis.json`);
        writeFileSync(analyzedPath, result.text, 'utf8');
      }
    } catch (saveError: any) {
      console.error('[SimpleAI] Failed to save raw AI response:', saveError?.message || saveError);
    }

    // Helper: best-effort JSON extraction and parsing
    const tryParseJson = (raw: string): T => {
      const text = raw.trim();

      if (!text) {
        throw new Error('AI returned an empty response');
      }

      // Strategy 1: direct parse
      try {
        return JSON.parse(text) as T;
      } catch { }

      // Strategy 2: strip markdown fences
      let cleaned = text;
      // Handle the case where the model might include multiple blocks or prefixes
      const jsonFences = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonFences && jsonFences[1]) {
        cleaned = jsonFences[1].trim();
      } else {
        const anyFences = cleaned.match(/```\s*([\s\S]*?)\s*```/);
        if (anyFences && anyFences[1]) {
          cleaned = anyFences[1].trim();
        }
      }

      try {
        return JSON.parse(cleaned) as T;
      } catch { }

      // Strategy 3: extract first JSON object or array substring
      const candidates: string[] = [];

      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1) {
        if (lastBrace !== -1 && lastBrace > firstBrace) {
          candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
        } else {
          candidates.push(cleaned.slice(firstBrace)); // Take to end if no closing brace
        }
      }

      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1) {
        if (lastBracket !== -1 && lastBracket > firstBracket) {
          candidates.push(cleaned.slice(firstBracket, lastBracket + 1));
        } else {
          candidates.push(cleaned.slice(firstBracket)); // Take to end if no closing bracket
        }
      }

      for (const c of candidates) {
        try {
          return JSON.parse(c.trim()) as T;
        } catch {
          // continue to healing
        }
      }

      // Strategy 4: salvage just the `data` array if present, even if other parts are messy
      try {
        const dataMatch = cleaned.match(/"data"\s*:\s*(\[[\s\S]*\])/);
        if (dataMatch && dataMatch[1]) {
          let dataSegment = dataMatch[1];
          // Best-effort fix for trailing commas before closing brackets
          dataSegment = dataSegment.replace(/,(\s*[\]}])/g, '$1');
          const wrapped = `{ "data": ${dataSegment} }`;
          return JSON.parse(wrapped) as T;
        }
      } catch {
        // ignore and fall through
      }

      // Strategy 5: basic quote/bracket healing for truncated JSON
      const healAndParse = (snippet: string): T | null => {
        let s = snippet.trim();

        // If it starts with { but doesn't end with }, or matches [ but doesn't end with ],
        // it's likely truncated.

        // Remove trailing commas which often happen just before truncation
        s = s.replace(/,\s*$/, '');

        // Balance quotes
        const quoteCount = (s.match(/"/g) || []).length;
        if (quoteCount % 2 === 1) {
          s += '"';
        }

        // Extremely basic balancing for objects and arrays
        let openCurly = (s.match(/\{/g) || []).length;
        let closeCurly = (s.match(/\}/g) || []).length;
        if (openCurly > closeCurly) {
          s += '}'.repeat(openCurly - closeCurly);
        }

        let openSquare = (s.match(/\[/g) || []).length;
        let closeSquare = (s.match(/\]/g) || []).length;
        if (openSquare > closeSquare) {
          s += ']'.repeat(openSquare - closeSquare);
        }

        try {
          return JSON.parse(s) as T;
        } catch {
          // If still failing, try to find the last complete object/array element if it's an array
          try {
            if (s.startsWith('[') && !s.endsWith(']')) {
              const lastComma = s.lastIndexOf(',');
              if (lastComma !== -1) {
                const truncated = s.slice(0, lastComma) + ']';
                return JSON.parse(truncated) as T;
              }
            }
          } catch { }
          return null;
        }
      };

      const healedFromCleaned = healAndParse(cleaned);
      if (healedFromCleaned) return healedFromCleaned;

      for (const c of candidates) {
        const healed = healAndParse(c);
        if (healed) return healed;
      }

      throw new Error(`AI returned invalid JSON format. Raw output: ${text.slice(0, 100)}...`);
    };

    try {
      const parsed = tryParseJson(result.text) as any;
      if (rawResponsePath) {
        parsed._rawFilePath = rawResponsePath;
      }
      return parsed as T;
    } catch (parseError) {
      const preview = result.text.length > 1000 ? `${result.text.slice(0, 1000)}…` : result.text;
      console.error('[SimpleAI] Failed to parse JSON response (preview):', preview);
      console.error('[SimpleAI] Parse error:', parseError);
      throw parseError;
    }
  }

  static async structureRelevantChunksToDataset(input: StructureRelevantChunksInput): Promise<StructuredDataset> {
    const { chunks, userQuery, numRows, sessionId } = input;

    const MAX_TOTAL_CHARS = 170000;
    const limited: Array<{ url: string; title: string; content: string }> = [];
    let used = 0;

    for (const chunk of chunks) {
      let content = (chunk.content || '').trim();
      if (!content) continue;

      const remaining = MAX_TOTAL_CHARS - used;
      if (remaining <= 0) break;

      if (content.length > remaining) {
        content = content.slice(0, remaining);
      }

      limited.push({
        url: chunk.url,
        title: chunk.title || chunk.url,
        content,
      });
      used += content.length;
    }

    if (!limited.length) {
      throw new Error('No non-empty content available in relevant chunks');
    }

    const sourcesText = limited
      .map((item, index) => `Source ${index + 1}:
URL: ${item.url}
Title: ${item.title}
Content: ${item.content}`)
      .join('\n\n');

    const prompt = `You are an expert at data structuring and schema design.
Given refined web content and a user query, create a structured dataset with appropriate columns and data.

User Query: "${userQuery}"
Target Rows: ${numRows}

IMPORTANT ABOUT TARGET ROWS:
- Always treat Target Rows as the main limit on how many rows to output.
- If the user text mentions phrases like "top 10" or "top N" but Target Rows is larger, you should ignore that smaller number and aim to produce as many grounded rows as possible, up to Target Rows.

Refined Content:
${sourcesText}

PROCESSING STRATEGY (FOLLOW THIS):
- First, scan the overall structure to understand how the data is organized across sources.
- Identify sections that contain entity lists, tables, bullet lists, A-to-Z indexes, catalogs, or other repeated patterns that match the user query.
- Prefer well-structured sources (tables, lists, IMDB-style pages, A–Z lists) but still use other sources as support.
- Break the content mentally by source and process each source independently.
- Recognize patterns like "Name | Location | Type" or similar repeated structures and extract rows from them.
- Filter out JavaScript/CSS/HTML boilerplate, navigation, ads, and other noise.

ROW GRANULARITY (VERY IMPORTANT):
- Treat each distinct real-world entity mentioned in the sources as one row. Examples of entities:
  - For medical queries: each disease, condition, symptom group, treatment protocol, guideline, or dataset.
  - For products: each individual product or SKU.
  - For places: each hospital, clinic, college, or location.
- When a page lists many entities (e.g. a long list of diseases, symptoms, guidelines, or products), you should create one row per entity rather than summarizing them into a few broad rows.

MERGING AND DEDUPLICATION:
- Use information from ALL sources to fill in each row. If multiple sources clearly describe the same entity, you may merge their details into a single consolidated row.
- Do NOT over-merge: if there is any doubt whether two mentions are the same entity, keep them as separate rows.

ROW COUNT AND RECALL:
- It is OK if some columns are empty or unknown for a row. Do NOT drop a row just because some fields are missing.
- Extract as many **real** rows as possible, up to the Target Rows value.
- If the sources clearly contain many entities (e.g. hundreds of diseases or products) and Target Rows is large, prefer generating close to Target Rows rather than only a small representative sample.
- Never invent entities that are not grounded in the sources.

Return your response as a JSON object with this exact structure:
{
  "schema": [
    {
      "name": "column_name",
      "type": "String|Number|Date|Boolean",
      "description": "what this column represents"
    }
  ],
  "data": [
    {
      "column1": "value1",
      "column2": "value2"
    }
  ],
  "reasoning": "explanation of the schema design and data extraction approach"
}`;

    const schemaShape = {
      schema: [
        {
          name: 'column_name',
          type: 'String|Number|Date|Boolean',
          description: 'what this column represents',
        },
      ],
      data: [
        {
          column1: 'value1',
          column2: 'value2',
        },
      ],
      reasoning: 'text',
    };

    const result = await SimpleAI.generateWithSchema<StructuredDataset>({
      prompt,
      schema: schemaShape,
      model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free',
      maxTokens: 5000,
      temperature: 0.3,
      sessionId,
    });

    // If we have a sessionId and a saved raw file, copy it to temp/analyzed/{sessionId}-ai-analysis.json
    try {
      const rawPath = (result as any)?._rawFilePath as string | undefined;
      if (sessionId && rawPath) {
        const analyzedDir = getWritableTempDir('analyzed');
        const analyzedPath = join(analyzedDir, `${sessionId}-ai-analysis.json`);
        const rawText = readFileSync(rawPath, 'utf8');
        writeFileSync(analyzedPath, rawText, 'utf8');
        (result as any).rawFilePath = analyzedPath;
      }
    } catch (copyErr: any) {
      console.error('[SimpleAI] Failed to copy raw AI response to analyzed folder:', copyErr?.message || copyErr);
    }

    if (!Array.isArray(result.data)) {
      result.data = [];
    }

    if (!Array.isArray(result.schema)) {
      result.schema = [];
    }

    return result;
  }
}

// Note: ai object, compatibility functions, and schema builder removed since we're using zod directly
