# Citebase UI/UX Polish Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> **Mode:** Planning only in this document. Do not implement until the user says go.

**Goal:** Raise the Citebase chat workspace and about page from “layout shipped” to a polished, product-grade chatbot UX — fix structural empty-state bugs, tighten visual hierarchy, improve mobile/a11y, and make upload + chat states feel intentional.

**Architecture:** Stay on the existing shell (header + sidebar/flyout + `ChatPanel` composer). Prefer surgical prop/layout fixes over rewrites. Move empty-state content into the **message scroll area** (not the header). Reuse design tokens in `globals.css` and primitives in `src/components/ui/primitives.tsx`. No new design system packages.

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind v4 · existing CSS variables · existing `Button` / `Badge` / `Card` primitives · no new UI libraries

---

## Current context / assumptions

### What’s already good
- Classic chatbot shell at `/` (and `/app`): left library, main chat, bottom composer.
- Dark cinematic palette (`--bg`, `--accent` emerald).
- Status badges, citation chips, processing poll, mobile Files trigger + fly-out.

### Highest-impact residual bugs (must fix)

1. **Empty-state upload is in the wrong place**  
   `Workspace` passes `CenterUpload` as `ChatPanel` `headerSlot`. `headerSlot` renders in the **top status bar** (flex row next to Clear), not the message stream. Result: a large “Upload documents” card crammed into the header chrome instead of a centered hero in the empty chat body.

2. **Double empty states**  
   When `messages.length === 0`, `ChatPanel` always shows “Grounded answers with citations” *and* (when no docs) the misplaced upload card. Users get competing empty states.

3. **Composer “+” disabled when no docs**  
   `onPickFiles` button uses `disabled={!canChat || isLoading}`. `canChat = readyCount > 0`. So the attach button cannot help the user upload their first file — only the broken header path can. Composer attach should stay enabled whenever `onPickFiles` exists (disable only while busy/uploading).

4. **Workspace `onPicked` has no busy/error UI**  
   Direct file-input uploads from `+` silently fail on network/API errors. `Dropzone` shows errors; the shared input path does not.

5. **Chat panel card chrome**  
   Full-height `Card` inside a full-height shell creates double borders / awkward min-height (`min-h-[420px]`) that fights `h-screen`. Prefer borderless fill for the main chat column.

### Secondary UX gaps (polish)

| Area | Issue |
|---|---|
| Mobile fly-out | No Escape-to-close; no focus trap; body can still scroll behind |
| Icons | Emoji `📁` / `✕` instead of consistent SVG icons |
| Document rows | Always-visible “Delete” is aggressive; no confirm; no processing spinner |
| Chat | No suggested prompt chips; messages not max-width constrained; streaming “Thinking…” is plain text |
| Composer | No Enter submit hint; no auto-focus when ready; no character/send affordance polish |
| Header | Status strip is thin; brand → About is fine but workspace lacks “ready” chip in header |
| About | Still solid; minor CTA/spacing alignment with chat tokens |

### Non-goals (YAGNI)
- New design system / shadcn / framer-motion.
- Theme switcher (light mode).
- Auth, multi-collection, PDF viewer.
- Rewriting retrieval/chat APIs.

### Constraints
- Read `AGENTS.md` / Next 16 docs before client edits (`'use client'`, serializable props across server boundary — all Workspace tree is client, OK).
- Keep routes: `/` chat, `/about` marketing, `/app` chat alias.
- Prefer copy-pasteable diffs; commit after logical groups if executing.

---

## Proposed approach

### Design principles
1. **One empty state at a time** — no docs → upload hero in message area; docs but no messages → suggested prompts; messages → conversation only.
2. **Upload from two equal paths** — center hero (first run) + composer attach (always when a picker is provided).
3. **Chat column is a pane, not a card** — fill height, subtle internal dividers only.
4. **Sidebar is a library** — denser file rows, quieter delete, clear status.
5. **Mobile fly-out is a real dialog** — Escape, focus return, slide-in, backdrop.

### Visual direction (keep tokens)
- Background `#07070a`, elevated `#0e0e12`, accent `#34d399`.
- Add optional tokens only if needed: `--surface-hover`, `--ring`.
- Prefer lucide-style **inline SVG** (hand-written, no package) for file/upload/send/close/paperclip.

### Layout target (empty library)

