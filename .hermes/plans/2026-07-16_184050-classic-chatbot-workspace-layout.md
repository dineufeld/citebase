# Classic Chatbot Workspace Layout

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> **Mode:** Planning only in this document. Do not implement until the user says go.

**Goal:** Convert the Citebase workspace (`/app`) into a "classic chatbot" layout: file upload button centered above the conversation, uploaded files listed in a left sidebar on desktop / behind a fly-out on mobile, the chat input bar pinned to the bottom, and a small block of extra links in the sidebar.

**Architecture:** Two-column desktop shell (collapsible files sidebar + scrollable chat column with centered hero, messages stream, sticky composer). On mobile, the sidebar collapses behind a fly-out triggered by a "Files" button in the header; the same composer and centered upload button stay mounted. Everything reuses the existing primitives, Dropzone, DocumentList, and ChatPanel — no API changes.

**Tech Stack:**

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) — already in use | Read `node_modules/next/dist/docs/` before editing client components |
| UI | Tailwind v4 + existing CSS variables (`var(--bg)`, `var(--accent)`, etc.) | No new tokens, reuse dark cinematic palette |
| State | Local React state in `Workspace` (sidebar open / closed for mobile) | Document state already lives in `Workspace` |
| Components | `Dropzone`, `DocumentList`, `ChatPanel`, new `Sidebar`, `FilesFlyout`, `ComposerShell` wrappers | No new deps, no API route changes |

---

## Current context / assumptions

1. `/app` currently renders a 2-column grid (`lg:grid-cols-[340px_1fr]`) where the **left aside** contains *both* the upload dropzone *and* the document list stacked, and the **right column** is the existing `ChatPanel` (header → scroll area → input form at the bottom of the card).
2. The user wants the dropzone demoted out of the sidebar and promoted to a **centered "upload" button** sitting above the messages — i.e. the classic chat-bubble hero placement.
3. The sidebar becomes **files + links only** (no dropzone). It must already be collapsible on mobile (currently it just stacks above the chat). We need a fly-out pattern.
4. The chat input already lives at the bottom of the card — that's already correct. We just need to keep it there and style it as a proper sticky composer.
5. "Another links in the sidebar" → a small secondary nav block. We'll add a `Links` component with the obvious anchors (Docs / Source / Setup script) so it isn't an empty stub. The user can edit the list later.
6. The files fly-out on mobile should reuse the same `DocumentList` rendering — same data, same delete handlers.
7. No existing tests (no `*.test.tsx` in repo). We will not add a test framework for this UI rework; verification = `npm run lint` + `npm run typecheck` + manual `npm run dev` walkthrough described in the final task.
8. Hard rules from `AGENTS.md`: this is Next.js 16 — verify any assumption against `node_modules/next/dist/docs/` before writing components. In particular the layout uses `useChat` + `'use client'`, so any new client component must keep that directive and not import server-only modules.

---

## Proposed approach

1. **Rewrite `Workspace.tsx`** as a layout shell with:
   - `header` (brand + mobile "Files" button + desktop sidebar trigger if needed)
   - `Sidebar` (desktop: always visible; mobile: slide-in fly-out triggered by state + backdrop)
   - Main column:
     - `CenterUpload` — the dropzone in a compact "card with a big primary button" centered above the messages, only shown when `documents.length === 0` (classic onboarding) **or** behind an "Add files" affordance in the composer when docs already exist. *(See Task 4 for the exact rule.)*
     - `ChatPanel` continues to own messages + composer, but we strip its top "Ask your library" header and let it fill the column.
