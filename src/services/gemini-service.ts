/**
 * Gemini AI Service
 * Service for interacting with Google Gemini 2.5 Flash API
 */

export interface GeminiSearchQuery {
  query: string;
  reasoning: string;
  priority: number;
}

export interface GeminiSearchQueriesResponse {
  success: boolean;
  queries: GeminiSearchQuery[];
  error?: string;
}

export interface GeminiRefinedContent {
  url: string;
  title: string;
  relevantContent: string;
  confidence: number;
}

export interface GeminiContentRefinementResponse {
  success: boolean;
  refinedContent: GeminiRefinedContent[];
  error?: string;
}

export interface GeminiDataSchema {
  name: string;
  type: string;
  description: string;
}

export interface GeminiStructuredData {
  schema: GeminiDataSchema[];
  data: Array<Record<string, any>>;
  reasoning: string;
}

export interface GeminiDataStructuringResponse {
  success: boolean;
  structuredData: GeminiStructuredData;
  error?: string;
}

export interface GeminiCompleteDatasetAnalysisResponse {
  success: boolean;
  data: Array<Record<string, any>>;
  schema: Array<{ name: string; type: string }>;
  feedback?: string;
  error?: string;
}

export class GeminiService {
  private apiKey: string;
  private apiKeys: string[] = [];
  private keyIndex: number = 0;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

  constructor(apiKeyOrKeys?: string | string[]) {
    let keys: string[] = [];
    if (Array.isArray(apiKeyOrKeys)) {
      keys = apiKeyOrKeys;
    } else if (apiKeyOrKeys) {
      keys = [apiKeyOrKeys];
    } else if (process.env.GOOGLE_GEMINI_API_KEYS) {
      const multi = String(process.env.GOOGLE_GEMINI_API_KEYS);
      keys = multi.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    } else if (process.env.GOOGLE_GEMINI_API_KEY) {
      keys = [String(process.env.GOOGLE_GEMINI_API_KEY)];
    }
    this.apiKeys = Array.from(new Set(keys));
    this.apiKey = this.apiKeys[0] || '';
    if (!this.apiKey) {
      console.warn('[Gemini] No API key provided. Gemini functionality will be limited.');
    }
  }

  private getCurrentApiKey(): string {
    return this.apiKeys.length > 0 ? this.apiKeys[this.keyIndex] : this.apiKey;
  }

  private rotateApiKey(): void {
    if (this.apiKeys.length > 0) {
      this.keyIndex = (this.keyIndex + 1) % this.apiKeys.length;
      this.apiKey = this.apiKeys[this.keyIndex];
      console.warn(`[Gemini] Switched API key (index ${this.keyIndex + 1}/${this.apiKeys.length})`);
    }
  }

