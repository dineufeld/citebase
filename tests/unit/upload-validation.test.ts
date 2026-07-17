import { describe, expect, it } from 'vitest';
import {
  ALLOWED_EXTENSIONS,
  extOf,
  isAllowedUpload,
  MAX_UPLOAD_BYTES,
  safeFilename,
} from '@/lib/upload/validation';

describe('safeFilename', () => {
  it('strips path traversal segments and shell-meaningful characters', () => {
    expect(safeFilename('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(safeFilename('foo bar;rm -rf /.pdf')).toBe('foo_bar_rm_-rf_.pdf');
    expect(safeFilename('hello/world?.txt')).toBe('hello_world_.txt');
  });

  it('preserves dots, hyphens, and alphanumerics', () => {
    expect(safeFilename('q1-2026.report.pdf')).toBe('q1-2026.report.pdf');
    expect(safeFilename('r_sum_.md')).toBe('r_sum_.md');
  });

  it('caps the result at 180 characters', () => {
    const veryLong = 'a'.repeat(300) + '.pdf';
    expect(safeFilename(veryLong).length).toBeLessThanOrEqual(180);
  });

  it('falls back to upload.bin for empty or fully-stripped input', () => {
    expect(safeFilename('')).toBe('upload.bin');
    expect(safeFilename('   ')).toBe('_');
    expect(safeFilename('///')).toBe('_');
  });
});

describe('extOf + isAllowedUpload', () => {
  it('extracts the lowercased extension or empty string', () => {
    expect(extOf('foo.PDF')).toBe('pdf');
    expect(extOf('foo.tar.gz')).toBe('gz');
    expect(extOf('noext')).toBe('');
    expect(extOf('.hidden')).toBe('hidden');
  });

  it('allows only pdf/txt/md/markdown extensions', () => {
    expect(isAllowedUpload('a.pdf')).toBe(true);
    expect(isAllowedUpload('a.txt')).toBe(true);
    expect(isAllowedUpload('a.md')).toBe(true);
    expect(isAllowedUpload('a.markdown')).toBe(true);
    expect(isAllowedUpload('a.exe')).toBe(false);
    expect(isAllowedUpload('a')).toBe(false);
  });

  it('exposes the constants the route uses', () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
    expect([...ALLOWED_EXTENSIONS].sort()).toEqual(['markdown', 'md', 'pdf', 'txt']);
  });
});
