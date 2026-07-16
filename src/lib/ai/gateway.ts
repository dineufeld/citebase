import { createGateway, embedMany } from 'ai';

export const CHAT_MODEL = process.env.CHAT_MODEL || 'google/gemini-2.5-flash';
export const EMBED_MODEL = process.env.EMBED_MODEL || 'voyage/voyage-4-lite';
export const MAX_CHARS = 5_000;
const BATCH_SIZE = 50;

function requireApiKey(): string {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) {
    throw new Error(
      'AI_GATEWAY_API_KEY is not set. Copy .env.example → .env.local and add your Vercel AI Gateway key.',
    );
  }
  return key;
}

/** Lazy gateway so import doesn't crash without env during typecheck. */
export function getGateway() {
  return createGateway({ apiKey: requireApiKey() });
}

function cleanText(text: string): string {
  return text.replace(/\0/g, '').trim().slice(0, MAX_CHARS);
}

/**
 * Embed many texts. Returns vectors aligned to *input* indices.
 * Empty / too-short strings get null-filled as zero vectors skipped by caller.
 */
export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];

  const gateway = getGateway();
  const results: (number[] | null)[] = new Array(texts.length).fill(null);

  // Build cleaned batches while remembering original indices
  const work: { index: number; text: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    const cleaned = cleanText(texts[i] ?? '');
    if (cleaned.length < 3) continue;
    work.push({ index: i, text: cleaned });
  }

  for (let offset = 0; offset < work.length; offset += BATCH_SIZE) {
    const batch = work.slice(offset, offset + BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: gateway.embeddingModel(EMBED_MODEL),
      values: batch.map((b) => b.text),
    });
    for (let j = 0; j < batch.length; j++) {
      results[batch[j].index] = embeddings[j] ?? null;
    }
  }

  return results;
}

export async function embedQuery(query: string): Promise<number[]> {
  const cleaned = cleanText(query);
  if (!cleaned) {
    throw new Error('Cannot embed empty query');
  }
  const [vec] = await embedTexts([cleaned]);
  if (!vec) {
    throw new Error('Embedding provider returned no vector for query');
  }
  return vec;
}