2. **`CenterUpload` component** wraps `<Dropzone>` but renders a single centered primary button ("Upload documents") with an inline hint — so the visual on a fresh workspace is a hero upload affordance, not a half-empty dropzone.
3. **`SidebarLinks` component** — a small list block under the file list. Initial entries:
   - "Citebase home" → `/`
   - "README" → `/README` (or anchor if we don't add a route — fallback to repo URL; see open question Q1)
   - "How it works" → in-page anchor / later docs route
4. **`FilesFlyout`** is just a positioned panel + backdrop, driven by a boolean in `Workspace` and locked open on `lg:`-and-up via CSS (no JS toggling on desktop).
5. **Composer polish** — the bottom input bar stays inside `ChatPanel` but gets a cleaner shell: a rounded card container with a leading "+" file button that opens the file picker (re-uses `Dropzone`'s hidden input), a text input, and a Send button.

### File-by-file plan

| Action | Path | Purpose |
|---|---|---|
| Modify | `src/components/workspace/Workspace.tsx` | Replace current grid with chatbot shell — sidebar fly-out + main column |
| Create | `src/components/workspace/Sidebar.tsx` | Files list + Links block; renders children fly-out on mobile |
| Create | `src/components/workspace/SidebarLinks.tsx` | Small nav list |
| Create | `src/components/workspace/CenterUpload.tsx` | Centered hero upload button wrapping `Dropzone` |
| Create | `src/components/workspace/FilesTrigger.tsx` | The header button + count badge for mobile |
| Modify | `src/components/chat/ChatPanel.tsx` | Drop the inline form header, expose a `headerSlot` prop, wrap composer in a styled shell, add `onPickFiles` for the "+" button |
| Modify | `src/components/upload/Dropzone.tsx` | Add `variant: 'panel' \| 'button'` so it can render as a centered primary button + accept `onError` callback |
| Modify | `src/app/globals.css` | Add a small utility class for sidebar fly-out translate + backdrop fade (Tailwind v4 inline if simpler) |

No new dependencies. No DB / API changes. `npm run build` should be the only build we run.

---

## Step-by-step plan

> Tasks are bite-sized (2–5 min each). All paths are relative to `/Users/neufeld/development/citebase`. Run `npm run lint` and `npm run typecheck` after every task.

### Task 1: Read Next.js 16 docs touchpoints before touching client components

**Objective:** Confirm there are no Next 16 gotchas that affect how a client shell composes children + fly-outs.

**Step 1:** Open `node_modules/next/dist/docs/` and locate the sections on `use client`, layouts, and any deprecation notes around `'use client'` directive placement.

**Step 2:** Skim `src/app/layout.tsx` and `src/app/app/page.tsx` — already read, no changes expected; just confirm `Workspace` is the only client component on the route.

**Step 3:** Note any deprecation warning shown for `'use client'` so each new component gets the directive at the top of the file.

Expected: no code edits, just a paragraph in your scratchpad for reference during Task 5–7.

### Task 2: Extend `Dropzone` with a `variant` prop

**Objective:** Let the same dropzone render as either the existing full panel or a single primary button (used by `CenterUpload` and the composer "+" file button).

**Files:**
- Modify: `src/components/upload/Dropzone.tsx`

**Step 1 — Update props:**

```ts
type Variant = 'panel' | 'button';
type Props = {
  onUploaded: () => void;
  disabled?: boolean;
  variant?: Variant;          // default 'panel'
  label?: string;              // button label, default 'Upload documents'
  className?: string;
};
```

**Step 2 — Branch the render.** When `variant === 'button'`:

```tsx
return (
  <div className={className}>
    <Button
      type="button"
      disabled={disabled || busy}
      onClick={() => inputRef.current?.click()}
    >
      {busy ? 'Indexing…' : label}
    </Button>
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
      multiple
      className="hidden"
      onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }}
    />
    {error && <p className="mt-2 text-xs text-[var(--danger)]" role="alert">{error}</p>}
  </div>
);
```

Keep the existing JSX for `variant === 'panel'` (default). Lift `upload`/`onFiles` into a single block shared by both branches.

**Step 3 — Verify:** `npm run typecheck` exits 0.

### Task 3: Create `SidebarLinks`

**Objective:** The "another links" block the user asked for in the sidebar.

**Files:**
- Create: `src/components/workspace/SidebarLinks.tsx`

```tsx
'use client';

import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Landing page' },
  { href: '/README', label: 'README' },          // see Q1
  { href: '/app', label: 'Workspace' },
  { href: 'https://github.com', label: 'Source' }, // placeholder
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
              className="block rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

**Verify:** `npm run typecheck` exits 0.

### Task 4: Create `CenterUpload`

**Objective:** Centered "Upload documents" hero that replaces the sidebar dropzone.

**Files:**
- Create: `src/components/workspace/CenterUpload.tsx`

```tsx
'use client';

import { Dropzone } from '@/components/upload/Dropzone';

type Props = { onUploaded: () => void };

export function CenterUpload({ onUploaded }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-black/20 px-6 py-8 text-center">
      <p className="text-sm font-medium">Upload documents to get started</p>
      <p className="text-xs text-[var(--text-muted)]">
        PDFs, TXT, or Markdown — we chunk, embed, and index for hybrid search.
      </p>
      <Dropzone onUploaded={onUploaded} variant="button" label="Upload documents" />
    </div>
  );
}
```

**Verify:** `npm run typecheck` exits 0.

### Task 5: Create `Sidebar` (with mobile fly-out behavior)

**Objective:** One component that renders the files list + links block. Stays mounted in the desktop DOM, slides in as fly-out on mobile.

**Files:**
- Create: `src/components/workspace/Sidebar.tsx`

```tsx
'use client';

import type { ReactNode } from 'react';
import { DocumentList } from '@/components/upload/DocumentList';
import { SidebarLinks } from './SidebarLinks';
import type { DocumentDTO } from '@/types';

type Props = {
  documents: DocumentDTO[];
  loading: boolean;
  onDelete: (id: string) => void;
  onClose?: () => void;       // mobile fly-out closer
  variant: 'desktop' | 'flyout';
};

export function Sidebar({ documents, loading, onDelete, onClose, variant }: Props) {
  const isFlyout = variant === 'flyout';
  const containerClass = isFlyout
    ? 'flex h-full w-72 flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4'
    : 'hidden h-full flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 lg:flex lg:w-72';

  return (
    <aside className={containerClass} aria-label="Files sidebar">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Library</h2>
        {isFlyout && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] hover:bg-white/5"
            aria-label="Close files"
          >
            ✕
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {documents.filter((d) => d.status === 'ready').length} ready
        {' · '}
        {documents.length} total
      </p>
      <div className="min-h-0 flex-1">
        <DocumentList documents={documents} onDelete={onDelete} loading={loading} />
      </div>
      <SidebarLinks />
    </aside>
  );
}
```

**Verify:** `npm run typecheck` exits 0.

### Task 6: Create `FilesTrigger` (mobile header button)

**Objective:** "Files" button in the header on `<lg` that opens the fly-out. Shows a count badge.

**Files:**
- Create: `src/components/workspace/FilesTrigger.tsx`

```tsx
'use client';

type Props = {
  count: number;
  onClick: () => void;
};

export function FilesTrigger({ count, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-white/5 lg:hidden"
    >
      <span aria-hidden>📁</span>
      Files
      {count > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-dim)] px-1 text-[10px] font-semibold text-[var(--accent)]">
          {count}
        </span>
      )}
    </button>
  );
}
```

**Verify:** `npm run typecheck` exits 0.

### Task 7: Trim `ChatPanel` and add a `headerSlot`

**Objective:** The panel now fills the main column. Strip the "Ask your library" top row (status string moves to a small chip in the header), let `Workspace` inject a header slot if it wants, and upgrade the composer shell.

**Files:**
- Modify: `src/components/chat/ChatPanel.tsx`

Changes:

```ts
type Props = {
  readyCount: number;
  headerSlot?: React.ReactNode;        // NEW
  onPickFiles?: () => void;           // NEW — opens system file dialog
};
```

A) **Top bar** (lines 75–95). Replace with:

```tsx
<div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
  <div className="flex items-center gap-2">
    <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
    <p className="text-xs font-medium text-[var(--text-muted)]">
      {canChat
        ? `${readyCount} document${readyCount === 1 ? '' : 's'} ready`
        : 'No documents indexed yet'}
    </p>
  </div>
  <div className="flex items-center gap-2">
    {headerSlot}
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
</div>
```

B) **Empty messages card** (lines 103–112). Keep, but place the centered `CenterUpload` slot *above* the messages list when there are zero docs (the parent will pass `headerSlot={documentsEmpty ? <CenterUpload onUploaded={refresh}/> : null}`). See Task 8 for the exact wiring.

C) **Composer shell** (lines 145–165). Replace with:

```tsx
<form
  onSubmit={onSubmit}
  className="border-t border-[var(--border)] bg-[var(--bg-elevated)]/60 p-3 backdrop-blur"
