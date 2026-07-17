'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = { text: string };

const components: Components = {
  h1: ({ children }) => <h1 className="mt-3 mb-1.5 text-lg font-semibold tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 mb-1.5 text-base font-semibold tracking-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2.5 mb-1 text-sm font-semibold tracking-tight">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-2 mb-1 text-sm font-semibold">{children}</h4>,
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 ml-1 list-disc space-y-1 pl-5 marker:text-[var(--accent)]">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-1 list-decimal space-y-1 pl-5 marker:text-[var(--accent)]">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]">{children}</a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--accent)]/50 bg-[var(--surface-1)] px-3 py-1.5 text-[var(--text-muted)] italic">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[var(--surface-1)] px-1 py-0.5 font-mono text-[0.875em] text-[var(--text)]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 font-mono text-[0.85em] leading-relaxed">{children}</pre>
  ),
  hr: () => <hr className="my-3 border-[var(--border)]" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-[var(--border)] bg-[var(--surface-1)]">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-1.5 font-semibold text-[var(--text-muted)]">{children}</th>,
  td: ({ children }) => <td className="border-t border-[var(--border)] px-3 py-1.5 align-top">{children}</td>,
};

export function MarkdownContent({ text }: Props) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-[var(--text)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
