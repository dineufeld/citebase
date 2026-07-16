import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { embedQuery } from '@/lib/ai/gateway';

export type VectorHit = {
  chunkId: string;
  documentId: string;
  filename: string;
  content: string;
  contextWindow: string;
  page: number | null;
  distance: number;
  rank: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Vector search timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function searchVector(
  query: string,
  options: {
    collectionId: string;
    limit?: number;
    precomputedEmbedding?: number[];
    timeoutMs?: number;
  },
): Promise<VectorHit[]> {
  const limit = options.limit ?? 40;
  const q = query.trim();
  if (!q) return [];

  const embedding =
    options.precomputedEmbedding ?? (await embedQuery(q));
  const vectorLiteral = `[${embedding.join(',')}]`;

  const run = db.execute(sql`
    SELECT
      c.id AS "chunkId",
      c.document_id AS "documentId",
      d.filename AS filename,
      c.content AS content,
      c.context_window AS "contextWindow",
      c.page AS page,
      (c.embedding <=> ${vectorLiteral}::vector) AS distance
    FROM chunks c
    INNER JOIN documents d ON d.id = c.document_id
    WHERE c.collection_id = ${options.collectionId}::uuid
      AND d.status = 'ready'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `);

  const result = await withTimeout(run, options.timeoutMs ?? 2000);
  const list = Array.isArray(result) ? result : ((result as { rows?: VectorHit[] }).rows ?? []);

  return list.map((row, i) => ({
    chunkId: String((row as VectorHit).chunkId),
    documentId: String((row as VectorHit).documentId),
    filename: String((row as VectorHit).filename),
    content: String((row as VectorHit).content),
    contextWindow: String((row as VectorHit).contextWindow ?? (row as VectorHit).content),
    page: (row as VectorHit).page == null ? null : Number((row as VectorHit).page),
    distance: Number((row as VectorHit).distance ?? 1),
    rank: i + 1,
  }));
}
