'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IconPaperclip } from '@/components/ui/icons';
import { Button } from '@/components/ui/primitives';
import { CitationList } from '@/components/chat/CitationChip';
import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts';
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
  emptyState?: ReactNode;
  onPickFiles?: () => void;
  filesBusy?: boolean;
};

export function ChatPanel({ readyCount, emptyState, onPickFiles, filesBusy }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFocused = useRef(false);

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
  const canChat = readyCount > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  useEffect(() => {
    if (canChat && !hasFocused.current) {
      hasFocused.current = true;
      inputRef.current?.focus();
    }
  }, [canChat]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !canChat) return;
    setInput('');
    await sendMessage({ text });
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
              canChat
                ? 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]'
                : 'bg-[var(--text-muted)]'
            }`}
            aria-hidden
          />
          <p className="truncate text-xs font-medium text-[var(--text-muted)]">
            {canChat
              ? `${readyCount} document${readyCount === 1 ? '' : 's'} ready`
              : 'No documents indexed yet'}
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="!px-2 !py-1 text-[11px]"
            onClick={() => setMessages([])}
          >
            Clear chat
          </Button>
        )}
      </div>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && emptyState && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-4 py-10">
            {emptyState}
          </div>
        )}
        {messages.length === 0 && !emptyState && canChat && (
          <SuggestedPrompts onSelect={(text) => setInput(text)} />
        )}
        {messages.length === 0 && !emptyState && !canChat && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-4 py-8 text-center">
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
                className={`max-w-[min(42rem,90%)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[var(--accent-dim)] text-[var(--text)] border border-[var(--accent)]/25'
                    : 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]'
                }`}
              >
                <p className="whitespace-pre-wrap">{text}</p>
                {!isUser && <CitationList sources={sources} />}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]"
              aria-hidden
            />
            Streaming…
          </p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-elevated)]/70 px-3 py-3 backdrop-blur sm:px-4"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5 focus-within:border-[var(--accent)]/50 focus-within:ring-2 focus-within:ring-[var(--accent)]/15">
          {onPickFiles && (
            <button
              type="button"
              onClick={onPickFiles}
              disabled={isLoading || !!filesBusy}
              aria-label="Attach files"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              <IconPaperclip className="h-4 w-4" />
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              canChat
                ? 'Ask a question about your documents…'
                : 'Upload a document, then ask…'
            }
            disabled={!canChat || isLoading}
            className="min-h-10 flex-1 bg-transparent px-2 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <Button
            type="submit"
            disabled={!canChat || isLoading || !input.trim()}
            className="!h-10 !rounded-xl !px-4"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
