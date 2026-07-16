import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chunks, documents } from '@/lib/db/schema';
import { embedTexts } from '@/lib/ai/gateway';
import { readDocumentFile } from '@/lib/storage/document-storage';
import { extractText } from './extract-text';
import { chunkText } from './chunk';

export async function processDocument(documentId: string): Promise<void> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  await db
    .update(documents)
    .set({ status: 'processing', errorMessage: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  try {
    const buffer = await readDocumentFile(doc.storagePath);
    const { text, pageCount } = await extractText({
      buffer,
      mimeType: doc.mimeType,
      filename: doc.filename,
    });

    const pieces = chunkText(text);
    if (pieces.length === 0) {
      throw new Error('No viable chunks produced from document text.');
    }

    const embeddings = await embedTexts(pieces.map((p) => p.content));
    const rows = pieces
      .map((piece, i) => {
        const embedding = embeddings[i];
        if (!embedding) return null;
        return {
          documentId: doc.id,
          collectionId: doc.collectionId,
          content: piece.content,
          contextWindow: piece.contextWindow,
          page: piece.page,
          chunkIndex: piece.chunkIndex,
          embedding,
          metadata: JSON.stringify({ filename: doc.filename }),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      throw new Error('Embedding produced 0 vectors for document chunks.');
    }

    // Replace any previous chunks for re-process safety
    await db.delete(chunks).where(eq(chunks.documentId, doc.id));

    // Insert in batches
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await db.insert(chunks).values(batch);
    }

    // Populate tsvector for BM25
    await db.execute(sql`
      UPDATE chunks
      SET search_vector = to_tsvector('english', coalesce(content, ''))
      WHERE document_id = ${doc.id}::uuid
    `);

    await db
      .update(documents)
      .set({
        status: 'ready',
        pageCount: pageCount ?? null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(documents)
      .set({
        status: 'failed',
        errorMessage: message.slice(0, 1000),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    throw err;
  }
}
