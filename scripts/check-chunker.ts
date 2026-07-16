/**
 * Simple pure-function checks for the chunker (no test runner required).
 * Run: npx tsx scripts/check-chunker.ts
 */
import { chunkText } from '../src/lib/ingest/chunk';
import { fuseResults } from '../src/lib/retrieval/fusion';
import type { BM25Hit } from '../src/lib/retrieval/bm25';
import type { VectorHit } from '../src/lib/retrieval/vector';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// empty
assert(chunkText('').length === 0, 'empty → []');

// short
const one = chunkText('Hello world paragraph.');
assert(one.length === 1, 'short → 1 chunk');
assert(one[0].content.includes('Hello'), 'content preserved');

// multi
const multi = chunkText(
  Array.from({ length: 12 }, (_, i) => `Paragraph number ${i}. `.repeat(8)).join(
    '\n\n',
  ),
);
assert(multi.length > 1, 'long multi-paragraph → multiple chunks');
assert(
  multi.every((c, i) => c.chunkIndex === i),
  'chunkIndex sequential',
);

// fusion RRF
const bm25: BM25Hit[] = [
  {
    chunkId: 'a',
    documentId: 'd1',
    filename: 'a.md',
    content: 'alpha',
    contextWindow: 'alpha',
    page: null,
    tsRank: 0.9,
    rank: 1,
  },
  {
    chunkId: 'b',
    documentId: 'd1',
    filename: 'b.md',
    content: 'beta',
    contextWindow: 'beta',
    page: null,
    tsRank: 0.5,
    rank: 2,
  },
];
const vector: VectorHit[] = [
  {
    chunkId: 'b',
    documentId: 'd1',
    filename: 'b.md',
    content: 'beta',
    contextWindow: 'beta',
    page: null,
    distance: 0.1,
    rank: 1,
  },
  {
    chunkId: 'c',
    documentId: 'd1',
    filename: 'c.md',
    content: 'gamma',
    contextWindow: 'gamma',
    page: null,
    distance: 0.2,
    rank: 2,
  },
];
const fused = fuseResults(bm25, vector, 3);
assert(fused[0].chunkId === 'b', 'chunk b should rank first (appears in both lists)');
assert(fused.length === 3, 'three unique chunks');

console.log('check-chunker: all assertions passed');
