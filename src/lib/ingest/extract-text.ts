export class UnsupportedTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedTypeError';
  }
}

export type ExtractResult = {
  text: string;
  pageCount?: number;
};

function normalizeText(raw: string): string {
  return raw
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  const isPdf =
    mime === 'application/pdf' || ext === 'pdf';
  const isText =
    mime.startsWith('text/') ||
    mime === 'application/octet-stream' ||
    ext === 'txt' ||
    ext === 'md' ||
    ext === 'markdown';

  if (isPdf) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      const text = normalizeText(result?.text ?? '');
      if (!text) {
        throw new Error('PDF produced no extractable text (scanned image?).');
      }
      return {
        text,
        pageCount: result?.total ?? result?.pages?.length,
      };
    } finally {
      await parser.destroy().catch(() => undefined);
    }
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
