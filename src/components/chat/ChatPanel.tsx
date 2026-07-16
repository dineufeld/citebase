'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from '@/components/ui/primitives';
import { CitationList } from '@/components/chat/CitationChip';
import type { CitationSource } from '@/types';

function partText(parts: Array<{ type: string; text?: string }> | undefined): string {
  if (!parts) return '';
  return parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('');
}

function extractSources(
  parts: Array<{ type: string; data?: unknown }> | undefined,
): CitationSource[] {
  if (!parts) return [];
  for (const p of parts) {
    if (p.type === 'data-sources' && Array.isArray(p.data)) {
      return p.data as CitationSource[];
    }
    // Some SDK builds nest custom data differently
    if (p.type === 'data-sources' && p.data && typeof p.data === 'object') {
      const d = p.data as { sources?: CitationSource[] };
      if (Array.isArray(d.sources)) return d.sources;
    }
  }
  return [];
}

type Props = {
  readyCount: number;
};

export function ChatPanel({ readyCount }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
      }),
    [],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const canChat = readyCount > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !canChat) return;
    setInput('');
    await sendMessage({ text });
  }

  return (
    <Card className="flex h-full min-h-[420px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Ask your library</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {canChat
              ? `${readyCount} document${readyCount === 1 ? '' : 's'} ready`
              : 'Upload and index at least one document to start'}
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="!px-2 !py-1 text-[11px]"
            onClick={() => setMessages([])}
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-black/20 px-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--text)]">
              Grounded answers with citations
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Try: “What are the refund rules?” or “Summarize the onboarding steps.”
            </p>
          </div>
        )}

        {messages.map((m) => {
          const text = partText(m.parts as never);
          const sources = m.role === 'assistant' ? extractSources(m.parts as never) : [];
          if (!text && sources.length === 0 && m.role === 'assistant') {
            return null;
          }
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[var(--accent-dim)] text-[var(--text)] border border-[var(--accent)]/25'
                    : 'bg-white/[0.04] text-[var(--text)] border border-[var(--border)]'
                }`}
              >
                <p className="whitespace-pre-wrap">{text}</p>
                {!isUser && <CitationList sources={sources} />}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <p className="text-xs text-[var(--text-muted)]">Thinking…</p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-[var(--border)] p-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              canChat
                ? 'Ask a question about your documents…'
                : 'Index a document first…'
            }
            disabled={!canChat || isLoading}
            className="h-11 flex-1 rounded-xl border border-[var(--border)] bg-black/30 px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          <Button type="submit" disabled={!canChat || isLoading || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}
