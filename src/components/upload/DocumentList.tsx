'use client';

import { IconX } from '@/components/ui/icons';
import { Badge } from '@/components/ui/primitives';
import type { DocumentDTO } from '@/types';

function statusTone(status: DocumentDTO['status']) {
  if (status === 'ready') return 'ok' as const;
  if (status === 'failed') return 'danger' as const;
  if (status === 'processing' || status === 'pending') return 'warn' as const;
  return 'neutral' as const;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text)]">{doc.filename}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {formatBytes(doc.byteSize)}
                {doc.pageCount != null ? ` · ${doc.pageCount}p` : ''}
              </p>
            </div>
            <span className="shrink-0">
              <Badge tone={statusTone(doc.status)}>
                {(doc.status === 'processing' || doc.status === 'pending') && (
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
                )}
                {doc.status === 'ready' ? 'Ready' : doc.status}
              </Badge>
            </span>
            <button
              type="button"
              aria-label={`Delete ${doc.filename}`}
              className="shrink-0 rounded-lg p-1 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-[var(--danger)] focus-visible:opacity-100"
              onClick={() => {
                if (window.confirm(`Delete “${doc.filename}”? This cannot be undone.`)) {
                  onDelete(doc.id);
                }
              }}
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
          {doc.errorMessage && (
            <p className="mt-1.5 line-clamp-2 text-[11px] text-[var(--danger)]">{doc.errorMessage}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
