/**
 * Smoke: ensure DB reachable, default collection exists, hybrid module imports.
 * Full RAG path needs AI_GATEWAY_API_KEY + a ready document.
 *
 * Run: npm run smoke:rag
 */
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const { db, sqlClient } = await import('../src/lib/db');
  const { ensureDefaultCollection } = await import('../src/lib/db/default-collection');

  try {
    await db.execute(sql`SELECT 1`);
    const collectionId = await ensureDefaultCollection();
    console.log('collection', collectionId);

    const count = await db.execute(sql`
      SELECT count(*)::int AS n FROM documents WHERE status = 'ready'
    `);
    const rows = Array.isArray(count) ? count : (count as { rows?: { n: number }[] }).rows;
    const n = Number((rows as { n: number }[])?.[0]?.n ?? 0);
    console.log('ready documents:', n);

    if (n > 0 && process.env.AI_GATEWAY_API_KEY) {
      const { hybridSearch } = await import('../src/lib/retrieval');
      const result = await hybridSearch('refund policy days', {
        collectionId,
        limit: 3,
      });
      console.log(
        `hybrid mode=${result.mode} chunks=${result.chunks.length} latency=${result.latencyMs}ms`,
      );
      if (result.chunks.length === 0) {
        console.warn('WARN: expected at least one chunk for refund query');
      }
    } else {
      console.log(
        'skip live hybrid (need ready docs + AI_GATEWAY_API_KEY). Pure setup looks healthy.',
      );
    }

    console.log('smoke:rag OK');
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