>
  <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-black/30 px-2 py-1.5 focus-within:border-[var(--accent)]/60 focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
    {onPickFiles && (
      <button
        type="button"
        onClick={onPickFiles}
        disabled={!canChat || isLoading}
        aria-label="Attach files"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5 disabled:opacity-50"
      >
        +
      </button>
    )}
    <input
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder={
        canChat
          ? 'Ask a question about your documents…'
          : 'Upload a document to start…'
      }
      disabled={!canChat || isLoading}
      className="h-10 flex-1 bg-transparent px-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
    />
    <Button type="submit" disabled={!canChat || isLoading || !input.trim()} className="!rounded-xl !px-4">
      Send
    </Button>
  </div>
</form>
```

Move the existing hidden file input into the parent `Workspace` (so the `+` button and the centered upload can both target it); see Task 8.

**Verify:** `npm run typecheck` exits 0. (No behavior change yet.)

### Task 8: Rewrite `Workspace` as the chatbot shell

**Objective:** The new layout lives here. Owns the mobile fly-out state, the shared file input ref, and the documents fetch (which is already here).

**Files:**
- Modify: `src/components/workspace/Workspace.tsx`

Full replacement:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { SidebarLinks } from './SidebarLinks';
import { CenterUpload } from './CenterUpload';
import { FilesTrigger } from './FilesTrigger';
import { ChatPanel } from '@/components/chat/ChatPanel';
import type { DocumentDTO } from '@/types';

export function Workspace() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (res.ok) setDocuments(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const busy = documents.some((d) => d.status === 'pending' || d.status === 'processing');
    if (!busy) return;
    const t = setInterval(() => void refresh(), 2000);
    return () => clearInterval(t);
  }, [documents, refresh]);

  const onDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh],
  );

  const readyCount = documents.filter((d) => d.status === 'ready').length;
  const noDocsYet = documents.length === 0;

  // Shared hidden file input — used by CenterUpload's "Upload documents" button
  // and by the chat composer's "+" button.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onPicked = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      const form = new FormData();
      form.append('file', f);
      await fetch('/api/documents', { method: 'POST', body: form });
    }
    await refresh();
  }, [refresh]);

  return (
    <div className="flex h-screen min-h-[640px] flex-col bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)]/80 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-xs font-bold text-[var(--accent)]">
            CB
          </span>
          <span className="text-sm font-semibold tracking-tight">Citebase</span>
        </Link>
        <FilesTrigger count={documents.length} onClick={() => setFlyoutOpen(true)} />
      </header>

      {/* Body */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar (always mounted) */}
        <Sidebar
          documents={documents}
          loading={loading}
          onDelete={(id) => void onDelete(id)}
          variant="desktop"
        />

        {/* Mobile fly-out + backdrop */}
        {flyoutOpen && (
          <div className="absolute inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Close files"
              onClick={() => setFlyoutOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <div className="relative z-50 h-full">
              <Sidebar
                documents={documents}
                loading={loading}
                onDelete={(id) => void onDelete(id)}
                onClose={() => setFlyoutOpen(false)}
                variant="flyout"
              />
            </div>
          </div>
        )}

        {/* Main column */}
        <main className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            readyCount={readyCount}
            onPickFiles={() => fileInputRef.current?.click()}
            headerSlot={
              noDocsYet ? (
                <div className="w-full px-4 py-6">
                  <CenterUpload onUploaded={() => void refresh()} />
                </div>
              ) : null
            }
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => { void onPicked(e.target.files); e.target.value = ''; }}
          />
        </main>
      </div>
    </div>
  );
}
```

