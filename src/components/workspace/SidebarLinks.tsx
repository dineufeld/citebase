'use client';

import Link from 'next/link';

const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/', label: 'Workspace' },
  { href: 'https://github.com', label: 'Source' },
];

export function SidebarLinks() {
  return (
    <nav aria-label="Workspace links" className="space-y-1">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        Links
      </p>
      <ul className="space-y-0.5">
        {LINKS.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="block rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              {...(/^https?:/.test(l.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
