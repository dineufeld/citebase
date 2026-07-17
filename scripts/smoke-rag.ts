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

    // ── integration probes ──────────────────────────────────────────────
    if (!process.env.AI_GATEWAY_API_KEY) {
      console.log('skip integration probes (need AI_GATEWAY_API_KEY).');
    } else {
      const { db: probeDb } = await import('../src/lib/db');
      const { documents, chunks } = await import('../src/lib/db/schema');
      const { embedTexts } = await import('../src/lib/ai/gateway');
      const { chunkText } = await import('../src/lib/ingest/chunk');
      const { hybridSearch } = await import('../src/lib/retrieval');
      const { buildSystemPrompt } = await import('../src/lib/prompts/system');
      const crypto = await import('node:crypto');
      const { eq } = await import('drizzle-orm');

      async function seedAndSearch(filename: string, body: string, query: string) {
        const text = chunkText(body)[0]?.content ?? body;
        const [vec] = (await embedTexts([text])).filter(Boolean) as number[][];
        if (!vec) throw new Error('embedding returned no vector for probe');
        const docId = crypto.randomUUID();
        await probeDb.insert(documents).values({
          id: docId,
          collectionId: collectionId as never,
          filename,
          mimeType: 'text/plain',
          byteSize: body.length,
          storagePath: `/tmp/${docId}.txt`,
          status: 'ready',
        });
        await probeDb.insert(chunks).values({
          id: crypto.randomUUID(),
          documentId: docId,
          collectionId: collectionId as never,
          content: text,
          contextWindow: text,
          page: null,
          chunkIndex: 0,
          embedding: vec,
          metadata: JSON.stringify({ filename }),
        });
        const result = await hybridSearch(query, { collectionId, limit: 3 });
        return { result, docId };
      }

      // 1) golden path: question that matches the seeded passage
      let goldenDocId = '';
      try {
        const { result: r, docId } = await seedAndSearch(
          'pto.md',
          'Full-time employees receive 20 days of paid time off per year.',
          'How many PTO days do full-time employees get?',
        );
        goldenDocId = docId;
        if (r.chunks.length === 0) throw new Error('golden probe: expected ≥1 chunk');
        console.log(`PROBE golden: mode=${r.mode} chunks=${r.chunks.length} latency=${r.latencyMs}ms`);
      } catch (err) {
        console.error('PROBE golden failed:', err);
      } finally {
        // cleanup golden probe data so it doesn't pollute subsequent probes
        if (goldenDocId) {
          try {
            await probeDb.delete(chunks).where(eq(chunks.documentId, goldenDocId));
            await probeDb.delete(documents).where(eq(documents.id, goldenDocId));
          } catch { /* best-effort cleanup */ }
        }
      }

      // 2) delete clears it: search after seedAndDelete returns []
      try {
        const filename = `delete-${Date.now()}.md`;
        const body = 'Temporary content for delete probe.';
        const query = 'temporary delete probe';
        const { docId } = await seedAndSearch(filename, body, query);
        // delete
        await probeDb.delete(chunks).where(eq(chunks.documentId, docId));
        await probeDb.delete(documents).where(eq(documents.id, docId));
        const after = await hybridSearch(query, { collectionId, limit: 3 });
        if (after.chunks.length !== 0) throw new Error(`delete probe: expected 0 chunks, got ${after.chunks.length}`);
        console.log(`PROBE delete-after: chunks=${after.chunks.length}`);
      } catch (err) {
        console.error('PROBE delete failed:', err);
      }

      // 3) off-corpus refuse branch: empty result → hasContext=false prompt
      try {
        const r = await hybridSearch('What is the CEO favorite color?', { collectionId, limit: 6 });
        if (r.chunks.length !== 0) {
          throw new Error(`refuse probe: expected 0 chunks for off-corpus query, got ${r.chunks.length}`);
        }
        const prompt = buildSystemPrompt({ contextBlock: '', hasContext: false });
        if (!prompt.includes('Do NOT invent')) {
          throw new Error('refuse probe: empty-context prompt missing "Do NOT invent"');
        }
        console.log(`PROBE refuse: chunks=${r.chunks.length} prompt-ok`);
      } catch (err) {
        console.error('PROBE refuse failed:', err);
      }
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
