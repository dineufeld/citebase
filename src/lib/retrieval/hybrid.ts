import { searchBM25 } from './bm25';
import { searchVector } from './vector';
import { fuseResults, type FusedChunk } from './fusion';
import { embedQuery } from '@/lib/ai/gateway';

export type HybridMode = 'hybrid' | 'semantic' | 'bm25' | 'empty';

export type HybridSearchResult = {
  chunks: FusedChunk[];
  mode: HybridMode;
  latencyMs: number;
  bm25Count: number;
  vectorCount: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`hybrid timeout ${ms}ms`)), ms),
    ),
  ]);
}

export async function hybridSearch(
  query: string,
  options: { collectionId: string; limit?: number; timeoutMs?: number },
): Promise<HybridSearchResult> {
  const started = Date.now();
  const limit = options.limit ?? 6;
  const timeoutMs = options.timeoutMs ?? 2500;
  const q = query.trim();

  if (!q) {
    return { chunks: [], mode: 'empty', latencyMs: 0, bm25Count: 0, vectorCount: 0 };
  }

  let precomputed: number[] | undefined;
  try {
    precomputed = await embedQuery(q);
  } catch (err) {
    console.warn('[retrieval] pre-embed failed, BM25-only possible:', err);
  }

  const bm25Promise = searchBM25(q, {
    collectionId: options.collectionId,
    limit: 40,
  }).catch((err) => {
    console.warn('[retrieval] BM25 failed:', err);
    return [];
  });

  const vectorPromise = precomputed
    ? searchVector(q, {
        collectionId: options.collectionId,
        limit: 40,
        precomputedEmbedding: precomputed,
        timeoutMs: 2000,
      }).catch((err) => {
        console.warn('[retrieval] vector failed:', err);
        return [];
      })
    : Promise.resolve([]);

  let bm25: Awaited<typeof bm25Promise> = [];
  let vector: Awaited<typeof vectorPromise> = [];

  try {
    const both = await withTimeout(
      Promise.all([bm25Promise, vectorPromise]),
      timeoutMs,
    );
    bm25 = both[0];
    vector = both[1];
  } catch {
    // Global timeout — take whichever resolved; prefer BM25
    bm25 = await bm25Promise;
    vector = [];
  }

  const fused = fuseResults(bm25, vector, limit);
  let mode: HybridMode = 'empty';
  if (bm25.length && vector.length) mode = 'hybrid';
  else if (vector.length) mode = 'semantic';
  else if (bm25.length) mode = 'bm25';

  return {
    chunks: fused,
    mode,
    latencyMs: Date.now() - started,
    bm25Count: bm25.length,
    vectorCount: vector.length,
  };
}

export type { FusedChunk };
