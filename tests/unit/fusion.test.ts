import { describe, expect, it } from 'vitest';
import { fuseResults } from '@/lib/retrieval/fusion';
import type { BM25Hit } from '@/lib/retrieval/bm25';
import type { VectorHit } from '@/lib/retrieval/vector';

const bm = (overrides: Partial<BM25Hit>): BM25Hit => ({
  chunkId: overrides.chunkId!,
  documentId: overrides.documentId ?? 'd',
  filename: overrides.filename ?? 'f.md',
  content: overrides.content ?? 'c',
  contextWindow: overrides.contextWindow ?? 'cw',
  page: overrides.page ?? null,
  tsRank: overrides.tsRank ?? 0.5,
  rank: overrides.rank!,
});

const v = (overrides: Partial<VectorHit>): VectorHit => ({
  chunkId: overrides.chunkId!,
  documentId: overrides.documentId ?? 'd',
  filename: overrides.filename ?? 'f.md',
  content: overrides.content ?? 'c',
  contextWindow: overrides.contextWindow ?? 'cw',
  page: overrides.page ?? null,
  distance: overrides.distance ?? 0.1,
  rank: overrides.rank!,
});

describe('fuseResults (RRF k=60)', () => {
  it('a chunk in both lists outranks a chunk in only one', () => {
    const bm25 = [
      bm({ chunkId: 'shared', rank: 1, content: 'S1' }),
      bm({ chunkId: 'bm-only', rank: 2, content: 'BM' }),
    ];
    const vector = [v({ chunkId: 'shared', rank: 1, content: 'S1' })];
    const fused = fuseResults(bm25, vector, 5);
    expect(fused[0].chunkId).toBe('shared');
    expect(fused[0].score).toBeCloseTo(2 / 61, 6);
    expect(fused.find((c) => c.chunkId === 'bm-only')?.score).toBeCloseTo(1 / 62, 6);
  });

  it('merges duplicate chunkIds across lists into a single fused entry', () => {
    const bm25 = [bm({ chunkId: 'x', rank: 1 })];
    const vector = [
      v({ chunkId: 'x', rank: 1 }),
      v({ chunkId: 'x', rank: 2 }), // duplicate within the same list
    ];
    const fused = fuseResults(bm25, vector, 5);
    expect(fused).toHaveLength(1);
    // All three ranks contribute: 1/61 + 1/61 + 1/62
    expect(fused[0].score).toBeCloseTo(1 / 61 + 1 / 61 + 1 / 62, 6);
  });

  it('clamps output to the requested limit', () => {
    const bm25 = Array.from({ length: 10 }, (_, i) => bm({ chunkId: `b${i}`, rank: i + 1 }));
    const vector = Array.from({ length: 10 }, (_, i) => v({ chunkId: `v${i}`, rank: i + 1 }));
    const fused = fuseResults(bm25, vector, 6);
    expect(fused).toHaveLength(6);
    fused.forEach((c, i) => expect(c.rank).toBe(i + 1));
  });

  it('returns BM25-only entries when vector list is empty', () => {
    const bm25 = [bm({ chunkId: 'b', rank: 1, tsRank: 0.9 })];
    const fused = fuseResults(bm25, [], 5);
    expect(fused).toHaveLength(1);
    expect(fused[0].tsRank).toBe(0.9);
    expect(fused[0].vectorDistance).toBeNull();
  });

  it('returns vector-only entries when BM25 list is empty', () => {
    const vector = [v({ chunkId: 'v', rank: 1, distance: 0.123 })];
    const fused = fuseResults([], vector, 5);
    expect(fused).toHaveLength(1);
    expect(fused[0].vectorDistance).toBe(0.123);
    expect(fused[0].tsRank).toBeNull();
  });

  it('preserves filename and documentId across the merge', () => {
    const bm25 = [bm({ chunkId: 'a', rank: 1, documentId: 'd1', filename: 'one.md' })];
    const vector = [v({ chunkId: 'b', rank: 1, documentId: 'd2', filename: 'two.md' })];
    const fused = fuseResults(bm25, vector, 5);
    const map = new Map(fused.map((c) => [c.chunkId, c]));
    expect(map.get('a')?.filename).toBe('one.md');
    expect(map.get('a')?.documentId).toBe('d1');
    expect(map.get('b')?.filename).toBe('two.md');
    expect(map.get('b')?.documentId).toBe('d2');
  });

  it('sorts ties by the order they first appeared (stable)', () => {
    const bm25 = [bm({ chunkId: 'x', rank: 1 })];
    const vector = [v({ chunkId: 'y', rank: 1 })];
    const fused = fuseResults(bm25, vector, 5);
    expect(fused.map((c) => c.score)).toEqual([fused[0].score, fused[1].score]);
    expect(fused[0].chunkId).toBe('x');
    expect(fused[1].chunkId).toBe('y');
  });

  it('handles empty inputs by returning []', () => {
    expect(fuseResults([], [], 6)).toEqual([]);
    expect(fuseResults([], [], 0)).toEqual([]);
  });

  it('does not mutate or share references between input rows', () => {
    const bm25 = [bm({ chunkId: 'a', rank: 1 })];
    const vector = [v({ chunkId: 'a', rank: 2 })];
    const fused = fuseResults(bm25, vector, 5);
    expect(fused[0].chunkId).toBe('a');
    // Mutating source — should not affect the fused output
    bm25[0].rank = 99;
    vector[0].rank = 99;
    expect(fused[0].score).toBeCloseTo(1 / 61 + 1 / 62, 6);
  });
});
