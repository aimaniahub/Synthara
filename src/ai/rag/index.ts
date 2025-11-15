import { embeddingsService } from '@/services/embeddings-service';
import type { RagChunk } from './chunker';

export interface RagIndex {
  chunks: RagChunk[];
  vectors: Float32Array[];
}

function cosineSim(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function buildRagIndex(chunks: RagChunk[]): Promise<RagIndex> {
  // Batch embed chunk texts
  const vectors = await embeddingsService.embedBatch(chunks.map(ch => ch.text));
  return { chunks, vectors };
}

export async function queryRelevantChunks(
  index: RagIndex,
  query: string,
  k: number,
  opts?: { excludeIds?: string[]; boostTerms?: string[] }
): Promise<RagChunk[]> {
  const qv = await embeddingsService.embedText(query);
  const exclude = new Set(opts?.excludeIds || []);
  const boostTerms = (opts?.boostTerms || [])
    .map(t => t.toLowerCase())
    .filter(Boolean);

  const scored: Array<{ ch: RagChunk; score: number }> = [];
  for (let i = 0; i < index.vectors.length; i++) {
    const ch = index.chunks[i];
    if (exclude.has(ch.id)) continue;
    let score = cosineSim(qv, index.vectors[i]);
    if (boostTerms.length) {
      const lower = ch.text.toLowerCase();
      let boost = 0;
      for (const term of boostTerms) if (lower.includes(term)) boost += 0.03;
      score += Math.min(0.15, boost);
    }
    scored.push({ ch, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, k)).map(s => s.ch);
}
