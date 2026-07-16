import type { ExtractResult } from './extract-pdf';
export type { ExtractResult } from './extract-pdf';
export { normalizeText } from './extract-text-shared';

import { normalizeText } from './extract-text-shared';

export class UnsupportedTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedTypeError';
  }
}

function extOf(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : '';
}

/**
 * Turn uploaded bytes into plain text.
 * Supports PDF, plain text, and markdown.
 */
export async function extractText(input: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<ExtractResult> {
  const { buffer, mimeType, filename } = input;
  const ext = extOf(filename);
  const mime = (mimeType || '').toLowerCase();

  const isPdf = mime === 'application/pdf' || ext === 'pdf';
  const isText =
    mime.startsWith('text/') ||
    mime === 'application/octet-stream' ||
    ext === 'txt' ||
    ext === 'md' ||
    ext === 'markdown';

  if (isPdf) {
    const { extractPdfText } = await import('./extract-pdf');
    return extractPdfText(buffer);
  }

  if (isText || ext === 'txt' || ext === 'md' || ext === 'markdown') {
    const text = normalizeText(buffer.toString('utf8'));
    if (!text) {
      throw new Error('File is empty after normalization.');
    }
    return { text };
  }

  throw new UnsupportedTypeError(
    `Unsupported file type: ${mime || ext || 'unknown'}. Use .pdf, .txt, or .md.`,
  );
}
