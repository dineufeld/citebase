import { type ReactNode } from 'react';

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
  children: ReactNode;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary:
      'bg-[var(--primary-bg)] text-[var(--primary-text)] hover:brightness-110 shadow-[0_0_24px_var(--accent-dim)]',
    ghost:
      'bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-hover)]',
    danger:
      'bg-transparent text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/10',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';
}) {
  const tones = {
    neutral: 'bg-[var(--surface-hover)] text-[var(--text-muted)] border-[var(--border-soft)]',
    ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warn: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    danger: 'bg-red-500/15 text-red-300 border-red-500/30',
    accent: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${className}`}
    >
      {children}
    </div>
  );
}
