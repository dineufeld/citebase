'use client';

import { DocumentList } from '@/components/upload/DocumentList';
import { IconX } from '@/components/ui/icons';
import { SidebarLinks } from './SidebarLinks';
import type { DocumentDTO } from '@/types';

type Props = {
  documents: DocumentDTO[];
  loading: boolean;
  onDelete: (id: string) => void;
  onClose?: () => void;
  variant: 'desktop' | 'flyout';
};

export function Sidebar({ documents, loading, onDelete, onClose, variant }: Props) {
  const isFlyout = variant === 'flyout';
  const containerClass = isFlyout
    ? 'flex h-full w-72 flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4'
    : 'hidden h-full flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 lg:flex lg:w-72';

  const readyCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <aside className={containerClass} aria-label="Files sidebar">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Library</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
            {documents.length}
          </span>
          {isFlyout && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              aria-label="Close files"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {readyCount > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {readyCount} ready · {documents.length - readyCount} pending
        </p>
      )}
      <div className="min-h-0 flex-1">
        <DocumentList documents={documents} onDelete={onDelete} loading={loading} />
      </div>
      <SidebarLinks />
    </aside>
  );
}
