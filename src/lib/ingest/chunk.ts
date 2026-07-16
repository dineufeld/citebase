export type Chunk = {
  content: string;
  contextWindow: string;
  chunkIndex: number;
  page: number | null;
};

const SMALL_CHUNK_TARGET = 400;
const SMALL_CHUNK_MAX = 500;
const CONTEXT_WINDOW_MAX = 2500;
const OVERLAP_CHARS = 100;
const MAX_CHUNKS = 500;

/**
 * Paragraph-aware chunker with soft overlap.
 * Inspired by production semantic chunking, simplified for plain text.
 */
export function chunkText(text: string): Chunk[] {
  const cleaned = (text || '').trim();
  if (!cleaned) return [];

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/lorem ipsum/i.test(p));

  if (paragraphs.length === 0) return [];

  // Merge small paragraphs into ~target-sized units
  const units: string[] = [];
  let buf = '';
  for (const para of paragraphs) {
    if (!buf) {
      buf = para;
      continue;
    }
    if (buf.length + 1 + para.length <= SMALL_CHUNK_TARGET) {
      buf = `${buf}\n\n${para}`;
    } else {
      units.push(buf);
      buf = para;
    }
  }
  if (buf) units.push(buf);

  // Split any oversized unit on sentence boundaries when possible
  const pieces: string[] = [];
  for (const unit of units) {
    if (unit.length <= SMALL_CHUNK_MAX) {
      pieces.push(unit);
      continue;
    }
    const sentences = unit.split(/(?<=[.!?])\s+/);
    let current = '';
    for (const s of sentences) {
      if (!current) {
        current = s;
      } else if (current.length + 1 + s.length <= SMALL_CHUNK_MAX) {
        current = `${current} ${s}`;
      } else {
        pieces.push(current);
        current = s;
      }
    }
    if (current) pieces.push(current);
  }

  const chunks: Chunk[] = [];
  for (let i = 0; i < pieces.length && chunks.length < MAX_CHUNKS; i++) {
    let content = pieces[i];
    if (i > 0 && OVERLAP_CHARS > 0) {
      const prev = pieces[i - 1];
      const tail = prev.slice(-OVERLAP_CHARS);
      if (tail && !content.startsWith(tail)) {
        content = `${tail} ${content}`.slice(0, SMALL_CHUNK_MAX + OVERLAP_CHARS);
      }
    }

    // Context window: join neighboring pieces
    const contextParts: string[] = [];
    let ctxLen = 0;
    for (let j = Math.max(0, i - 1); j < pieces.length && j <= i + 2; j++) {
      const part = pieces[j];
      if (ctxLen + part.length > CONTEXT_WINDOW_MAX) break;
      contextParts.push(part);
      ctxLen += part.length;
    }

    chunks.push({
      content: content.trim(),
      contextWindow: contextParts.join('\n\n').slice(0, CONTEXT_WINDOW_MAX),
      chunkIndex: chunks.length,
      page: null,
    });
  }

  return chunks;
}
