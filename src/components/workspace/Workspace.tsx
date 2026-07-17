'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { CenterUpload } from './CenterUpload';
import { FilesTrigger } from './FilesTrigger';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ChatPanel } from '@/components/chat/ChatPanel';
import type { DocumentDTO } from '@/types';

export function Workspace() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (res.ok) setDocuments(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while any doc is still processing
  useEffect(() => {
    const busy = documents.some(
      (d) => d.status === 'pending' || d.status === 'processing',
    );
    if (!busy) return;
    const t = setInterval(() => void refresh(), 2000);
    return () => clearInterval(t);
  }, [documents, refresh]);

  const onDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh],
  );

  const readyCount = documents.filter((d) => d.status === 'ready').length;
  const noDocsYet = documents.length === 0;

  // Shared hidden file input — used by the centered upload button AND
  // the chat composer's "+" attach button, both via onPickFiles.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesTriggerRef = useRef<HTMLButtonElement>(null);

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
    filesTriggerRef.current?.focus();
  }, []);

  // Escape to close + body scroll lock while fly-out is open
  useEffect(() => {
    if (!flyoutOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFlyout();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [flyoutOpen, closeFlyout]);

  const onPicked = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploadBusy(true);
      setUploadError(null);
      try {
        for (const f of Array.from(files)) {
          const form = new FormData();
          form.append('file', f);
          const res = await fetch('/api/documents', { method: 'POST', body: form });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            document?: { status?: string; errorMessage?: string };
          };
          if (!res.ok) {
            throw new Error(data.error || `Upload failed (${res.status})`);
          }
          if (data.document?.status === 'failed') {
            throw new Error(data.document.errorMessage || 'Ingest failed');
          }
        }
        await refresh();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploadBusy(false);
      }
    },
    [refresh],
  );

  return (
    <div className="flex h-screen min-h-[640px] flex-col bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)]/80 px-4 py-3 backdrop-blur">
        <Link href="/about" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-xs font-bold text-[var(--accent)]">
            CB
          </span>
          <span className="text-sm font-semibold tracking-tight">Citebase</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <FilesTrigger
            count={documents.length}
            onClick={() => setFlyoutOpen(true)}
            buttonRef={filesTriggerRef}
          />
        </div>
      </header>

      {uploadError && (
        <div
          role="alert"
          className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300"
        >
          {uploadError}
        </div>
      )}

      {/* Body */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar (always mounted, hidden < lg) */}
        <Sidebar
          documents={documents}
          loading={loading}
          onDelete={(id) => void onDelete(id)}
          variant="desktop"
        />

        {/* Mobile fly-out + backdrop */}
        {flyoutOpen && (
          <div className="absolute inset-0 z-40" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Close files"
              onClick={closeFlyout}
              className="flyout-fade absolute inset-0 bg-[var(--backdrop)]"
            />
            <div className="flyout-panel relative z-50 h-full">
              <Sidebar
                documents={documents}
                loading={loading}
                onDelete={(id) => void onDelete(id)}
                onClose={closeFlyout}
                variant="flyout"
              />
            </div>
          </div>
        )}

        {/* Main column */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChatPanel
            readyCount={readyCount}
            filesBusy={uploadBusy}
            onPickFiles={() => fileInputRef.current?.click()}
            emptyState={
              noDocsYet ? (
                <CenterUpload onUploaded={() => void refresh()} />
              ) : undefined
            }
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              void onPicked(e.target.files);
              e.target.value = '';
            }}
          />
        </main>
      </div>
    </div>
  );
}