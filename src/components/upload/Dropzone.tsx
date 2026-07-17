'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/primitives';

type Props = {
  onUploaded: () => void;
  disabled?: boolean;
  variant?: 'panel' | 'button';
  label?: string;
  className?: string;
};

export function Dropzone({
  onUploaded,
  disabled,
  variant = 'panel',
  label = 'Upload documents',
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/documents', { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Upload failed (${res.status})`);
        }
        if (data.document?.status === 'failed') {
          throw new Error(data.document.errorMessage || 'Ingest failed');
        }
        onUploaded();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setBusy(false);
      }
    },
    [onUploaded],
  );

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      for (const file of Array.from(files)) {
        await upload(file);
      }
    },
    [upload],
  );

  if (variant === 'button') {
    return (
      <div className={className}>
        <Button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Indexing…' : label}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          multiple
          className="hidden"
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {error && (
          <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled && !busy) void onFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
            : 'border-[var(--border)] bg-black/20'
        }`}
      >
        <p className="text-sm font-medium text-[var(--text)]">Drop documents here</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          PDF, TXT, MD · max 10 MB each
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Indexing…' : 'Choose files'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            multiple
            className="hidden"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
