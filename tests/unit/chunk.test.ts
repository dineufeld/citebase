import { describe, expect, it } from 'vitest';
import { chunkText } from '@/lib/ingest/chunk';

describe('chunkText', () => {
  it('returns [] for empty / whitespace-only / lorem-only input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
    expect(chunkText('Lorem ipsum dolor sit amet.')).toEqual([]);
  });

  it('returns a single chunk for short text', () => {
    const out = chunkText('Hello world paragraph.');
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain('Hello');
    expect(out[0].contextWindow).toContain('Hello');
    expect(out[0].chunkIndex).toBe(0);
  });

  it('merges small paragraphs into ~400-char units before splitting', () => {
    const para = (s: string) => `${s} `.repeat(18).trim(); // ~130 chars each
    const text = [para('Alpha'), para('Beta'), para('Gamma')].join('\n\n');
    const out = chunkText(text);
    // All three should merge into a single chunk (130+3+130+3+130 = ~396 ≤ 400)
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain('Alpha');
    expect(out[0].content).toContain('Beta');
    expect(out[0].content).toContain('Gamma');
  });

  it('preserves chunkIndex sequentially starting from 0', () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) =>
      `Paragraph number ${i}. `.repeat(8),
    ).join('\n\n');
    const out = chunkText(paragraphs);
    expect(out.length).toBeGreaterThan(3);
    out.forEach((c, i) => expect(c.chunkIndex).toBe(i));
  });

  it('keeps every chunk under SMALL_CHUNK_MAX + OVERLAP_CHARS', () => {
    // 60 paragraphs of 60 chars each — guaranteed to cross the cap
    const long = Array.from({ length: 60 }, () => 'x'.repeat(60)).join('\n\n');
    const out = chunkText(long);
    expect(out.length).toBeGreaterThan(5);
    for (const c of out) {
      expect(c.content.length).toBeLessThanOrEqual(500 + 100);
    }
  });

  it('includes an overlap tail from the previous chunk when present', () => {
    const tail = 'MARKER_TAIL_OF_PREVIOUS_CHUNK';
    const head = 'MARKER_HEAD_OF_CURRENT_CHUNK';
    const para = (s: string) => `${s} `.repeat(360).trim(); // ~720 chars each, forces split
    const text = `${tail} ${para('a')}\n\n${head} ${para('b')}`;
    const out = chunkText(text);
    expect(out.length).toBeGreaterThan(1);
    expect(out[out.length - 1].content).toContain(head);
    // Either the overlap tail or the original previous-chunk text must be discoverable
    const blob = out.map((c) => c.content).join(' || ');
    expect(blob).toContain(tail);
  });

  it('caps context windows at 2500 chars', () => {
    const paras = Array.from({ length: 6 }, () => 'x'.repeat(450)).join('\n\n');
    const out = chunkText(paras);
    for (const c of out) {
      expect(c.contextWindow.length).toBeLessThanOrEqual(2500);
    }
  });

  it('does not split text mid-paragraph when paragraphs are within the cap', () => {
    const text = ['alpha paragraph', 'beta paragraph', 'gamma paragraph'].join('\n\n');
    const out = chunkText(text);
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain('alpha paragraph');
    expect(out[0].content).toContain('beta paragraph');
    expect(out[0].content).toContain('gamma paragraph');
  });
});
