import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export type BM25Hit = {
  chunkId: string;
  documentId: string;
  filename: string;
  content: string;
  contextWindow: string;
  page: number | null;
  tsRank: number;
  rank: number;
};

export async function searchBM25(
  query: string,
  options: { collectionId: string; limit?: number } ,
): Promise<BM25Hit[]> {
  const limit = options.limit ?? 40;
  const q = query.trim();
  if (!q) return [];

  const result = await db.execute(sql`
    SELECT
      c.id AS "chunkId",
      c.document_id AS "documentId",
      d.filename AS filename,
      c.content AS content,
      c.context_window AS "contextWindow",
      c.page AS page,
      ts_rank_cd(c.search_vector, plainto_tsquery('english', ${q})) AS "tsRank"
    FROM chunks c
    INNER JOIN documents d ON d.id = c.document_id
    WHERE c.collection_id = ${options.collectionId}::uuid
      AND d.status = 'ready'
      AND c.search_vector @@ plainto_tsquery('english', ${q})
    ORDER BY "tsRank" DESC
    LIMIT ${limit}
  `);

  const rows = (result as unknown as BM25Hit[]) || [];
  // postgres.js + drizzle execute may return array-like with .rows
  const list = Array.isArray(result) ? result : ((result as { rows?: BM25Hit[] }).rows ?? []);

  return list.map((row, i) => ({
    chunkId: String(row.chunkId),
    documentId: String(row.documentId),
    filename: String(row.filename),
    content: String(row.content),
    contextWindow: String(row.contextWindow ?? row.content),
    page: row.page == null ? null : Number(row.page),
    tsRank: Number(row.tsRank ?? 0),
    rank: i + 1,
  }));
}
