import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ingest/extract-pdf', () => ({
  extractPdfText: vi.fn(async (buf: { length: number }) => ({
    text: `pdf-text:${buf.length}`,
  })),
}));

import { extractText, UnsupportedTypeError } from '@/lib/ingest/extract-text';
import { extractPdfText } from '@/lib/ingest/extract-pdf';

const mockPdf = vi.mocked(extractPdfText);

describe('extractText dispatch', () => {
  it('routes application/pdf and .pdf to the PDF branch', async () => {
    mockPdf.mockClear();
    const buf = Buffer.from('%PDF-1.4 fake');
    const a = await extractText({ buffer: buf, mimeType: 'application/pdf', filename: 'doc.bin' });
    expect(a.text).toBe('pdf-text:13');
    const b = await extractText({ buffer: buf, mimeType: 'text/plain', filename: 'doc.pdf' });
    expect(b.text).toBe('pdf-text:13');
    expect(mockPdf).toHaveBeenCalledTimes(2);
  });

  it('normalizes text uploads (UTF-8, CRLF → LF, trim)', async () => {
    const buf = Buffer.from('hello\r\n\r\nworld\r\n');
    const r = await extractText({ buffer: buf, mimeType: 'text/plain', filename: 'a.txt' });
    expect(r.text).toBe('hello\n\nworld');
  });

  it('routes markdown uploads through the text branch', async () => {
    mockPdf.mockClear();
    const buf = Buffer.from('# Title\n\nbody');
    const r = await extractText({ buffer: buf, mimeType: 'text/markdown', filename: 'a.md' });
    expect(r.text).toBe('# Title\n\nbody');
    expect(mockPdf).not.toHaveBeenCalled();
  });

  it('routes .markdown extension through the text branch regardless of mime', async () => {
    mockPdf.mockClear();
    const buf = Buffer.from('hi');
    const r = await extractText({
      buffer: buf,
      mimeType: 'application/octet-stream',
      filename: 'note.markdown',
    });
    expect(r.text).toBe('hi');
    expect(mockPdf).not.toHaveBeenCalled();
  });

  it('throws "File is empty after normalization." for empty text payloads', async () => {
    const buf = Buffer.from('   \n\n   ');
    await expect(
      extractText({ buffer: buf, mimeType: 'text/plain', filename: 'a.txt' }),
    ).rejects.toThrow(/empty after normalization/i);
  });

  it('throws UnsupportedTypeError for unsupported extensions', async () => {
    mockPdf.mockClear();
    await expect(
      extractText({ buffer: Buffer.from('x'), mimeType: 'application/x-msdownload', filename: 'a.exe' }),
    ).rejects.toBeInstanceOf(UnsupportedTypeError);
    expect(mockPdf).not.toHaveBeenCalled();
  });
});
