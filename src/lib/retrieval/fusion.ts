import type { BM25Hit } from './bm25';
import type { VectorHit } from './vector';

export type FusedChunk = {
  chunkId: string;
  documentId: string;
  filename: string;
  content: string;
  contextWindow: string;
  page: number | null;
  score: number;
  rank: number;
  vectorDistance: number | null;
  tsRank: number | null;
};

const RRF_K = 60;

/**
 * Reciprocal Rank Fusion over BM25 + vector hit lists.
 * score = Σ 1 / (k + rank)
 */
export function fuseResults(
  bm25: BM25Hit[],
  vector: VectorHit[],
  limit = 6,
): FusedChunk[] {
  type Acc = {
    chunkId: string;
    documentId: string;
    filename: string;
    content: string;
    contextWindow: string;
    page: number | null;
    score: number;
    vectorDistance: number | null;
    tsRank: number | null;
  };

  const map = new Map<string, Acc>();

  for (const hit of bm25) {
    const existing = map.get(hit.chunkId);
    const add = 1 / (RRF_K + hit.rank);
    if (existing) {
      existing.score += add;
      existing.tsRank = hit.tsRank;
    } else {
      map.set(hit.chunkId, {
        chunkId: hit.chunkId,
        documentId: hit.documentId,
        filename: hit.filename,
        content: hit.content,
        contextWindow: hit.contextWindow,
        page: hit.page,
        score: add,
        vectorDistance: null,
        tsRank: hit.tsRank,
      });
    }
  }

  for (const hit of vector) {
    const existing = map.get(hit.chunkId);
    const add = 1 / (RRF_K + hit.rank);
    if (existing) {
      existing.score += add;
      existing.vectorDistance = hit.distance;
    } else {
      map.set(hit.chunkId, {
        chunkId: hit.chunkId,
        documentId: hit.documentId,
        filename: hit.filename,
        content: hit.content,
        contextWindow: hit.contextWindow,
        page: hit.page,
        score: add,
        vectorDistance: hit.distance,
        tsRank: null,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item, i) => ({
      ...item,
      rank: i + 1,
    }));
}