  /**
   * Generate search queries from user prompt
   */
  async generateSearchQueries(userQuery: string): Promise<GeminiSearchQueriesResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          queries: [],
          error: 'Gemini API key not configured'
        };
      }

      console.log(`[Gemini] Generating search queries for: "${userQuery.substring(0, 100)}..."`);

      const prompt = `Generate 2 simple, diverse search queries for web search.

User Query: "${userQuery}"

Generate queries that:
1. Are simple and natural (how humans search)
2. Use plain keywords without advanced operators
3. Focus on finding relevant data sources
4. Are DIFFERENT from each other (avoid similar queries)
5. Cover different aspects of the topic

AVOID: site: operators, OR operators, quotes, exclusions, date filters, duplicate concepts

Examples of GOOD diverse queries:
- "restaurants in mumbai with ratings" + "mumbai food delivery reviews"
- "electric vehicle charging bangalore" + "EV charging station locations"
- "kannada movies 2025" + "kannada film industry news"

Examples of BAD queries (too similar):
- "iPhone sales 2025" + "iPhone sales Q1 2025" (too similar)
- "Apple earnings" + "Apple financial results" (too similar)

Return JSON: { "queries": [{"query": "...", "reasoning": "...", "priority": 1}] }`;

      const response = await this.callGeminiAPI(prompt);

      if (!response.success) {
        return {
          success: false,
          queries: [],
          error: response.error
        };
      }

      // Extract JSON from markdown code blocks if present
      const jsonText = this.extractJsonFromResponse(response.text);
      const parsed = JSON.parse(jsonText);
      const queries: GeminiSearchQuery[] = parsed.queries || [];

      console.log(`[Gemini] Generated ${queries.length} search queries`);

      return {
        success: true,
        queries
      };

    } catch (error: any) {
      console.error('[Gemini] Generate search queries error:', error);
      return {
        success: false,
        queries: [],
        error: error.message
      };
    }
  }

  /**
   * Refine scraped content to remove noise and keep relevant information
   */
  async refineContent(
    scrapedContent: Array<{ url: string, title: string, content: string }>,
    userQuery: string
  ): Promise<GeminiContentRefinementResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          refinedContent: [],
          error: 'Gemini API key not configured'
        };
      }

      console.log(`[Gemini] Refining content from ${scrapedContent.length} sources`);

      const contentSummary = scrapedContent.map((item, index) =>
        `Source ${index + 1}:
URL: ${item.url}
Title: ${item.title}
Content: ${item.content.substring(0, 1000)}...`
      ).join('\n\n');

      const prompt = `You are an expert at content refinement for data extraction. 
Given scraped web content and a user query, filter out noise and keep only relevant information.

User Query: "${userQuery}"

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
}

Set confidence between 0-1 based on how relevant the content is to the user query. Rate content 0.3+ if it contains ANY relevant data, even if the page has other content.`;

      const response = await this.callGeminiAPI(prompt);

      if (!response.success) {
        return {
          success: false,
          refinedContent: [],
          error: response.error
        };
      }

      // Extract JSON from markdown code blocks if present
      const jsonText = this.extractJsonFromResponse(response.text);
      const parsed = JSON.parse(jsonText);
      const refinedContent: GeminiRefinedContent[] = parsed.refinedContent || [];

      console.log(`[Gemini] Refined content from ${scrapedContent.length} to ${refinedContent.length} sources`);

      return {
        success: true,
        refinedContent
      };

    } catch (error: any) {
      console.error('[Gemini] Refine content error:', error);
      return {
        success: false,
        refinedContent: [],
        error: error.message
      };
    }
  }

  /**
   * Structure refined content into a dataset with proper schema
   */
  async structureData(
    refinedContent: GeminiRefinedContent[],
    userQuery: string,
    numRows: number
  ): Promise<GeminiDataStructuringResponse> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          structuredData: { schema: [], data: [], reasoning: '' },
          error: 'Gemini API key not configured'
        };
      }

      console.log(`[Gemini] Structuring data from ${refinedContent.length} sources for ${numRows} rows`);

      const contentSummary = refinedContent.map((item, index) =>
        `Source ${index + 1}:
URL: ${item.url}
Title: ${item.title}
Content: ${item.relevantContent}
Confidence: ${item.confidence}`
      ).join('\n\n');

      const prompt = `You are an expert at data structuring and schema design. 
Given refined web content and a user query, create a structured dataset with appropriate columns and data.

User Query: "${userQuery}"
Target Rows: ${numRows}

Refined Content:
${contentSummary}

Analyze the user query to determine what kind of data structure would be most useful. Create a schema with columns that would best represent the information the user is looking for.

IMPORTANT: Combine data from ALL sources to create comprehensive dataset. If sources have partial data, merge them intelligently. Extract maximum possible rows, even if some fields are null.

For movie data: Extract from IMDb ratings, cast lists, plot summaries
For restaurant data: Extract from review snippets, rating displays, address text  
For EV stations: Extract from location maps, station lists, provider directories

For each piece of relevant content, extract data that fits the schema and create data rows. If there isn't enough data to fill all ${numRows} rows, create as many as possible with the available information.

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
}

Make sure the data is clean, consistent, and directly relevant to the user query.`;

      const response = await this.callGeminiAPI(prompt);

      if (!response.success) {
        return {
          success: false,
          structuredData: {
            schema: [],
            data: [],
            reasoning: ''
          },
          error: response.error
        };
      }

      // Extract JSON from markdown code blocks if present
      const jsonText = this.extractJsonFromResponse(response.text);
      const parsed = JSON.parse(jsonText);
      const structuredData: GeminiStructuredData = {
        schema: parsed.schema || [],
        data: parsed.data || [],
        reasoning: parsed.reasoning || ''
      };

      console.log(`[Gemini] Structured data: ${structuredData.data.length} rows, ${structuredData.schema.length} columns`);

      return {
        success: true,
        structuredData
      };

    } catch (error: any) {
      console.error('[Gemini] Structure data error:', error);
      return {
        success: false,
        structuredData: { schema: [], data: [], reasoning: '' },
        error: error.message
      };
    }
  }

  /**
   * Analyze already-selected relevant chunks and structure them into a dataset
   * This is used by the intelligent web scraping flow after chunk + relevance selection,
   * so we only send a bounded subset of scraped text into the model.
   */
  async analyzeRelevantChunksToStructuredData(
    chunks: Array<{ url: string; title: string; content: string }>,
    userQuery: string,
    numRows: number
  ): Promise<GeminiDataStructuringResponse> {
    try {
      if (!this.apiKey && !this.shouldUseOpenRouter()) {
        return {
          success: false,
          structuredData: { schema: [], data: [], reasoning: '' },
          error: 'No AI provider configured (Gemini or OpenRouter)'
        };
      }

      // Enforce a hard character budget across all chunks to stay within token limits
      const MAX_TOTAL_CHARS = 40000;
      const limitedChunks: GeminiRefinedContent[] = [];
      let used = 0;

      for (const chunk of chunks) {
        let content = chunk.content || '';
        if (!content.trim()) continue;

        const remaining = MAX_TOTAL_CHARS - used;
        if (remaining <= 0) break;

        if (content.length > remaining) {
          content = content.slice(0, remaining);
        }

        limitedChunks.push({
          url: chunk.url,
          title: chunk.title || chunk.url,
          relevantContent: content,
          confidence: 1,
        });
        used += content.length;
      }

      if (limitedChunks.length === 0) {
        return {
          success: false,
          structuredData: { schema: [], data: [], reasoning: '' },
          error: 'No non-empty content available in relevant chunks'
        };
      }

      console.log(`[Gemini] Structuring ${limitedChunks.length} relevant chunks (≈${used} chars) for ${numRows} rows`);

      // Reuse the existing structuring pipeline to keep JSON handling consistent
      return this.structureData(limitedChunks, userQuery, numRows);
    } catch (error: any) {
      console.error('[Gemini] analyzeRelevantChunksToStructuredData error:', error);
      return {
        success: false,
        structuredData: { schema: [], data: [], reasoning: '' },
        error: error.message
      };
    }
  }

  /**
   * Generate free-form content and return raw text
   */
  async generateContent(prompt: string): Promise<{ text: string }> {
    const response = await this.callGeminiAPI(prompt);
    if (!response.success) {
      throw new Error(response.error || 'Gemini API call failed');
    }
    return { text: response.text };
  }

  /**
   * Call Gemini API with retry logic and rate limiting
   */
  private async callGeminiAPI(prompt: string, maxRetries: number = 3): Promise<{ success: boolean, text: string, error?: string }> {
    const totalKeys = this.apiKeys.length > 0 ? this.apiKeys.length : (this.apiKey ? 1 : 0);
    if (totalKeys === 0) {
      return { success: false, text: '', error: 'Gemini API key not configured' };
    }
    let triedKeys = 0;
    let lastError = '';
    while (triedKeys < totalKeys) {
      const currentKey = this.getCurrentApiKey();
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(`${this.baseUrl}?key=${currentKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json'
              }
            })
          });

          if (!response.ok) {
            if (response.status === 429) {
              const retryAfter = response.headers.get('retry-after');
              const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
              console.warn(`[Gemini] Rate limited (429). Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
              if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, waitTime));
                continue;
              } else {
                lastError = `Rate limited with current key after ${maxRetries} retries`;
                break;
              }
            }
            if (response.status === 401 || response.status === 403 || response.status === 400) {
              lastError = `Auth/quota error: ${response.status} ${response.statusText}`;
              break;
            }
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          if (data?.error) {
            lastError = String(data.error.message || 'Unknown API error');
            if (/key|auth|permission|quota/i.test(lastError)) {
              break;
            }
            throw new Error(`Gemini API error: ${lastError}`);
          }

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            throw new Error('No response text from Gemini API');
          }
          return { success: true, text };
        } catch (error: any) {
          console.warn(`[Gemini] Attempt ${attempt} with current key failed:`, error.message);
          if (attempt < maxRetries) {
            const baseDelay = Math.pow(2, attempt) * 1000;
            const jitter = Math.random() * 1000;
            const waitTime = baseDelay + jitter;
            console.log(`[Gemini] Waiting ${Math.round(waitTime)}ms before retry ${attempt + 1}/${maxRetries}`);
            await new Promise(r => setTimeout(r, waitTime));
            continue;
          }
          lastError = error.message;
        }
      }
      this.rotateApiKey();
      triedKeys++;
    }
    return { success: false, text: '', error: lastError || 'All API keys exhausted' };
  }

  /**
   * Determine if OpenRouter (DeepSeek) should be used for analysis
   */
  private shouldUseOpenRouter(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  /**
   * Call OpenRouter Chat Completions API with retry logic
   */
  private async callOpenRouterAPI(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model?: string,
    maxRetries: number = 2
  ): Promise<{ success: boolean; text: string; error?: string }> {
    const apiKey = process.env.OPENROUTER_API_KEY ? String(process.env.OPENROUTER_API_KEY) : '';
    if (!apiKey) {
      return { success: false, text: '', error: 'OpenRouter API key not configured' };
    }

    const targetModel = model || String(process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat');
    let lastError = '';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: targetModel,
            messages,
            temperature: 0.3,
            top_p: 0.95,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const wait = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
            if (attempt < maxRetries) {
              await new Promise(r => setTimeout(r, wait));
              continue;
            }
          }
          if (response.status === 401 || response.status === 403) {
            lastError = `OpenRouter auth error: ${response.status} ${response.statusText}`;
            break;
          }
          throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || '';
        if (!text) throw new Error('No response text from OpenRouter');
        return { success: true, text };
      } catch (err: any) {
        lastError = err.message;
        if (attempt < maxRetries) {
          const wait = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
      }
    }
    return { success: false, text: '', error: lastError || 'OpenRouter call failed' };
  }

  /**
   * Extract JSON from markdown code blocks if present with robust parsing
   */
  private extractJsonFromResponse(text: string): string {
    console.log(`[Gemini] Extracting JSON from response (${text.length} characters)`);

    // Strategy 1: Look for JSON in markdown code blocks (most common)
    const codeBlockPatterns = [
      /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g,
      /```(?:json)?\s*(\[[\s\S]*?\])\s*```/g,
      /```json\s*([\s\S]*?)\s*```/g
    ];

    for (const pattern of codeBlockPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const extracted = match[1].trim();
          console.log(`[Gemini] Found JSON in code block: ${extracted.substring(0, 200)}...`);

          // Validate JSON structure
          if (this.isValidJsonStructure(extracted)) {
            return this.cleanJsonString(extracted);
          }
        }
      }
    }

    // Strategy 2: Look for JSON objects/arrays without code blocks
    const jsonPatterns = [
      /\{[\s\S]*\}/g,
      /\[[\s\S]*\]/g
    ];

    for (const pattern of jsonPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const extracted = match[0].trim();
        console.log(`[Gemini] Found JSON without code blocks: ${extracted.substring(0, 200)}...`);

        if (this.isValidJsonStructure(extracted)) {
          return this.cleanJsonString(extracted);
        }
      }
    }

    // Strategy 3: Look for JSON-like content and try to extract it
    const jsonLikePattern = /(?:^|\n)\s*(\{[\s\S]*?\})\s*(?:\n|$)/;
    const jsonLikeMatch = text.match(jsonLikePattern);
    if (jsonLikeMatch && jsonLikeMatch[1]) {
      const extracted = jsonLikeMatch[1].trim();
      console.log(`[Gemini] Found JSON-like content: ${extracted.substring(0, 200)}...`);

      if (this.isValidJsonStructure(extracted)) {
        return this.cleanJsonString(extracted);
      }
    }

    // Strategy 4: Try to find and extract any valid JSON from the text
    const lines = text.split('\n');
    let jsonLines: string[] = [];
    let inJsonBlock = false;
    let braceCount = 0;
    let bracketCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Start of JSON block
      if (trimmedLine.startsWith('{') || trimmedLine.startsWith('[')) {
        inJsonBlock = true;
        jsonLines = [trimmedLine];
        braceCount = (trimmedLine.match(/\{/g) || []).length;
        bracketCount = (trimmedLine.match(/\[/g) || []).length;
        continue;
      }

      // Continue JSON block
      if (inJsonBlock) {
        jsonLines.push(trimmedLine);
        braceCount += (trimmedLine.match(/\{/g) || []).length;
        bracketCount += (trimmedLine.match(/\[/g) || []).length;

        // Check if JSON block is complete
        const closeBraces = (trimmedLine.match(/\}/g) || []).length;
        const closeBrackets = (trimmedLine.match(/\]/g) || []).length;

        if (braceCount <= closeBraces && bracketCount <= closeBrackets) {
          const extracted = jsonLines.join(' ').trim();
          console.log(`[Gemini] Extracted multi-line JSON: ${extracted.substring(0, 200)}...`);

          if (this.isValidJsonStructure(extracted)) {
            return this.cleanJsonString(extracted);
          }

          inJsonBlock = false;
          jsonLines = [];
        }
      }
    }

    // Strategy 5: Try all candidates and pick the first parseable
    const candidates = this.extractAllJsonCandidates(text);
    for (const c of candidates) {
      const parsed = this.safeParseJson(c);
      if (parsed !== null) {
        try { return JSON.stringify(parsed); } catch { }
      }
    }

    // Guaranteed safe minimal JSON to prevent parse errors upstream
    console.log(`[Gemini] No valid JSON found. Returning empty JSON object.`);
    return '{}';
  }

  /**
   * Check if a string looks like valid JSON structure
   */
  private isValidJsonStructure(text: string): boolean {
    const trimmed = text.trim();

    // Must start with { or [
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
    }

    // Must have balanced braces/brackets
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;

    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      return false;
    }

    // Must end with } or ]
    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
      return false;
    }

    return true;
  }

  /**
   * Complete truncated JSON by adding missing closing brackets/braces
   */
  private completeTruncatedJson(jsonString: string): string {
    let completed = jsonString.trim();

    // Count opening and closing braces/brackets
    const openBraces = (completed.match(/\{/g) || []).length;
    const closeBraces = (completed.match(/\}/g) || []).length;
    const openBrackets = (completed.match(/\[/g) || []).length;
    const closeBrackets = (completed.match(/\]/g) || []).length;

    // If we're in the middle of a string, try to close it
    if (completed.match(/"[^"]*$/)) {
      completed += '"';
    }

    // If we're in the middle of a property, try to close it
    if (completed.match(/:\s*"[^"]*$/)) {
      completed += '"';
    }

    // Add missing closing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      completed += ']';
    }

    // Add missing closing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      completed += '}';
    }

    console.log(`[Gemini] Completed truncated JSON: ${completed.substring(0, 200)}...`);
    return completed;
  }

  /**
   * Clean and fix common JSON issues with robust error handling
   */
  private cleanJsonString(jsonString: string): string {
    let cleaned = jsonString.trim();

    // Remove any leading/trailing whitespace and newlines
    cleaned = cleaned.replace(/^\s+|\s+$/g, '');

    // Fix common issues step by step:

    // 1. Fix single quotes to double quotes (but be careful with apostrophes in text)
    cleaned = cleaned.replace(/([{,]\s*)'([^']*)'(\s*:)/g, '$1"$2"$3'); // Property names
    cleaned = cleaned.replace(/:\s*'([^']*)'(\s*[,}])/g, ': "$1"$2'); // String values

    // 2. Remove any trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // 3. Fix missing quotes around property names (only if not already quoted)
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

    // 4. Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned;
  }

  private extractAllJsonCandidates(text: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();
    const push = (s: string) => {
      const t = this.cleanJsonString(s.trim());
      if (t && !seen.has(t)) {
        seen.add(t);
        candidates.push(t);
      }
    };
    const codeBlockPatterns = [
      /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g,
      /```(?:json)?\s*(\[[\s\S]*?\])\s*```/g,
      /```json\s*([\s\S]*?)\s*```/g
    ];
    for (const pattern of codeBlockPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const m of matches) {
        if (m[1]) push(m[1]);
      }
    }
    const jsonPatterns = [
      /\{[\s\S]*?\}/g,
      /\[[\s\S]*?\]/g
    ];
    for (const pattern of jsonPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const m of matches) {
        if (m[0]) push(m[0]);
      }
    }
    return candidates;
  }

  private safeParseJson(jsonText: string): any | null {
    try {
      return JSON.parse(jsonText);
    } catch { }
    try {
      const fixed = this.cleanJsonString(jsonText);
      return JSON.parse(fixed);
    } catch { }
    try {
      const completed = this.completeTruncatedJson(jsonText);
      const fixedCompleted = this.cleanJsonString(completed);
      return JSON.parse(fixedCompleted);
    } catch { }
    return null;
  }

  private inferType(values: any[]): string {
    const nonNull = values.filter(v => v !== null && v !== undefined);
    if (nonNull.length === 0) return 'string';
    const boolCount = nonNull.filter(v => typeof v === 'boolean' || v === 'true' || v === 'false').length;
    if (boolCount === nonNull.length) return 'boolean';
    const numCount = nonNull.filter(v => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))).length;
    if (numCount === nonNull.length) return 'number';
    const dateCount = nonNull.filter(v => {
      const d = new Date(v as any);
      return !isNaN(d.getTime());
    }).length;
    if (dateCount === nonNull.length) return 'date';
    return 'string';
  }

  private inferSchemaFromData(data: Array<Record<string, any>>): Array<{ name: string; type: string; description?: string }> {
    const keys = Array.from(new Set(data.flatMap(row => Object.keys(row || {}))));
    return keys.map(k => {
      const values = data.map(row => row ? row[k] : undefined);
      return { name: k, type: this.inferType(values) };
    });
  }

  private normalizeStructuredResult(candidate: any): { schema: any[]; data: any[]; reasoning: string } | null {
    if (!candidate) return null;
    if (Array.isArray(candidate)) {
      if (candidate.length === 0) {
        return { schema: [], data: [], reasoning: 'Empty array candidate' };
      }
      const looksLikeSchema = candidate.every((c: any) => c && typeof c === 'object' && ('name' in c));
      if (looksLikeSchema) {
        const schema = candidate.map((c: any) => ({ name: String(c.name), type: c.type ? String(c.type).toLowerCase() : 'string', description: c.description }));
        return { schema, data: [], reasoning: 'Schema array detected' };
      }
      if (candidate.every((c: any) => c && typeof c === 'object' && !('name' in c && 'type' in c))) {
        const data = candidate as Array<Record<string, any>>;
        const schema = this.inferSchemaFromData(data);
        return { schema, data, reasoning: 'Data array detected with inferred schema' };
      }
      return null;
    }
    if (typeof candidate === 'object') {
      if ('columns' in candidate && 'rows' in candidate) {
        const cols = Array.isArray((candidate as any).columns) ? (candidate as any).columns : [];
        const rows = Array.isArray((candidate as any).rows) ? (candidate as any).rows : [];
        let data: any[] = [];
        if (rows.every((r: any) => Array.isArray(r))) {
          data = rows.map((r: any[]) => Object.fromEntries(cols.map((c: any, i: number) => [String(c), r[i]])));
        } else if (rows.every((r: any) => typeof r === 'object')) {
          data = rows;
        }
        const schema = cols.length > 0 ? cols.map((c: any) => ({ name: String(c), type: 'string' })) : this.inferSchemaFromData(data);
        return { schema, data, reasoning: 'columns/rows structure normalized' };
      }
      const hasSchema = Array.isArray((candidate as any).schema);
      const hasData = Array.isArray((candidate as any).data);
      if (hasSchema || hasData) {
        const schema = hasSchema ? (candidate as any).schema.map((c: any) => ({ name: String(c.name || c.column || c.key), type: c.type ? String(c.type).toLowerCase() : 'string', description: c.description })) : this.inferSchemaFromData(((candidate as any).data || []) as any);
        const data = hasData ? (candidate as any).data : [];
        return { schema, data, reasoning: 'schema/data object normalized' };
      }
    }
    return null;
  }

  private pickBestStructuredResult(parsedCandidates: any[]): { schema: any[]; data: any[]; reasoning: string } | null {
    for (const c of parsedCandidates) {
      const n = this.normalizeStructuredResult(c);
      if (n && n.schema && Array.isArray(n.schema)) {
        return n;
      }
    }
    const schemaOnly = parsedCandidates.find(c => Array.isArray(c) && c.every((x: any) => x && typeof x === 'object' && 'name' in x));
    const dataOnly = parsedCandidates.find(c => Array.isArray(c) && c.every((x: any) => x && typeof x === 'object' && !('name' in x && 'type' in x)));
    if (schemaOnly) {
      const schema = (schemaOnly as any[]).map((c: any) => ({ name: String(c.name), type: c.type ? String(c.type).toLowerCase() : 'string', description: c.description }));
      const data = Array.isArray(dataOnly) ? (dataOnly as any[]) : [];
      return { schema, data, reasoning: 'Combined schema array with data array (if any)' };
    }
    if (dataOnly) {
      const data = dataOnly as any[];
      const schema = this.inferSchemaFromData(data as any);
      return { schema, data, reasoning: 'Only data array present; inferred schema' };
    }
    return null;
  }

  /**
   * Analyze complete scraped dataset and create structured output
   */
  async analyzeCompleteDataset({
    userQuery,
    comprehensiveData,
    targetRows
  }: {
    userQuery: string;
    comprehensiveData: any;
    targetRows: number;
  }): Promise<GeminiCompleteDatasetAnalysisResponse> {
    try {
      if (!this.apiKey && !this.shouldUseOpenRouter()) {
        return {
          success: false,
          data: [],
          schema: [],
          error: 'No AI provider configured (Gemini or OpenRouter)'
        };
      }

      console.log(`[Gemini] Analyzing complete dataset: ${comprehensiveData.sources.length} sources, ${comprehensiveData.metadata.totalContentLength} characters`);

      // Log the first few sources for debugging
      console.log(`[Gemini] First source preview:`, {
        title: comprehensiveData.sources[0]?.title,
        contentLength: comprehensiveData.sources[0]?.contentLength,
        wordCount: comprehensiveData.sources[0]?.wordCount,
        contentPreview: comprehensiveData.sources[0]?.content?.substring(0, 200) + '...'
      });

      const prompt = `You are an expert data analyst. I have scraped comprehensive data from multiple web sources and need you to analyze ALL of this data to create a structured dataset based on the user's query.

USER QUERY: "${userQuery}"

COMPREHENSIVE SCRAPED DATA:
${comprehensiveData.combinedContent}

TASK:
1. Analyze ALL the scraped content thoroughly
2. Identify the most relevant information that matches the user's query
3. Create a logical schema based on what data is actually available
4. Generate ${targetRows} rows of structured data using the scraped information
5. Ensure data accuracy and completeness

REQUIREMENTS:
- Use ONLY information from the scraped data
- Create realistic, accurate data based on what's actually available
- Design a schema that makes sense for the user's query
- Generate exactly ${targetRows} rows
- Be thorough in your analysis of the complete dataset

RESPONSE FORMAT (JSON):
{
  "schema": [
    {
      "name": "column_name",
      "type": "String|Number|Date|Boolean"
    }
  ],
  "data": [
    {
      "column1": "value1",
      "column2": "value2"
    }
  ],
  "feedback": "Brief explanation of what data was found and how it was structured"
}`;

      const useOpenRouter = this.shouldUseOpenRouter();
      let response: { success: boolean; text: string; error?: string };
      if (useOpenRouter) {
        console.log(`[Gemini] Routing analysis to OpenRouter (DeepSeek)`);
        const messages = [
          { role: 'system' as const, content: 'You are a meticulous data analyst. Return ONLY valid JSON with schema and data. Do not include markdown or explanations outside JSON.' },
          { role: 'user' as const, content: prompt }
        ];
        response = await this.callOpenRouterAPI(messages, String(process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'));
      } else {
        console.log(`[Gemini] Sending prompt to Gemini API (${prompt.length} characters)...`);
        response = await this.callGeminiAPI(prompt);
      }

      if (!response.success) {
        console.error(`[Gemini] API call failed:`, response.error);
        return {
          success: false,
          data: [],
          schema: [],
          error: response.error
        };
      }

      console.log(`[Gemini] Received response from ${this.shouldUseOpenRouter() ? 'OpenRouter' : 'Gemini'} API (${response.text.length} characters)`);

      try {
        const jsonText = this.extractJsonFromResponse(response.text);
        const result = JSON.parse(jsonText);

        // Validate the response structure
        if (!result.schema || !Array.isArray(result.schema) || !result.data || !Array.isArray(result.data)) {
          throw new Error('Invalid response structure from Gemini');
        }

        console.log(`[Gemini] Complete dataset analysis: ${result.data.length} rows, ${result.schema.length} columns`);

        return {
          success: true,
          data: result.data,
          schema: result.schema,
          feedback: result.feedback || 'Dataset created from comprehensive web scraping analysis'
        };

      } catch (parseError: any) {
        console.error('[Gemini] Failed to parse complete dataset analysis response:', parseError);
        return {
          success: false,
          data: [],
          schema: [],
          error: `Failed to parse AI response: ${parseError.message}`
        };
      }

    } catch (error: any) {
      console.error('[Gemini] Complete dataset analysis error:', error);
      return {
        success: false,
        data: [],
        schema: [],
        error: error.message
      };
    }
  }

  /**
   * Analyze markdown content and generate structured data with retry logic
   */
  async analyzeMarkdownContent(
    markdownContent: string,
    userQuery: string,
    numRows: number,
    retryCount: number = 0
  ): Promise<GeminiDataStructuringResponse> {
    const maxRetries = 2;

    try {
      console.log(`[Gemini] Analyzing markdown content: ${markdownContent.length} characters (attempt ${retryCount + 1}/${maxRetries + 1})`);
      console.log(`[Gemini] User query: "${userQuery}"`);
      console.log(`[Gemini] Target rows: ${numRows}`);

      const prompt = `You are an expert data analyst. Analyze the scraped content and generate structured JSON data.

USER QUERY: ${userQuery}

TARGET ROWS: ${numRows}

MARKDOWN CONTENT:
${markdownContent}

CRITICAL INSTRUCTIONS:
1. Analyze ALL the markdown content thoroughly
2. Extract ONLY information that matches the user's query
3. Create a logical schema based on available data
4. Generate exactly ${numRows} rows of structured data
5. Use ONLY actual scraped content - do not fabricate data
6. Return ONLY valid JSON - no markdown, no explanations outside JSON
7. If no relevant data is found, create sample data based on the query context

REQUIRED JSON STRUCTURE:
{
  "schema": [
    {"name": "column_name", "type": "string", "description": "column description"}
  ],
  "data": [
    {"column_name": "actual_value_from_content"}
  ],
  "reasoning": "Brief explanation of data extraction"
}

IMPORTANT: Return ONLY the JSON object above. No markdown formatting, no additional text, no code blocks.`;

      const useOpenRouter = this.shouldUseOpenRouter();
      let response: { success: boolean; text: string; error?: string };
      if (useOpenRouter) {
        console.log(`[Gemini] Routing markdown analysis to OpenRouter (DeepSeek)`);
        const messages = [
          { role: 'system' as const, content: 'You are a meticulous data analyst. Return ONLY valid JSON with schema, data and reasoning. No markdown. No extra text.' },
          { role: 'user' as const, content: prompt }
        ];
        response = await this.callOpenRouterAPI(messages, String(process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'));
      } else {
        response = await this.callGeminiAPI(prompt);
      }

      if (!response.success) {
        console.error(`[Gemini] Markdown analysis API call failed:`, response.error);
        return {
          success: false,
          structuredData: {
            schema: [],
            data: [],
            reasoning: ''
          },
          error: response.error
        };
      }

      console.log(`[Gemini] Received markdown analysis response from ${this.shouldUseOpenRouter() ? 'OpenRouter' : 'Gemini'} (${response.text.length} characters)`);

      try {
        const candidates = this.extractAllJsonCandidates(response.text);
        const parsedCandidates = candidates.map(c => this.safeParseJson(c)).filter(Boolean) as any[];
        let best = this.pickBestStructuredResult(parsedCandidates);
        if (!best) {
          const direct = this.safeParseJson(response.text);
          best = this.normalizeStructuredResult(direct || {}) || { schema: [], data: [], reasoning: 'No structured JSON found' };
        }
        console.log(`[Gemini] Markdown analysis: ${best.data.length} rows, ${best.schema.length} columns`);
        return {
          success: true,
          structuredData: {
            schema: best.schema,
            data: best.data,
            reasoning: best.reasoning || 'Data generated from markdown content analysis'
          }
        };

      } catch (parseError: any) {
        console.error('[Gemini] Parsing failed, attempting retry with stricter instructions');
        console.error('[Gemini] Original response text:', response.text.substring(0, 1000));

        if (retryCount < maxRetries) {
          console.log(`[Gemini] Retrying with more explicit JSON instructions (retry ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          return this.analyzeMarkdownContent(markdownContent, userQuery, numRows, retryCount + 1);
        }
        return {
          success: true,
          structuredData: { schema: [], data: [], reasoning: 'Unable to parse structured JSON' }
        };
      }

    } catch (error: any) {
      console.error('[Gemini] Markdown analysis error:', error);

      // Retry on general errors if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        console.log(`[Gemini] Retrying after error (retry ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        return this.analyzeMarkdownContent(markdownContent, userQuery, numRows, retryCount + 1);
      }

      return {
        success: false,
        structuredData: {
          schema: [],
          data: [],
          reasoning: ''
        },
        error: error.message
      };
    }
  }

  /**
   * Extract partial JSON from malformed text and create valid structure
   */
  private extractPartialJson(text: string, userQuery: string): any | null {
    try {
      // Try to find any JSON-like structures in the text
      const jsonMatches = text.match(/\{[^{}]*\}/g);
      if (!jsonMatches || jsonMatches.length === 0) {
        return null;
      }

      // Try to parse each match
      for (const match of jsonMatches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed && typeof parsed === 'object') {
            // If it has schema and data, return it
            if (parsed.schema && parsed.data) {
              return parsed;
            }
            // If it's just data, create a schema
            if (Array.isArray(parsed)) {
              return this.createFallbackStructure(userQuery, parsed);
            }
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create a fallback structure based on user query
   */
  private createFallbackStructure(userQuery: string, data: any[] = []): any {
    const query = userQuery.toLowerCase();

    // Determine schema based on query content
    let schema: any[] = [];
    let sampleData: any[] = [];

    if (query.includes('electronic') || query.includes('product') || query.includes('flipkart')) {
      schema = [
        { name: "product_name", type: "string", description: "Name of the electronic product" },
        { name: "brand", type: "string", description: "Brand of the product" },
        { name: "category", type: "string", description: "Product category" },
        { name: "units_sold", type: "string", description: "Estimated units sold" },
        { name: "price_range_inr", type: "string", description: "Price range in INR" }
      ];
      sampleData = [
        {
          product_name: "iPhone 15 Pro",
          brand: "Apple",
          category: "Smartphones",
          units_sold: "5000+",
          price_range_inr: "₹1,20,000 - ₹1,50,000"
        },
        {
          product_name: "Samsung Galaxy S24",
          brand: "Samsung",
          category: "Smartphones",
          units_sold: "3500+",
          price_range_inr: "₹80,000 - ₹1,20,000"
        },
        {
          product_name: "AirPods Pro",
          brand: "Apple",
          category: "Audio",
          units_sold: "8000+",
          price_range_inr: "₹20,000 - ₹25,000"
        }
      ];
    } else if (query.includes('company') || query.includes('business') || query.includes('organization')) {
      schema = [
        { name: "company_name", type: "string", description: "Name of the company" },
        { name: "industry", type: "string", description: "Industry sector" },
        { name: "location", type: "string", description: "Company location" },
        { name: "description", type: "string", description: "Company description" }
      ];
      sampleData = [
        {
          company_name: "TechCorp Solutions",
          industry: "Technology",
          location: "Bangalore",
          description: "Leading software development company"
        }
      ];
    } else if (query.includes('job') || query.includes('career') || query.includes('employment')) {
      schema = [
        { name: "company_name", type: "string", description: "Company name" },
        { name: "job_title", type: "string", description: "Job title" },
        { name: "location", type: "string", description: "Job location" },
        { name: "skills", type: "string", description: "Required skills" }
      ];
      sampleData = [
        {
          company_name: "TechCorp",
          job_title: "Software Engineer",
          location: "Remote",
          skills: "JavaScript, React, Node.js"
        }
      ];
    } else {
      // Generic fallback
      schema = [
        { name: "name", type: "string", description: "Item name" },
        { name: "category", type: "string", description: "Category" },
        { name: "description", type: "string", description: "Description" },
        { name: "details", type: "string", description: "Additional details" }
      ];
      sampleData = [
        {
          name: "Sample Item 1",
          category: "General",
          description: "Sample description",
          details: "Additional details"
        }
      ];
    }

    return {
      schema,
      data: data.length > 0 ? data : sampleData,
      reasoning: "Fallback structure created due to JSON parsing failure"
    };
  }

  /**
   * Analyze dataset profile with AI insights
   */
  async analyzeDatasetProfile(
    schema: Array<{ name: string; type: string }>,
    sampleData: Record<string, any>[],
    statistics: any
  ): Promise<{
    success: boolean;
    columnInsights: Array<{
      column: string;
      semanticMeaning: string;
      quality: number;
      suggestions: string[];
    }>;
    overallQuality: number;
    dataIssues: string[];
    error?: string;
  }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          columnInsights: [],
          overallQuality: 0,
          dataIssues: [],
          error: 'Gemini API key not configured'
        };
      }

      console.log('[Gemini] Analyzing dataset profile...');

      const sampleDataStr = JSON.stringify(sampleData.slice(0, 10), null, 2);
      const statisticsStr = JSON.stringify(statistics, null, 2);

      const prompt = `Analyze this dataset profile and provide AI insights:

Schema: ${JSON.stringify(schema, null, 2)}

Sample Data (first 10 rows):
${sampleDataStr}

Statistics Summary:
${statisticsStr}

Please provide:
1. Column insights with semantic meaning and quality assessment
2. Overall data quality score (0-100)
3. Data quality issues identified
4. Specific suggestions for each column

Return JSON format:
{
  "columnInsights": [
    {
      "column": "column_name",
      "semanticMeaning": "What this column represents",
      "quality": 85,
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ],
  "overallQuality": 78,
  "dataIssues": ["issue1", "issue2"]
}`;

      const response = await this.callGeminiAPI(prompt);

      if (!response.success) {
        return {
          success: false,
          columnInsights: [],
          overallQuality: 0,
          dataIssues: [],
          error: response.error
        };
      }

      const jsonText = this.extractJsonFromResponse(response.text);
      const parsed = JSON.parse(jsonText);

      return {
        success: true,
        columnInsights: parsed.columnInsights || [],
        overallQuality: parsed.overallQuality || 0,
        dataIssues: parsed.dataIssues || []
      };

    } catch (error: any) {
      console.error('[Gemini] Dataset profile analysis error:', error);
      return {
        success: false,
        columnInsights: [],
        overallQuality: 0,
        dataIssues: [],
        error: error.message
      };
    }
  }

  /**
   * Generate deep insights and patterns
   */
  async generateDeepInsights(
    profile: any,
    correlations: number[][],
    distributions: any
  ): Promise<{
    success: boolean;
    patterns: string[];
    anomalies: string[];
    correlations: string[];
    recommendations: string[];
    error?: string;
  }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          patterns: [],
          anomalies: [],
          correlations: [],
          recommendations: [],
          error: 'Gemini API key not configured'
        };
      }

      console.log('[Gemini] Generating deep insights...');

      const prompt = `Analyze this dataset for deep insights and patterns:

Dataset Profile:
${JSON.stringify(profile, null, 2)}

Correlation Matrix:
${JSON.stringify(correlations, null, 2)}

Distributions:
${JSON.stringify(distributions, null, 2)}

Please identify:
1. Patterns and trends in the data
2. Anomalies and outliers
3. Interesting correlations between variables
4. Actionable recommendations for data usage

Return JSON format:
{
  "patterns": ["pattern1", "pattern2"],
  "anomalies": ["anomaly1", "anomaly2"],
  "correlations": ["correlation1", "correlation2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

      const response = await this.callGeminiAPI(prompt);

      if (!response.success) {
        return {
          success: false,
          patterns: [],
          anomalies: [],
          correlations: [],
          recommendations: [],
          error: response.error
        };
      }

      const jsonText = this.extractJsonFromResponse(response.text);
      const parsed = JSON.parse(jsonText);

      return {
        success: true,
        patterns: parsed.patterns || [],
        anomalies: parsed.anomalies || [],
        correlations: parsed.correlations || [],
        recommendations: parsed.recommendations || []
      };

    } catch (error: any) {
      console.error('[Gemini] Deep insights generation error:', error);
      return {
        success: false,
        patterns: [],
        anomalies: [],
        correlations: [],
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Analyze visualization needs and recommend charts
   */
  async analyzeVisualizationNeeds({
    data,
    profile,
    characteristics,
    userQuery,
    maxCharts
  }: {
    data: Record<string, any>[];
    profile: any;
    characteristics: any;
    userQuery?: string;
    maxCharts: number;
  }): Promise<{
    success: boolean;
    recommendations?: any[];
    error?: string;
  }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          recommendations: [],
          error: 'Gemini API key not configured'
        };
      }

      console.log('[Gemini] Analyzing visualization needs...');

      const sampleData = JSON.stringify(data.slice(0, 10), null, 2);
      const profileSummary = JSON.stringify({
        totalRows: profile.totalRows,
        totalColumns: profile.totalColumns,
        numericColumns: profile.numericColumns,
        categoricalColumns: profile.categoricalColumns,
        overallQuality: profile.overallQuality,
        missingDataPattern: profile.missingDataPattern.slice(0, 5)
      }, null, 2);

      const prompt = `You are an expert data visualization analyst. Analyze this dataset and recommend the most effective visualizations.

DATASET OVERVIEW:
${profileSummary}

SAMPLE DATA (first 10 rows):
${sampleData}

DATA CHARACTERISTICS:
- Has temporal data: ${characteristics.hasTemporalData}
- Has correlations: ${characteristics.hasCorrelations}
- Has outliers: ${characteristics.hasOutliers}
- Has seasonality: ${characteristics.hasSeasonality}
- Data quality: ${characteristics.dataQuality}%
- Complexity: ${characteristics.complexity}

USER QUERY: ${userQuery || 'General data analysis'}

TASK:
1. Analyze the dataset characteristics and data patterns
2. Recommend up to ${maxCharts} most effective visualizations
3. For each recommendation, provide:
   - Chart type (bar, line, pie, scatter, histogram, boxplot, heatmap, area, timeseries, scatter-advanced, stacked-bar, radar, treemap)
   - Meaningful title based on data insights
   - Description explaining what the chart shows
   - Rationale for why this chart is recommended
   - Priority (1-10, higher is more important)
   - Confidence (0-1)
   - Data columns to use
   - Insight type (distribution, correlation, trend, anomaly, comparison, pattern)

REQUIREMENTS:
- Focus on charts that reveal meaningful insights
- Generate dynamic, insight-driven titles (e.g., "Revenue Surge: 45% Growth in Q4" instead of "Revenue by Quarter")
- Prioritize charts that show patterns, relationships, or anomalies
- Consider the user query context
- Ensure recommendations are actionable and informative

RESPONSE FORMAT (JSON):
{
  "recommendations": [
    {
      "id": "unique_id",
      "chartType": "chart_type",
      "title": "Insight-driven title",
      "description": "What this chart reveals",
      "rationale": "Why this chart is recommended",
      "priority": 8,
      "confidence": 0.85,
      "dataColumns": ["column1", "column2"],
      "colorScheme": ["#color1", "#color2"],
      "insightType": "distribution|correlation|trend|anomaly|comparison|pattern",
      "config": {
        "title": "Chart title",
        "height": 300,
        "showLegend": true,
        "showTooltip": true,
        "showGrid": true
      }
    }
  ]
}`;

      const response = await this.callGeminiAPI(prompt);

      if (!response.success) {
        return {
          success: false,
          recommendations: [],
          error: response.error
        };
      }

      const jsonText = this.extractJsonFromResponse(response.text);
      const result = JSON.parse(jsonText);

      return {
        success: true,
        recommendations: result.recommendations || []
      };

    } catch (error: any) {
      console.error('[Gemini] Visualization analysis error:', error);
      return {
        success: false,
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Generate chart insights and dynamic headers
   */
  async generateChartInsights({
    chartType,
    data,
    columns,
    userQuery
  }: {
    chartType: string;
    data: Record<string, any>[];
    columns: string[];
    userQuery?: string;
  }): Promise<{
    success: boolean;
    title?: string;
    description?: string;
    insights?: string[];
    error?: string;
  }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Gemini API key not configured'
        };
      }

      console.log(`[Gemini] Generating insights for ${chartType} chart...`);

      const sampleData = JSON.stringify(data.slice(0, 5), null, 2);
      const columnData = columns.map(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
        const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)));
        return {
          name: col,
          count: values.length,
          unique: new Set(values).size,
          isNumeric: numericValues.length > values.length * 0.8,
          sampleValues: values.slice(0, 3)
        };
      });

      const prompt = `You are an expert data analyst. Generate meaningful insights and dynamic headers for a ${chartType} chart.

CHART TYPE: ${chartType}
COLUMNS: ${columns.join(', ')}
USER QUERY: ${userQuery || 'General analysis'}

COLUMN ANALYSIS:
${JSON.stringify(columnData, null, 2)}

SAMPLE DATA:
${sampleData}

TASK:
1. Generate a compelling, insight-driven title (not generic like "Data Distribution")
2. Write a description that explains what the chart reveals
3. Provide 2-3 key insights about the data patterns

TITLE EXAMPLES:
- Instead of "Sales by Month" → "Holiday Sales Surge: 67% Increase in December"
- Instead of "Customer Distribution" → "Premium Customers Dominate: 78% of Revenue"
- Instead of "Revenue Trends" → "Steady Growth: 23% YoY Revenue Increase"

DESCRIPTION EXAMPLES:
- "This chart reveals a strong seasonal pattern with peak performance in Q4"
- "Shows clear customer segmentation with three distinct value tiers"
- "Demonstrates a strong positive correlation between marketing spend and sales"

INSIGHTS EXAMPLES:
- "Q4 shows 3x higher performance than other quarters"
- "Top 20% of customers generate 80% of revenue"
- "Strong correlation (r=0.87) between price and customer satisfaction"

RESPONSE FORMAT (JSON):
{
  "title": "Insight-driven title",
  "description": "What this chart reveals",
  "insights": ["insight1", "insight2", "insight3"]
}`;

      const response = await this.callGeminiAPI(prompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error
        };
      }

      const jsonText = this.extractJsonFromResponse(response.text);
      const result = JSON.parse(jsonText);

      return {
        success: true,
        title: result.title,
        description: result.description,
        insights: result.insights || []
      };

    } catch (error: any) {
      console.error('[Gemini] Chart insights generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for Gemini service
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      const response = await this.callGeminiAPI('Test query');
      return response.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
