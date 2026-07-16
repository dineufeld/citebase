import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents, chunks } from '@/lib/db/schema';
import { deleteDocumentFile } from '@/lib/storage/document-storage';

export const runtime = 'nodejs';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.delete(chunks).where(eq(chunks.documentId, id));
    await db.delete(documents).where(eq(documents.id, id));

    // Best-effort file cleanup
    try {
      await deleteDocumentFile(doc.storagePath);
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[documents DELETE]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 },
    );
  }
}
