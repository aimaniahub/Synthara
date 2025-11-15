import { pipeline } from '@xenova/transformers';

// Lightweight local embeddings service using @xenova/transformers
// Defaults to Xenova/all-MiniLM-L6-v2 for sentence embeddings
class EmbeddingsService {
  private ready: Promise<void> | null = null;
  private extractor: any = null;
  private modelName: string;

  constructor() {
    this.modelName = process.env.RAG_EMBED_MODEL || 'Xenova/all-MiniLM-L6-v2';
  }

  private async init() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      this.extractor = await pipeline('feature-extraction', this.modelName);
    })();
    return this.ready;
  }

  async embedText(text: string): Promise<Float32Array> {
    await this.init();
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    // output is a Tensor; .data is TypedArray-like
    return new Float32Array(output.data);
  }

  async embedBatch(texts: string[], batchSize = 16): Promise<Float32Array[]> {
    await this.init();
    const vectors: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const outputs = await Promise.all(batch.map(t => this.extractor(t, { pooling: 'mean', normalize: true })));
      for (const out of outputs) {
        vectors.push(new Float32Array(out.data));
      }
    }
    return vectors;
  }
}

export const embeddingsService = new EmbeddingsService();
