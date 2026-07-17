'use client';

const DEFAULTS = [
  'How many days of PTO do full-time employees get?',
  'What is the refund window after purchase?',
  'Summarize the onboarding steps.',
];

type Props = {
  onSelect: (text: string) => void;
  prompts?: string[];
};

export function SuggestedPrompts({ onSelect, prompts = DEFAULTS }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
          <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text)]">Grounded answers with citations</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
          Ask anything in your library. Sources show up as chips under each answer
          so you can verify where every claim came from.
        </p>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {prompts.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className="group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-left text-sm text-[var(--text)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-dim)]"
            >
              <span className="flex-1">{p}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100"
                aria-hidden
              >
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
