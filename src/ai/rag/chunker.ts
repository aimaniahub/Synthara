// Simple token estimator (~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface RagChunk {
  id: string;
  sourceId: number;
  url: string;
  title: string;
  text: string;
  start: number;
  end: number;
  tokens: number;
}

export function chunkSourcesForRag(
  sources: Array<{ id: number; url: string; title: string; content: string }>,
  opts?: { chunkTokens?: number; overlapRatio?: number }
): RagChunk[] {
  const chunkTokens = opts?.chunkTokens ?? Number(process.env.RAG_CHUNK_TOKENS || 3000);
  const overlapRatio = opts?.overlapRatio ?? Number(process.env.RAG_CHUNK_OVERLAP || 0.1);
  const chunks: RagChunk[] = [];

  for (const s of sources) {
    const content = s.content || '';
    if (!content) continue;

    const approxTokens = estimateTokens(content);
    if (approxTokens <= chunkTokens) {
      chunks.push({
        id: `s${s.id}-c0`,
        sourceId: s.id,
        url: s.url,
        title: s.title,
        text: content,
        start: 0,
        end: content.length,
        tokens: approxTokens,
      });
      continue;
    }

    // Sliding window with overlap
    const overlapChars = Math.floor((chunkTokens * 4) * overlapRatio);
    const stepChars = Math.max(1, (chunkTokens * 4) - overlapChars);

    let idx = 0, ci = 0;
    while (idx < content.length) {
      const end = Math.min(content.length, idx + (chunkTokens * 4));
      const slice = content.slice(idx, end);
      chunks.push({
        id: `s${s.id}-c${ci}`,
        sourceId: s.id,
        url: s.url,
        title: s.title,
        text: slice,
        start: idx,
        end: end,
        tokens: estimateTokens(slice),
      });
      if (end >= content.length) break;
      idx += stepChars;
      ci++;
    }
  }

  return chunks;
}

export function formatChunksAsMarkdown(chunks: RagChunk[]): string {
  return chunks.map(ch => `=== CHUNK from Source ${ch.sourceId}: ${ch.title} (${ch.url}) ===\n${ch.text}\n`).join('\n');
}