```
┌ header: brand | Files (mobile) ─────────────────────────────┐
├ sidebar ─┬──────────────────────────────────────────────────┤
│ Library  │  [status: No documents indexed yet]               │
│ docs…    │                                                   │
│          │           ┌─────────────────────┐                 │
│ Links    │           │  Upload to start    │  ← in scroll    │
│          │           │  [Upload documents] │     area only   │
│          │           └─────────────────────┘                 │
│          │                                                   │
│          │  ─────────────────────────────────────────────── │
│          │  [+]  Ask about your documents…          [Send]  │
└──────────┴──────────────────────────────────────────────────┘
```

### Layout target (ready, no messages)

```
│ status: 2 documents ready                         [Clear]   │
│                                                             │
│   Suggested: [PTO days?] [Refund window?] [Summarize…]      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [+]  Ask a question…                                [Send] │
```

---

## Step-by-step plan

### Task 1: Fix empty-state architecture (structural)

**Objective:** Put upload hero and empty chat content in the message stream; stop using `headerSlot` for the upload card.

**Files:**
- Modify: `src/components/chat/ChatPanel.tsx`
- Modify: `src/components/workspace/Workspace.tsx`
- Optionally keep: `src/components/workspace/CenterUpload.tsx` (used as empty-state body)

**Step 1: Change ChatPanel props**

Replace `headerSlot` with clearer slots:

```ts
type Props = {
  readyCount: number;
  emptyState?: ReactNode;      // rendered inside scroll area when messages.length === 0
  onPickFiles?: () => void;
  filesBusy?: boolean;         // disables attach while upload in flight
};
```

Remove `headerSlot` entirely.

**Step 2: Header stays status-only**

```tsx
<div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
  <div className="flex items-center gap-2 min-w-0">
    <span
      className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
        canChat ? 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]' : 'bg-[var(--text-muted)]'
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
    <Button type="button" variant="ghost" className="!px-2 !py-1 text-[11px]" onClick={() => setMessages([])}>
      Clear chat
    </Button>
  )}
</div>
```

**Step 3: Empty body logic**

Inside the scroll area:

```tsx
{messages.length === 0 && (
  emptyState ?? (
    <DefaultEmpty canChat={canChat} onPrompt={(t) => { setInput(t); }} />
  )
)}
```

When `emptyState` is provided (no docs), parent supplies `<CenterUpload />` centered:

```tsx
<div className="flex h-full min-h-[280px] flex-col items-center justify-center px-4 py-10">
  {emptyState}
</div>
```

When docs exist and no messages, show suggested prompts (Task 4).

**Step 4: Workspace wiring**

```tsx
<ChatPanel
  readyCount={readyCount}
  filesBusy={uploadBusy}
  onPickFiles={() => fileInputRef.current?.click()}
  emptyState={
    noDocsYet ? <CenterUpload onUploaded={() => void refresh()} /> : undefined
  }
/>
```

**Step 5: Verify**

Run: `npm run typecheck`  
Expected: PASS  
Manual: open `/` with empty library → upload card **centered in main pane**, not in top-right header.

**Step 6: Commit**

```bash
git add src/components/chat/ChatPanel.tsx src/components/workspace/Workspace.tsx
git commit -m "fix(ui): move empty-state upload into chat body"
```

---

### Task 2: Composer attach + upload feedback

**Objective:** Let users upload via `+` even with zero ready docs; surface busy/error for shared file input.

**Files:**
- Modify: `src/components/chat/ChatPanel.tsx` (attach disabled rules)
- Modify: `src/components/workspace/Workspace.tsx` (`uploadBusy`, `uploadError`)

**Step 1: Attach button rules**

```tsx
// Disable only while streaming or while parent reports filesBusy
disabled={isLoading || !!filesBusy}
```

Do **not** gate on `canChat`.

Placeholder:

```tsx
placeholder={
  canChat
    ? 'Ask a question about your documents…'
    : 'Upload a document, then ask…'
}
```

Send remains disabled when `!canChat`.

**Step 2: Workspace upload state**

```ts
const [uploadBusy, setUploadBusy] = useState(false);
const [uploadError, setUploadError] = useState<string | null>(null);

const onPicked = useCallback(async (files: FileList | null) => {
  if (!files?.length) return;
  setUploadBusy(true);
  setUploadError(null);
  try {
    for (const f of Array.from(files)) {
      const form = new FormData();
      form.append('file', f);
      const res = await fetch('/api/documents', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      if (data.document?.status === 'failed') {
        throw new Error(data.document.errorMessage || 'Ingest failed');
      }
    }
    await refresh();
  } catch (err) {
    setUploadError(err instanceof Error ? err.message : 'Upload failed');
  } finally {
    setUploadBusy(false);
  }
}, [refresh]);
```

