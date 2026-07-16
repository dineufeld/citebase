'use client';

import { Badge, Button } from '@/components/ui/primitives';
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
          className="rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text)]">
                {doc.filename}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {formatBytes(doc.byteSize)}
                {doc.pageCount != null ? ` · ${doc.pageCount} pages` : ''}
              </p>
              {doc.errorMessage && (
                <p className="mt-1 text-[11px] text-[var(--danger)] line-clamp-2">
                  {doc.errorMessage}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
              <Button
                type="button"
                variant="danger"
                className="!px-2 !py-1 text-[11px]"
                onClick={() => onDelete(doc.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
