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
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-10 text-center">
      <div>
        <p className="text-sm font-medium text-[var(--text)]">Grounded answers with citations</p>
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          Ask anything in your library. Sources show up as chips under each answer.
        </p>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {prompts.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-left text-sm text-[var(--text)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-dim)]"
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