**Step 3: Surface error**

Render a thin banner under the app header or above the composer:

```tsx
{uploadError && (
  <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300" role="alert">
    {uploadError}
  </div>
)}
```

Pass `filesBusy={uploadBusy}` into `ChatPanel`.

**Step 4: Verify**

Run: `npm run typecheck`  
Manual: with empty library, click composer `+` → file picker opens; on failure show banner.

**Step 5: Commit**

```bash
git commit -m "fix(ui): enable attach when empty and surface upload errors"
```

---

### Task 3: Chat column chrome (borderless pane)

**Objective:** Remove double-card look; make chat fill the main column cleanly.

**Files:**
- Modify: `src/components/chat/ChatPanel.tsx`

**Step 1: Replace outer Card**

From:

```tsx
<Card className="flex h-full min-h-[420px] flex-col overflow-hidden">
```

To:

```tsx
<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]">
```

**Step 2: Main fills height**

In `Workspace` main:

```tsx
<main className="flex min-h-0 min-w-0 flex-1 flex-col">
  <ChatPanel ... />
</main>
```

**Step 3: Message width**

Constrain bubbles for readability:

```tsx
className={`max-w-[min(42rem,90%)] rounded-2xl ...`}
```

**Step 4: Verify**

Manual: no nested double border around chat; composer flush to bottom of viewport.

**Step 5: Commit**

```bash
git commit -m "style(ui): borderless full-height chat pane"
```

---

### Task 4: Empty chat with docs — suggested prompts

**Objective:** When library has ready docs but no messages, show clickable starter prompts instead of only static copy.

**Files:**
- Create: `src/components/chat/SuggestedPrompts.tsx`
- Modify: `src/components/chat/ChatPanel.tsx`

**Step 1: Component**

```tsx
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
```

**Step 2: Wire**

When `messages.length === 0` and `!emptyState` and `canChat`:

```tsx
<SuggestedPrompts
  onSelect={(text) => {
    setInput(text);
    // optional: auto-send — prefer fill-only for control
  }}
/>
```

Optional enhancement: `onSelect` fills and focuses input; do not auto-send (YAGNI / safer).

**Step 3: Verify**

Manual: seed ready docs → empty chat shows 3 chips; click fills composer.

**Step 4: Commit**

```bash
git commit -m "feat(ui): suggested prompt chips for empty ready chat"
```

---

### Task 5: Icons + FilesTrigger polish

**Objective:** Replace emoji with small inline SVG icons; tighten mobile Files control.

**Files:**
- Create: `src/components/ui/icons.tsx` (tiny set)
- Modify: `src/components/workspace/FilesTrigger.tsx`
- Modify: `src/components/workspace/Sidebar.tsx` (close icon)
- Modify: `src/components/chat/ChatPanel.tsx` (paperclip / send if desired)

**Step 1: icons.tsx**

```tsx
export function IconPaperclip(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M21.44 11.05l-8.49 8.49a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFolder(props: React.SVGProps<SVGSVGElement>) { /* ... */ }
export function IconX(props: React.SVGProps<SVGSVGElement>) { /* ... */ }
export function IconSend(props: React.SVGProps<SVGSVGElement>) { /* ... */ }
export function IconUpload(props: React.SVGProps<SVGSVGElement>) { /* ... */ }
export function IconSpinner(props: React.SVGProps<SVGSVGElement>) { /* circle + animate-spin class on parent */ }
```

**Step 2: FilesTrigger**

```tsx
<button ... className="inline-flex items-center gap-2 rounded-xl border ... lg:hidden">
  <IconFolder className="h-3.5 w-3.5" />
  Files
  {count > 0 && <span className="...badge...">{count}</span>}
</button>
```

**Step 3: Composer attach**

Use `IconPaperclip` instead of `+` text; Send may keep text or use `IconSend`.

**Step 4: Verify + commit**

```bash
git commit -m "style(ui): replace emoji with inline SVG icons"
```

---

### Task 6: DocumentList density + safer delete

**Objective:** Quieter library rows; confirm before delete; processing affordance.

**Files:**
- Modify: `src/components/upload/DocumentList.tsx`

**Step 1: Row layout**

