'use client';

import { IconX } from '@/components/ui/icons';
import type { DocumentDTO } from '@/types';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(filename: string) {
  if (/\.pdf$/i.test(filename)) return 'PDF';
  if (/\.txt$/i.test(filename)) return 'TXT';
  if (/\.md$/i.test(filename)) return 'MD';
  return 'DOC';
}

function fileColor(filename: string) {
  if (/\.pdf$/i.test(filename)) return 'border-red-500/30 text-red-400 bg-red-500/10';
  if (/\.txt$/i.test(filename)) return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
  if (/\.md$/i.test(filename)) return 'border-amber-500/30 text-amber-400 bg-amber-500/10';
  return 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--surface-1)]';
}

function SkeletonRow() {
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-[var(--surface-hover)]" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--surface-hover)]" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-[var(--surface-hover)]" />
        </div>
      </div>
    </li>
  );
}

type Props = {
  documents: DocumentDTO[];
  onDelete: (id: string) => void;
  loading?: boolean;
};

export function DocumentList({ documents, onDelete, loading }: Props) {
  if (loading && documents.length === 0) {
    return (
      <ul className="space-y-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </ul>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-1)] text-[var(--text-muted)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden>
            <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6" />
          </svg>
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          Upload a PDF, TXT, or Markdown file to build your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="group rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 transition hover:bg-[var(--surface-hover)]"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold tracking-wide ${fileColor(doc.filename)}`}
            >
              {fileIcon(doc.filename)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text)]">{doc.filename}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {formatBytes(doc.byteSize)}
                {doc.pageCount != null ? ` · ${doc.pageCount}p` : ''}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Delete ${doc.filename}`}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent text-[var(--text-muted)] transition hover:border-[var(--danger)]/30 hover:bg-red-500/10 hover:text-[var(--danger)]"
              onClick={() => {
                if (window.confirm(`Delete “${doc.filename}”? This cannot be undone.`)) {
                  onDelete(doc.id);
                }
              }}
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
          {doc.status === 'failed' && doc.errorMessage && (
            <p className="mt-1.5 line-clamp-2 text-[11px] text-[var(--danger)]">{doc.errorMessage}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
