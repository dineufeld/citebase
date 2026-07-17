'use client';

import type { RefObject } from 'react';
import { IconFolder } from '@/components/ui/icons';

type Props = {
  count: number;
  onClick: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
};

export function FilesTrigger({ count, onClick, buttonRef }: Props) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-white/5 lg:hidden"
    >
      <IconFolder className="h-3.5 w-3.5" />
      Files
      {count > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-dim)] px-1 text-[10px] font-semibold text-[var(--accent)]">
          {count}
        </span>
      )}
    </button>
  );
}