```tsx
<li className="group rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 transition hover:bg-white/[0.03]">
  <div className="flex items-center gap-2">
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{doc.filename}</p>
      <p className="text-[11px] text-[var(--text-muted)]">
        {formatBytes(doc.byteSize)}
        {doc.pageCount != null ? ` · ${doc.pageCount}p` : ''}
      </p>
    </div>
    <Badge tone={statusTone(doc.status)}>
      {(doc.status === 'processing' || doc.status === 'pending') && (
        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
      )}
      {doc.status}
    </Badge>
    <button
      type="button"
      aria-label={`Delete ${doc.filename}`}
      className="rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-[var(--danger)] focus-visible:opacity-100"
      onClick={() => {
        if (window.confirm(`Delete “${doc.filename}”? This cannot be undone.`)) {
          onDelete(doc.id);
        }
      }}
    >
      <IconX className="h-3.5 w-3.5" />
    </button>
  </div>
  {doc.errorMessage && (
    <p className="mt-1.5 text-[11px] text-[var(--danger)] line-clamp-2">{doc.errorMessage}</p>
  )}
</li>
```

**Step 2: Verify**

Manual: hover shows delete; confirm dialog; processing badge pulses.

**Step 3: Commit**

```bash
git commit -m "feat(ui): denser document rows with confirm delete"
```

---

### Task 7: Mobile fly-out a11y + motion

**Objective:** Escape closes fly-out; return focus to Files button; light slide-in; prevent body scroll.

**Files:**
- Modify: `src/components/workspace/Workspace.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/workspace/Sidebar.tsx` (optional panel class)

**Step 1: Escape + body lock**

```tsx
useEffect(() => {
  if (!flyoutOpen) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setFlyoutOpen(false);
  };
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', onKey);
  return () => {
    document.body.style.overflow = prev;
    window.removeEventListener('keydown', onKey);
  };
}, [flyoutOpen]);
```

**Step 2: Focus return**

Keep a ref on the Files button; on close, `filesTriggerRef.current?.focus()`.

**Step 3: Slide panel CSS**

```css
@keyframes citebase-slide-in {
  from { transform: translateX(-8px); opacity: 0.85; }
  to { transform: translateX(0); opacity: 1; }
}
.flyout-panel {
  animation: citebase-slide-in 140ms ease-out;
}
```

Apply `flyout-panel` to the flyout `Sidebar` wrapper.

**Step 4: Verify**

Manual (narrow or forced open): Escape closes; backdrop click closes; no background scroll.

**Step 5: Commit**

```bash
git commit -m "a11y(ui): escape, focus return, and slide-in for files flyout"
```

---

### Task 8: CenterUpload visual polish

**Objective:** Make first-run upload feel like a product hero, not a dashed box afterthought.

**Files:**
- Modify: `src/components/workspace/CenterUpload.tsx`
- Modify: `src/components/upload/Dropzone.tsx` (optional: accept `variant="button"` className passthrough already exists)

**Step 1: CenterUpload**

```tsx
export function CenterUpload({ onUploaded }: Props) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_48px_rgba(0,0,0,0.35)]">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)]">
        <IconUpload className="h-5 w-5" />
      </div>
      <p className="text-base font-semibold tracking-tight">Upload documents to get started</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
        PDF, TXT, or Markdown · max 10&nbsp;MB each. We chunk, embed, and index for hybrid search.
      </p>
      <div className="mt-5 flex justify-center">
        <Dropzone onUploaded={onUploaded} variant="button" label="Upload documents" />
      </div>
      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        Or use the paperclip in the composer anytime.
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git commit -m "style(ui): polish first-run upload hero"
```

---

### Task 9: Composer refinements

**Objective:** Stronger bottom bar; focus ring already exists; improve keyboard and loading.

**Files:**
- Modify: `src/components/chat/ChatPanel.tsx`

**Steps:**
1. Auto-focus input when `canChat` becomes true (once).
2. `onKeyDown` on input: already form submit on Enter; ensure Shift+Enter is not needed (single-line input — OK).
3. While `isLoading`, show subtle “Streaming…” next to Thinking with a pulse dot.
4. Composer bar:

```tsx
<form className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-elevated)]/70 p-3 backdrop-blur">
  <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[var(--border)] bg-black/30 p-1.5 focus-within:border-[var(--accent)]/50 focus-within:ring-2 focus-within:ring-[var(--accent)]/15">
    {/* attach */}
    <input className="min-h-10 flex-1 bg-transparent px-2 py-2 text-sm outline-none" />
    <Button type="submit" className="!h-10 !rounded-xl !px-4">Send</Button>
  </div>
</form>
```

**Commit:**

```bash
git commit -m "style(ui): refine chat composer and streaming affordance"
```

