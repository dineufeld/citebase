'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Dropzone } from '@/components/upload/Dropzone';
import { DocumentList } from '@/components/upload/DocumentList';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Card } from '@/components/ui/primitives';
import type { DocumentDTO } from '@/types';

export function Workspace() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents ?? []);
      }
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

  const readyCount = documents.filter((d) => d.status === 'ready').length;

  async function onDelete(id: string) {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-xs font-bold text-[var(--accent)]">
              CB
            </span>
            <span className="text-sm font-semibold tracking-tight">Citebase</span>
          </Link>
          <p className="text-xs text-[var(--text-muted)]">Workspace</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[340px_1fr] lg:gap-6">
        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Library</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Upload PDFs or text. We chunk, embed, and index for hybrid search.
            </p>
            <div className="mt-4">
              <Dropzone onUploaded={() => void refresh()} />
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Documents
            </h3>
            <DocumentList
              documents={documents}
              onDelete={(id) => void onDelete(id)}
              loading={loading}
            />
          </Card>
        </aside>

        <section className="min-h-[70vh]">
          <ChatPanel readyCount={readyCount} />
        </section>
      </main>
    </div>
  );
}
