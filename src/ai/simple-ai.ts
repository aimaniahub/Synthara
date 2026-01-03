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
  logger?: {
    log: (msg: string) => void;
    info: (msg: string) => void;
    success: (msg: string) => void;
    error: (msg: string) => void;
    progress: (step: string, current: number, total: number, details?: string) => void;
  };
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

      // Determine if this is a JSON request
      const isJsonRequest = prompt.toLowerCase().includes('json');

      // Build messages with system prompt to enforce JSON output
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

      if (isJsonRequest) {
        // Updated system message: Allow thinking but require final JSON
        messages.push({
          role: 'system',
          content: `You are a data extraction assistant. You may reason or think step-by-step to ensure accuracy, but you MUST end your response with a valid JSON object matching the requested schema. The JSON block should be clearly identifiable and the very last thing in your response.`
        });
      }

      messages.push({ role: 'user', content: prompt });

      const completion = await openRouterClient.chat.completions.create({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
        // Removed response_format: 'json_object' to allow for thinking preambles
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

    // Helper: best-effort JSON extraction and parsing - NEVER THROWS, always returns valid data
    const tryParseJson = (raw: string): T => {
      const text = raw.trim();

      // Create empty fallback that matches expected schema
      const emptyFallback = { schema: [], data: [], reasoning: 'Failed to parse AI response - returning empty result' } as T;

      if (!text) {
        console.warn('[SimpleAI] AI returned empty response, using fallback');
        return emptyFallback;
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

      // Strategy 2.5: Heal truncated JSON
      try {
        const healed = this.healJson(cleaned);
        if (healed) return JSON.parse(healed) as T;
      } catch { }

      // Strategy 3: extract JSON blocks, prioritizing the one matching the schema found from the end
      const candidates: string[] = [];

      // Find all { and [ to find the largest/most complete blocks
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
      }

      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        candidates.push(cleaned.slice(firstBracket, lastBracket + 1));
      }

      // Also try searching from the END for the last block (often where the real JSON is after thinking)
      const lastBraceStart = cleaned.lastIndexOf('{');
      if (lastBraceStart !== -1 && lastBraceStart !== firstBrace) {
        candidates.push(cleaned.slice(lastBraceStart, lastBrace + 1));
      }

      // Specifically look for the block containing "data" and "schema"
      const dataSchemaMatch = cleaned.match(/\{[\s\S]*?"schema"[\s\S]*?"data"[\s\S]*?\}/g);
      if (dataSchemaMatch) {
        candidates.push(dataSchemaMatch[dataSchemaMatch.length - 1]); // Take the last one
      }

      for (const c of candidates) {
        try {
          const parsed = JSON.parse(c.trim());
          // If it looks like our structured dataset, we found it
          if (parsed && (Array.isArray(parsed.data) || Array.isArray(parsed.schema))) {
            return parsed as T;
          }
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

      // Strategy 6: For thinking/reasoning models - find the LAST complete JSON object in the text
      // Thinking models often output reasoning first, then JSON at the end
      try {
        // Find all positions of { and } to locate JSON objects
        const allBraces = [];
        let depth = 0;
        let startPos = -1;

        for (let i = 0; i < text.length; i++) {
          if (text[i] === '{') {
            if (depth === 0) startPos = i;
            depth++;
          } else if (text[i] === '}') {
            depth--;
            if (depth === 0 && startPos !== -1) {
              allBraces.push({ start: startPos, end: i });
              startPos = -1;
            }
          }
        }

        // Try parsing from the LAST JSON object (thinking models usually put it at the end)
        for (let i = allBraces.length - 1; i >= 0; i--) {
          const { start, end } = allBraces[i];
          const jsonCandidate = text.slice(start, end + 1);
          try {
            const parsed = JSON.parse(jsonCandidate);
            // Validate it has expected structure
            if (parsed && (parsed.schema || parsed.data || Array.isArray(parsed))) {
              console.log(`[SimpleAI] Found valid JSON at position ${start}-${end} (Strategy 6)`);
              return parsed as T;
            }
          } catch { }
        }
      } catch { }

      // Strategy 7: Extract structured data from thinking/reasoning text (deepseek-r1t2 pattern)
      // When thinking models output reasoning with patterns like "- Name: value" or "CMP_Rs: 123.45"
      try {
        const lines = text.split('\n');
        const extractedRows: Record<string, any>[] = [];
        let currentRow: Record<string, any> | null = null;
        const columnNames: string[] = [];

        // Pattern 1: Look for "Row N:" followed by field assignments
        for (const line of lines) {
          const rowMatch = line.match(/^Row\s*(\d+)[\s:]/i);
          if (rowMatch) {
            if (currentRow && Object.keys(currentRow).length > 0) {
              extractedRows.push(currentRow);
            }
            currentRow = {};
          }

          // Pattern 2: Look for "- field: value" patterns
          const fieldMatch = line.match(/^[-•]\s*(\w[\w_\s]*?):\s*(.+)$/);
          if (fieldMatch && currentRow) {
            const key = fieldMatch[1].trim().replace(/\s+/g, '_');
            const value = fieldMatch[2].trim();
            currentRow[key] = value;
            if (!columnNames.includes(key)) columnNames.push(key);
          }

          // Pattern 3: Look for "Name: \"value\"" or "Name = value" patterns  
          const directMatch = line.match(/^(\w[\w_\s]*?)\s*[:=]\s*["']?([^"'\n,]+)["']?$/);
          if (directMatch && currentRow) {
            const key = directMatch[1].trim().replace(/\s+/g, '_');
            const value = directMatch[2].trim();
            if (key.length > 1 && key.length < 30 && value.length > 0) {
              currentRow[key] = value;
              if (!columnNames.includes(key)) columnNames.push(key);
            }
          }
        }

        // Push last row if exists
        if (currentRow && Object.keys(currentRow).length > 0) {
          extractedRows.push(currentRow);
        }

        // If we found multiple rows with consistent columns, return as structured data
        if (extractedRows.length >= 2 && columnNames.length >= 2) {
          console.log(`[SimpleAI] Extracted ${extractedRows.length} rows from thinking text (Strategy 7)`);
          const schema = columnNames.map(name => ({ name, type: 'String' }));
          return { schema, data: extractedRows, reasoning: 'Extracted from thinking text' } as any as T;
        }
      } catch { }

      // Strategy 8: ULTIMATE FALLBACK - never throw, return empty valid structure
      console.warn(`[SimpleAI] All JSON parsing strategies failed. Returning empty fallback. Raw preview: ${text.slice(0, 200)}...`);
      return emptyFallback;
    };

    try {
      const parsed = tryParseJson(result.text) as any;
      if (rawResponsePath) {
        parsed._rawFilePath = rawResponsePath;
      }
      return parsed as T;
    } catch (parseError: any) {
      // This should never happen now, but just in case
      console.error('[SimpleAI] Unexpected parse error (should not happen):', parseError?.message);
      return { schema: [], data: [], reasoning: 'Unexpected parsing error' } as T;
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

    const totalChars = sourcesText.length;
    const estTokens = Math.round(totalChars / 4);

    const statsMsg = `[SimpleAI] Sending ${totalChars.toLocaleString()} characters (~${estTokens.toLocaleString()} tokens) to AI from ${limited.length} sources.`;
    console.log(statsMsg);
    input.logger?.info(`📊 Data Batch: ${limited.length} pages, ${totalChars.toLocaleString()} chars (~${estTokens.toLocaleString()} tokens)`);

    // STEP 1: EXHAUSTIVE DRAFT EXTRACTION
    const p1Msg = `Phase 1: Researching & Extracting Data Exhaustively...`;
    console.log(`[SimpleAI] ${p1Msg} for "${userQuery}"...`);
    input.logger?.log(`🔍 ${p1Msg}`);
    input.logger?.progress('Research Phase', 3, 5, 'Collecting every relevant detail from corpus');
    const draftPrompt = `You are a data researcher. Your goal is to EXHAUSTIVELY extract every single entity and detail from the provided corpus that relates to the user query.

User Query: "${userQuery}"

<corpus>
${sourcesText}
</corpus>

INSTRUCTIONS:
1. Go through EVERY source.
2. Extract ALL relevant entities (e.g., if query is about cars, list every car model, price, and launch date mentioned).
3. Do not worry about JSON format yet. Just provide a clear, comprehensive list of all data found.
4. If no exact matches are found, extract closely related entities.
5. Provide as much detail as possible for each entity discovered.`;

    const draftResult = await this.generate({
      prompt: draftPrompt,
      model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free',
      temperature: 0.7, // Higher for better discovery
      maxTokens: 16384, // High limit for research phase
      sessionId: sessionId ? `${sessionId}-draft` : undefined,
    });

    const draftContent = draftResult.text;

    // Persist the Draft so the user can see it
    try {
      const tempDir = getWritableTempDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const draftPath = join(tempDir, `ai-research-draft-${timestamp}.txt`);
      writeFileSync(draftPath, draftContent, 'utf8');
      const saveMsg = `Phase 1 Research Draft saved: ${draftPath}`;
      console.log(`[SimpleAI] ${saveMsg}`);
      input.logger?.log(`📝 ${saveMsg}`);
    } catch (e: any) {
      console.warn(`[SimpleAI] Failed to save Step 1 draft: ${e.message}`);
    }

    // STEP 2: DYNAMIC SCHEMA & STRICT FORMATTING
    const p2Msg = `Phase 2: Inducing Dynamic Schema & Creating Dataset...`;
    console.log(`[SimpleAI] ${p2Msg} (Target: Up to ${numRows} rows)...`);
    input.logger?.log(`🏗️ ${p2Msg}`);
    input.logger?.progress('Structuring Phase', 4, 5, 'Mapping best-fit columns to discovered data');
    const finalPrompt = `You are a data architect. Convert the provided Research Draft into a strict JSON dataset.

<research_draft>
${draftContent}
</research_draft>

INSTRUCTIONS:
1. INDUCE SCHEMA: First, analyze the draft to identify the most relevant 3-7 columns that capture the discovered data. 
2. DATA DENSITY: Do NOT include columns if they will be mostly empty (N/A). Only create columns that have high coverage across the entities.
3. Rows: Extract UP TO ${numRows} UNIQUE entities.
4. NO PADDING: If you found fewer than ${numRows} unique entities, stop there. Do not repeat.
5. NO MONOLOGUE: Return ONLY the JSON object. No preamble. No side-text. No listing of what you skipped.
6. FORMAT: Ensure the JSON matches the schema you define.

JSON Structure Template:
{
  "schema": [
    { "name": "col_one", "type": "String", "description": "..." },
    { "name": "col_two", "type": "String", "description": "..." }
  ],
  "data": [
    { "col_one": "value", "col_two": "value" }
  ],
  "reasoning": "Summary of extraction"
}
`;

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
      reasoning: 'Brief explanation of findings',
    };

    const result = await SimpleAI.generateWithSchema<StructuredDataset>({
      prompt: finalPrompt,
      schema: schemaShape,
      model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free',
      temperature: 0.1, // Lower for strict JSON adherence
      maxTokens: 16384, // Ensure we have enough space for the full dataset
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

  /**
   * Attempts to heal truncated JSON by closing open brackets/braces
   */
  private static healJson(json: string): string | null {
    let text = json.trim();
    if (!text) return null;

    // Remove any trailing commas that make it invalid before closing
    text = text.replace(/,\s*$/, "");

    // Count open/close structures
    let openBraces = (text.match(/\{/g) || []).length;
    let closeBraces = (text.match(/\}/g) || []).length;
    let openBrackets = (text.match(/\[/g) || []).length;
    let closeBrackets = (text.match(/\]/g) || []).length;

    // If it's already balanced, just return
    if (openBraces === closeBraces && openBrackets === closeBrackets) return text;

    let healed = text;

    // If it ends mid-string, close the string
    const lastQuote = text.lastIndexOf('"');
    const isUnclosedString = (text.match(/"/g) || []).length % 2 !== 0;
    if (isUnclosedString) {
      // If we are mid-key or mid-value, try to find a stopping point
      healed += '"';
    }

    // Close objects then arrays in reverse order of found opening
    // This is a simple stack-based closer
    const stack: string[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') stack.push('}');
      else if (text[i] === '[') stack.push(']');
      else if (text[i] === '}') stack.pop();
      else if (text[i] === ']') stack.pop();
    }

    while (stack.length > 0) {
      healed += stack.pop();
    }

    return healed;
  }
}

// Note: ai object, compatibility functions, and schema builder removed since we're using zod directly