---

### Task 10: About page alignment (light)

**Objective:** Match about page CTA language and spacing to the fact that `/` is now the workspace.

**Files:**
- Modify: `src/app/about/page.tsx`

**Steps:**
1. Header brand → link to `/` (workspace) OR keep static; prefer **link brand to `/`** so About can return home via logo.
2. Primary CTA copy: “Open workspace” → **“Start chatting”** (optional).
3. Ensure max-width / section spacing consistent (`max-w-5xl`, existing OK).
4. No layout rewrite.

**Commit:**

```bash
git commit -m "style(ui): align about page CTAs with chat-as-home"
```

---

### Task 11: Final validation (product audit)

**Objective:** Prove UX improvements with gates + real UI checks (not typecheck alone).

**Automated**

```bash
npm run lint
npm run typecheck
npm run build
```

Expected: all exit 0 (only pre-existing `bm25.ts` unused-var warning OK).

**Manual DoD checklist**

| Check | Expected |
|---|---|
| `/` empty library | Upload hero **centered in main body**; status bar only status text |
| Composer `+` empty | Opens picker; works without ready docs |
| Upload error | Red banner, not silent fail |
| Ready + empty chat | Suggested prompts; click fills input |
| Ready + message | Bubbles max ~42rem; citations intact |
| Desktop sidebar | Denser rows; delete on hover + confirm |
| Mobile | Files opens fly-out; Escape closes; backdrop closes |
| `/about` | CTAs reach `/` chat |
| `/app` | Same shell as `/` |
| No double Card border | Chat pane flush |

**Optional:** screenshot desktop empty + ready + mobile fly-out for PR.

---

## Files likely to change

| Action | Path |
|---|---|
| Modify | `src/components/chat/ChatPanel.tsx` |
| Modify | `src/components/workspace/Workspace.tsx` |
| Modify | `src/components/workspace/CenterUpload.tsx` |
| Modify | `src/components/workspace/Sidebar.tsx` |
| Modify | `src/components/workspace/FilesTrigger.tsx` |
| Modify | `src/components/upload/DocumentList.tsx` |
| Modify | `src/components/upload/Dropzone.tsx` (only if needed for icon/label) |
| Modify | `src/app/globals.css` |
| Modify | `src/app/about/page.tsx` |
| Create | `src/components/chat/SuggestedPrompts.tsx` |
| Create | `src/components/ui/icons.tsx` |

No API, schema, or dependency changes.

---

## Tests / validation

- No UI test runner in repo; do not add Playwright in this pass (YAGNI unless user asks).
- Gates: `lint`, `typecheck`, `build`.
- Manual product audit (Task 11 table).
- Regression: chat still streams; citations still render; document poll/delete still work.

---

## Risks, tradeoffs, open questions

1. **Auto-send suggested prompts?**  
   Plan fills input only. Auto-send is faster but surprising. **Default: fill only.**

2. **Delete confirm via `window.confirm`**  
   Ugly but zero deps. Custom modal is nicer; out of scope unless user wants it.

3. **Focus trap in fly-out**  
   Full focus trap is more code; Escape + focus return is the 80% fix. Full trap optional follow-up.

4. **headerSlot removal is a breaking prop change**  
   Only Workspace uses ChatPanel — safe.

5. **Interview demo polish vs time**  
   Tasks 1–3 are mandatory (bugs/structure). Tasks 4–10 are polish ranked by impact. If timeboxed, ship **1 → 2 → 3 → 4 → 7 → 11** first.

6. **Open: brand icon system**  
   Hand-rolled SVG avoids packages; if user prefers `lucide-react`, say so before Task 5.

---

## Definition of done

- [ ] Empty-state upload lives in the message body, not the header
- [ ] One empty state at a time (upload vs prompts vs conversation)
- [ ] Composer attach works with zero ready documents
- [ ] Upload errors visible for shared picker path
- [ ] Chat column is full-height without double Card chrome
- [ ] Suggested prompts when ready + empty messages
- [ ] Document delete confirmed; quieter rows
- [ ] Mobile fly-out: Escape + body scroll lock
- [ ] Icons without emoji
- [ ] `lint` / `typecheck` / `build` green
- [ ] Manual DoD checklist all pass

---

## Execution order (recommended)

```
1 empty-state architecture
2 attach + upload feedback
3 borderless chat pane
4 suggested prompts
5 icons
6 document list
7 fly-out a11y
8 center upload polish
9 composer refinements
10 about light touch
11 validation audit
```

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
