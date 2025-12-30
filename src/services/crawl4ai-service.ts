export interface Crawl4AIExtractOptions {
  query: string;
  targetRows: number;
  chunking?: { window_size?: number; overlap?: number };
  llm?: { provider?: string; model?: string; temperature?: number; json_mode?: boolean };
  filters?: { include_headings?: string[] };
}

export interface Crawl4AIStructuredResult {
  url: string;
  title?: string;
  rows: Array<Record<string, any>>;
  schema?: Array<{ name: string; type: string; description?: string }>;
}

class Crawl4AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.CRAWL4AI_SERVICE_URL ||
      process.env.CRAWL4AI_EXTRACT_URL ||
      'http://localhost:11235';
  }

  async health(timeoutMs: number = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(`${this.baseUrl}/health`, { method: 'GET', signal: controller.signal });
      clearTimeout(id);
      return resp.ok;
    } catch {
      return false;
    }
  }

  async extractStructured(urls: string[], options: Crawl4AIExtractOptions): Promise<{ success: boolean; results: Crawl4AIStructuredResult[]; error?: string; }> {
    try {
      const resp = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          query: options.query,
          target_rows: options.targetRows,
          strategy: 'llm',
          schema: undefined,
          chunking: {
            window_size: options.chunking?.window_size ?? 600,
            overlap: options.chunking?.overlap ?? 60,
          },
          llm: {
            provider: options.llm?.provider || process.env.CRAWL4AI_LLM_PROVIDER || 'openai',
            model: options.llm?.model || process.env.CRAWL4AI_LLM_MODEL || 'gpt-4o-mini',
            temperature: options.llm?.temperature ?? 0.1,
            json_mode: options.llm?.json_mode ?? true,
          },
          filters: options.filters || undefined,
        })
      });

      if (!resp.ok) {
        return { success: false, results: [], error: `HTTP ${resp.status}: ${resp.statusText}` };
      }
      const data = await resp.json().catch(() => ({}));

      const normalized: Crawl4AIStructuredResult[] = Array.isArray(data?.results)
        ? data.results.map((r: any) => ({
          url: String(r.url || r.source || ''),
          title: r.title ? String(r.title) : undefined,
          rows: Array.isArray(r.rows) ? r.rows : Array.isArray(r.data) ? r.data : [],
          schema: Array.isArray(r.schema) ? r.schema.map((c: any) => ({ name: String(c.name || c.key), type: String(c.type || 'string'), description: c.description })) : undefined,
        }))
        : [];

      return { success: Boolean(data?.success) && normalized.length > 0, results: normalized, error: data?.error };
    } catch (e: any) {
      return { success: false, results: [], error: e?.message || 'extractStructured failed' };
    }
  }

  async extractStructuredBulk(urls: string[], options: Crawl4AIExtractOptions): Promise<{ success: boolean; results: Crawl4AIStructuredResult[]; error?: string; }> {
    const ok = await this.health();
    if (!ok) return { success: false, results: [], error: 'Crawl4AI service unavailable' };

    const batchSize = 5;
    const out: Crawl4AIStructuredResult[] = [];
    let lastError = '';
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const resp = await this.extractStructured(batch, options);
      if (resp.success && Array.isArray(resp.results)) {
        out.push(...resp.results);
      } else if (resp.error) {
        lastError = resp.error;
      }
    }
    return { success: out.length > 0, results: out, error: out.length > 0 ? undefined : lastError || 'No rows extracted' };
  }
}

export const crawl4aiService = new Crawl4AIService();