**Notes:**
- `Workspace` keeps polling logic. It no longer renders `Dropzone` itself — `CenterUpload` does.
- The shared hidden input handles uploads from both the composer and the centered button.
- "Another links" — `SidebarLinks` is rendered inside `Sidebar` (Task 5 already placed it).
- Header on mobile shows `Files N`; on desktop the trigger is hidden via `lg:hidden`.

**Verify:** `npm run typecheck` exits 0.

### Task 9: Add a tiny CSS utility for the fly-out backdrop fade (optional)

**Objective:** Smoother backdrop fade-in if a simple `bg-black/60` button feels jarring.

**Files:**
- Modify: `src/app/globals.css`

Add at the bottom:

```css
@keyframes citebase-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.flyout-fade { animation: citebase-fade-in 120ms ease-out; }
```

Apply `flyout-fade` to the backdrop button in `Workspace`.

**Verify:** `npm run lint` exits 0.

### Task 10: Lint + typecheck + manual walkthrough

**Objective:** Verify everything still compiles and looks right.

**Step 1:** `npm run lint` — expected exit 0.

**Step 2:** `npm run typecheck` — expected exit 0.

**Step 3:** `npm run build` — expected exit 0 (catches any RSC/serialization issue with the new client composition).

**Step 4:** `npm run dev` (port 3001). Then check at three viewports:

