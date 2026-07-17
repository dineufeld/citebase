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

type Props = {
  documents: DocumentDTO[];
  onDelete: (id: string) => void;
  loading?: boolean;
};

export function DocumentList({ documents, onDelete, loading }: Props) {
  if (loading && documents.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)]">Loading library…</p>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        No documents yet. Upload a file to build your knowledge base.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="group rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 transition hover:bg-white/[0.03]"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text)]">
                {doc.filename}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {formatBytes(doc.byteSize)}
                {doc.pageCount != null ? ` · ${doc.pageCount}p` : ''}
              </p>
            </div>
            <Badge tone={statusTone(doc.status)}>
              {(doc.status === 'processing' || doc.status === 'pending') && (
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
              )}
              {doc.status}
            </Badge>
            <button
              type="button"
              aria-label={`Delete ${doc.filename}`}
              className="rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-[var(--danger)] focus-visible:opacity-100"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete “${doc.filename}”? This cannot be undone.`,
                  )
                ) {
                  onDelete(doc.id);
                }
              }}
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
          {doc.errorMessage && (
            <p className="mt-1.5 line-clamp-2 text-[11px] text-[var(--danger)]">
              {doc.errorMessage}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
