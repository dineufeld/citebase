import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { ensureDefaultCollection } from '@/lib/db/default-collection';
import { processDocument } from '@/lib/ingest/process-document';
import { deleteDocumentFile, saveDocumentFile } from '@/lib/storage/document-storage';
import type { DocumentDTO } from '@/types';
import { isAllowedUpload, MAX_UPLOAD_BYTES as MAX_BYTES, safeFilename } from '@/lib/upload/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

function toDTO(row: typeof documents.$inferSelect): DocumentDTO {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    status: row.status as DocumentDTO['status'],
    errorMessage: row.errorMessage,
    pageCount: row.pageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const collectionId = await ensureDefaultCollection();
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.collectionId, collectionId))
      .orderBy(desc(documents.createdAt));
    return NextResponse.json({ documents: rows.map(toDTO) });
  } catch (err) {
    console.error('[documents GET]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list documents' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File must be between 1 byte and ${MAX_BYTES} bytes` },
        { status: 400 },
      );
    }

    const filename = safeFilename(file.name || 'upload.bin');
    const ext = filename.includes('.')
      ? filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
      : '';
    if (!isAllowedUpload(filename)) {
      return NextResponse.json(
        { error: 'Only .pdf, .txt, and .md files are supported' },
        { status: 400 },
      );
    }

    const collectionId = await ensureDefaultCollection();
    const id = crypto.randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || guessMime(ext);
    const storagePath = await saveDocumentFile({
      documentId: id,
      filename,
      mimeType,
      buffer,
    });

    let row: typeof documents.$inferSelect;
    try {
      [row] = await db
        .insert(documents)
        .values({
          id,
          collectionId,
          filename,
          mimeType,
          byteSize: buffer.byteLength,
          storagePath,
          status: 'pending',
        })
        .returning();
    } catch (insertErr) {
      await deleteDocumentFile(storagePath).catch(() => undefined);
      throw insertErr;
    }

    // MVP: process inline (sync). Production would enqueue a worker.
    try {
      await processDocument(row.id);
    } catch (processErr) {
      console.error('[documents POST] process failed:', processErr);
      // Row already marked failed inside processDocument
    }

    const [fresh] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, row.id))
      .limit(1);

    return NextResponse.json(
      { document: toDTO(fresh ?? row) },
      { status: fresh?.status === 'ready' ? 201 : 202 },
    );
  } catch (err) {
    console.error('[documents POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}

function guessMime(ext: string): string {
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  return 'text/plain';
}
