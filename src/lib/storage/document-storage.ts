import { del, get, put } from '@vercel/blob';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';

function usesBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function saveDocumentFile(input: {
  documentId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<string> {
  const { documentId, filename, mimeType, buffer } = input;

  if (usesBlobStorage()) {
    const blob = await put(`documents/${documentId}/${filename}`, buffer, {
      access: 'private',
      addRandomSuffix: false,
      contentType: mimeType,
    });
    return blob.pathname;
  }

  const dir = path.join(process.cwd(), 'storage', documentId);
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, filename);
  await writeFile(storagePath, buffer);
  return storagePath;
}

export async function readDocumentFile(storagePath: string): Promise<Buffer> {
  if (usesBlobStorage()) {
    const result = await get(storagePath, { access: 'private' });
    if (!result || result.statusCode !== 200) {
      throw new Error('Uploaded document could not be read from Blob storage.');
    }
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  return readFile(storagePath);
}

export async function deleteDocumentFile(storagePath: string): Promise<void> {
  if (usesBlobStorage()) {
    await del(storagePath);
    return;
  }

  await rm(path.dirname(storagePath), { recursive: true, force: true });
}