| Viewport | Expected |
|---|---|
| `≥1024px` | Sidebar visible on left with Files block + Links block; no top Files trigger button; large green "Upload documents" button above empty chat messages |
| `<1024px` | Sidebar hidden; top-right "Files" trigger button visible with badge; tapping it opens fly-out from left with backdrop |
| Composer | Bottom rounded bar with `+` button on the left, text input centered, "Send" on the right; works with `readyCount > 0` |
| After upload | Empty-state cards disappear; messages and citations work exactly as before (no chat behavior change) |

**Step 5 (decision only):** If any step 1–3 fails, stop and fix before declaring done. Don't ship a green-on-top / broken-in-prod layout.

---

## Files likely to change

| Action | Path |
|---|---|
| Modify | `src/components/workspace/Workspace.tsx` |
| Modify | `src/components/chat/ChatPanel.tsx` |
| Modify | `src/components/upload/Dropzone.tsx` |
| Modify | `src/app/globals.css` |
| Create | `src/components/workspace/Sidebar.tsx` |
| Create | `src/components/workspace/SidebarLinks.tsx` |
| Create | `src/components/workspace/CenterUpload.tsx` |
| Create | `src/components/workspace/FilesTrigger.tsx` |

No API routes, no schema changes, no new packages.

---

## Tests / validation

There is no test runner in the repo today (`*.test.tsx` ⇒ no matches). For this UI rework we rely on:

- `npm run lint` — passes
- `npm run typecheck` — passes
- `npm run build` — passes (catches App Router / RSC regressions)
- Manual smoke at three viewports (Task 10 step 4) — and upload → ask → delete flows still work

If the user later wants UI tests, recommend adding **Playwright** with one "upload a fixture, ask a question, see citation" spec — but that's out of scope for this layout change.

---

## Risks, tradeoffs, open questions

- **Q1: README route.** The `SidebarLinks` list points at `/README`. There is no app router route for that today. Options:
  - Add `src/app/readme/page.tsx` that renders `README.md` server-side.
  - Drop the link and keep only "Landing page" / "Workspace" / "Source".
  - Point at the GitHub blob if the repo is public.
  *Recommendation:* ask the user before implementing; falling back to "drop the link" is the cheapest and safest.
- **Fly-out scroll trap.** On mobile, the sidebar content scrolls internally so the page behind doesn't move. The current shape (`overflow-y-auto` on the aside) handles it; verify on iOS Safari during the manual step.
- **Composer `+` button parity.** Sharing one hidden `<input>` between `CenterUpload` and the composer means an upload triggered from the composer doesn't show the centered empty-state again — good. But if the user prefers *only* the centered button when there are no docs (and no composer `+`), we should hide `onPickFiles` in that state. Decide in Task 7 wiring.
- **Sidebar always visible on desktop.** Always-on is simpler and matches the requested "list uploaded files in the sidebar on desktop". The fly-out is purely a mobile convenience. If the user later wants a collapsible desktop sidebar (icon-rail mode), that's a follow-up task.
- **Accessibility.** Fly-out uses `role="dialog"` + `aria-modal="true"` and an `aria-label="Close files"` button. Keyboard close (Escape) is *not* wired yet — flag as a possible follow-up if the user cares.
- **No re-introduction of "scroll lock the body" bugs.** The Workspace wraps the whole screen in `h-screen` and the chat scroll area is the only internally-scrolling region. Make sure not to wrap `<body>` or use `document.body.style.overflow = "hidden"` in JS.
- **Dropzone `variant='button'` removed drag-and-drop?** By design, no — drag-and-drop is only useful on the centered empty state. If we want drag-anywhere over the whole chat column that's a follow-up. For now, drag-drop is gone from the button variant (it's a click-only button).

---

## Definition of done

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm run build` exits 0
- [ ] Desktop: sidebar (Files + Links) visible on the left, chat column on the right
- [ ] Mobile: sidebar collapsed, "Files N" button opens fly-out, backdrop closes it
- [ ] Centered "Upload documents" affordance above empty chat
- [ ] Composer pinned to bottom with `+` attach + text + Send
- [ ] Uploading, indexing, asking, and citations behave exactly as before
- [ ] No regressions in `ChatPanel` message rendering, citation chips, or error banner

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
