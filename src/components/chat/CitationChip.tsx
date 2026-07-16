'use client';

import type { CitationSource } from '@/types';
import { Badge } from '@/components/ui/primitives';

export function CitationChip({ source }: { source: CitationSource }) {
  return (
    <Badge tone="accent">
      [{source.index}] {source.filename}
      {source.page != null ? ` p.${source.page}` : ''}
    </Badge>
  );
}

export function CitationList({ sources }: { sources: CitationSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s) => (
        <span key={`${s.chunkId}-${s.index}`} title={s.excerpt}>
          <CitationChip source={s} />
        </span>
      ))}
    </div>
  );
}
