export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = new Set(['pdf', 'txt', 'md', 'markdown']);

export function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180) || 'upload.bin';
}

export function extOf(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : '';
}

export function isAllowedUpload(filename: string): boolean {
  return ALLOWED_EXTENSIONS.has(extOf(filename));
}
