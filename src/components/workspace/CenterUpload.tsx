'use client';

import { Dropzone } from '@/components/upload/Dropzone';
import { IconUpload } from '@/components/ui/icons';

type Props = { onUploaded: () => void };

export function CenterUpload({ onUploaded }: Props) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_48px_rgba(0,0,0,0.35)]">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)]">
        <IconUpload className="h-5 w-5" />
      </div>
      <p className="text-base font-semibold tracking-tight">Upload documents to get started</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
        PDF, TXT, or Markdown · max 10&nbsp;MB each. We chunk, embed, and index for hybrid search.
      </p>
      <div className="mt-5 flex justify-center">
        <Dropzone onUploaded={onUploaded} variant="button" label="Upload documents" />
      </div>
      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        Or use the paperclip in the composer anytime.
      </p>
    </div>
  );
}
