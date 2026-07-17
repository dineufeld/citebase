# Citebase — Light Mode Default + Black Mode Toggle + Readability Polish

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> **Mode:** Planning only in this document. Do not implement until the user says go.

**Goal:** Flip the default theme to **light** (high readability, accessible AA contrast), expose **black** as a second optional theme via a header toggle, and improve overall product readability — without breaking the existing dark palette tokens.

**Architecture:** Extend the existing CSS variable system (`--bg`, `--bg-elevated`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-dim`, `--danger`) so each variable has a `:root` (light) value and a `:root[data-theme="dark"]` override (black). Add a third `:root[data-theme="black"]` for a deeper, cinematic dark. Add a tiny client `ThemeToggle` that writes to `localStorage` + flips the `data-theme` attribute and reads the user preference synchronously in `<head>` to avoid FOUC. Audit and replace the ~12 hardcoded `bg-black/*`, `bg-white/*`, `border-white/*` and `rgba(...)` colors with token-backed Tailwind utilities. Improve small-text readability (line-height, contrast, focus rings).

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind v4 · existing tokens in `globals.css` · plain `<script>` for no-flash init · no new deps.

---

## Current context / assumptions

### What's already tokenized (good)
90+ uses of `var(--bg)`, `var(--text)`, `var(--border)`, `var(--accent)`, `var(--accent-dim)`, `var(--text-muted)`, `var(--danger)`, `var(--bg-elevated)` across components. Theme system is centralized in `src/app/globals.css`.

### What's still hardcoded (must fix for theming)

| File | Hardcoded value | Token we want |
|---|---|---|
| `primitives.tsx:18` | `hover:bg-white/5` | `hover:bg-[var(--surface-hover)]` |
| `primitives.tsx:37` | `bg-white/5 ... border-white/10` | new `--surface-hover` + `--border-soft` |
| `SuggestedPrompts.tsx:29` | `bg-black/20` | `bg-[var(--surface-1)]` |
| `ChatPanel.tsx:133` | `bg-black/20` (dashed empty card) | `bg-[var(--surface-1)]` |
| `ChatPanel.tsx:159` | `bg-white/[0.04]` (assistant bubble) | `bg-[var(--surface-2)]` |
| `ChatPanel.tsx:184` | `bg-black/30` (composer shell) | `bg-[var(--surface-1)]` |
| `ChatPanel.tsx:191` | `hover:bg-white/5` (attach) | `hover:bg-[var(--surface-hover)]` |
| `FilesTrigger.tsx:18` | `hover:bg-white/5` | `hover:bg-[var(--surface-hover)]` |
| `Workspace.tsx:152` | `bg-black/60` (flyout backdrop) | `bg-[var(--backdrop)]` |
| `Sidebar.tsx:32` | `hover:bg-white/5` | `hover:bg-[var(--surface-hover)]` |
| `SidebarLinks.tsx:22` | `hover:bg-white/5` | `hover:bg-[var(--surface-hover)]` |
| `Dropzone.tsx:108` | `bg-black/20` | `bg-[var(--surface-1)]` |
| `DocumentList.tsx:46` | `bg-black/20` + `hover:bg-white/[0.03]` | `bg-[var(--surface-1)] hover:bg-[var(--surface-hover)]` |
| `CenterUpload.tsx:10` | `rgba(255,255,255,0.02), rgba(0,0,0,0.35)` shadows | use new `--shadow-card` token |
| `about/page.tsx:12` | `rgba(52,211,153,0.18)` glow | `var(--accent-glow)` |

### Light-mode target palette (default)

| Token | Light | Black (dark) |
|---|---|---|
| `--bg` | `#fafaf9` (warm off-white) | `#07070a` (current) |
| `--bg-elevated` | `#ffffff` | `#0e0e12` |
| `--surface-1` | `#f4f4f5` (zinc-100) | `rgba(255,255,255,0.04)` |
| `--surface-2` | `#ffffff` | `rgba(255,255,255,0.06)` |
| `--surface-hover` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.05)` |
| `--border` | `rgba(10,10,15,0.10)` | `rgba(255,255,255,0.08)` |
| `--border-soft` | `rgba(10,10,15,0.06)` | `rgba(255,255,255,0.10)` |
| `--text` | `#0a0a0c` | `#f4f4f5` |
| `--text-muted` | `#52525b` (zinc-600, AA on white) | `#a1a1aa` |
| `--accent` | `#0f766e` (teal-700, AA on white) | `#34d399` |
| `--accent-dim` | `rgba(15,118,110,0.10)` | `rgba(52,211,153,0.15)` |
| `--accent-glow` | `rgba(15,118,110,0.18)` | `rgba(52,211,153,0.18)` |
| `--danger` | `#b91c1c` (red-700, AA on white) | `#f87171` |
| `--backdrop` | `rgba(15,15,20,0.45)` | `rgba(0,0,0,0.60)` |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)` | `0 0 0 1px rgba(255,255,255,0.02), 0 24px 48px rgba(0,0,0,0.35)` |

(Initial palette only ships light + black. A third "dim" dark mode is YAGNI for now.)

### Constraints
- Light mode must ship AA contrast: `--text` on `--bg` ≥ 7:1, `--text-muted` on `--bg` ≥ 4.5:1, accent buttons meet AA large-text (3:1).
- No FOUC on first paint (no white flash for dark-preferring users).
- Header toggle visible on `/`, `/app`, `/about`.
- Existing APIs/retrieval/Dropzone/CSS keyframes untouched.

---

## Proposed approach

1. **Token overhaul** in `globals.css` — restructure `:root` (light default) + add `[data-theme="dark"]` (black). Add new surface/shadow/backdrop tokens.
2. **No-flash bootstrap script** in `layout.tsx` — tiny inline `<script>` reads `localStorage.theme` and sets `<html data-theme>` before paint.
3. **`ThemeToggle`** client component — header button with sun/moon icons, flips theme, persists to `localStorage`.
4. **Component audit pass** — replace all hardcoded `bg-black/*`, `bg-white/*`, `border-white/*` with token-backed utilities.
5. **Readability pass** — bump small-text line-heights, add `text-balance` on hero, ensure focus rings visible on light.
6. **Manual visual audit** at three viewports for both themes.

---

## Step-by-step plan

### Task 1: Token overhaul in globals.css

**Objective:** Make light the default and expose a black theme via `[data-theme="dark"]`.

**Files:** `src/app/globals.css`

**Step 1:** Replace the existing `:root` block with the new tokens (light defaults).

**Step 2:** Add right after `:root`:

```css
:root[data-theme="dark"] {
  --bg: #07070a;
  --bg-elevated: #0e0e12;
  --surface-1: rgba(255, 255, 255, 0.04);
  --surface-2: rgba(255, 255, 255, 0.06);
  --surface-hover: rgba(255, 255, 255, 0.05);
  --border: rgba(255, 255, 255, 0.08);
  --border-soft: rgba(255, 255, 255, 0.10);
  --text: #f4f4f5;
  --text-muted: #a1a1aa;
  --accent: #34d399;
  --accent-dim: rgba(52, 211, 153, 0.15);
  --accent-glow: rgba(52, 211, 153, 0.18);
  --danger: #f87171;
  --backdrop: rgba(0, 0, 0, 0.60);
  --shadow-card: 0 0 0 1px rgba(255, 255, 255, 0.02), 0 24px 48px rgba(0, 0, 0, 0.35);
}
```

**Step 3:** Keep keyframes + `.flyout-fade` + `.flyout-panel` unchanged.

**Step 4:** Add `prefers-color-scheme` fallback inside `<script>` (handled in Task 2 — Task 1 just defines tokens).

**Verify:** `npm run build` succeeds; tokens resolve in dev.

---

### Task 2: No-flash bootstrap script in root layout

**Objective:** Apply the saved theme **before** React hydrates so dark-preferring users don't see a light flash.

**Files:** `src/app/layout.tsx`

**Step 1:** Inside `<html>` (or right before `</body>`), add:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var t=localStorage.getItem('cb-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
  }}
/>
```

Place it inside `<head>` (after the `manrope` className) so it runs before paint.

**Verify:** Reload with `localStorage.cb-theme === 'dark'` and confirm no white flash.

---

### Task 3: ThemeToggle component

**Objective:** Header button that flips between light and black, with icon and accessible label.

**Files:** Create `src/components/ui/ThemeToggle.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { IconSun, IconMoon } from '@/components/ui/icons';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('cb-theme', next); } catch {}
    setTheme(next);
  }

  // Avoid hydration mismatch — render a neutral button until mounted.
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to black theme'}
      title={isDark ? 'Light mode' : 'Black mode'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
    >
      {mounted && isDark ? <IconMoon className="h-3.5 w-3.5" /> : <IconSun className="h-3.5 w-3.5" />}
    </button>
  );
}
```

**Add** `IconSun` and `IconMoon` to `src/components/ui/icons.tsx`.

**Verify:** Build passes; clicking flips `data-theme`; reload preserves choice.

---

### Task 4: Wire ThemeToggle into header

**Objective:** Show toggle in the chat workspace header and on `/about`.

**Files:**
- Modify `src/components/workspace/Workspace.tsx` — add `<ThemeToggle />` next to `FilesTrigger`.
- Modify `src/app/about/page.tsx` — add `<ThemeToggle />` next to the brand button (wrap in client island or move both into a small client wrapper; simplest: create `AboutHeaderActions` client component that includes toggle + Start chatting).

**Step 1:** Workspace header (always-right side):

```tsx
<div className="flex items-center gap-2">
  <ThemeToggle />
  <FilesTrigger count={documents.length} onClick={() => setFlyoutOpen(true)} />
</div>
```

**Step 2:** About: create `src/components/workspace/AboutHeaderActions.tsx` (client) returning `<div className="flex items-center gap-2"><ThemeToggle /><Link href="/"><Button>Start chatting</Button></Link></div>`. Replace inline button in about/page.tsx with this island.

**Verify:** Header toggle present on `/`, `/app`, `/about`.

---

### Task 5: Tokenize hardcoded surface colors

**Objective:** Replace `bg-black/*`, `bg-white/*`, `border-white/*`, and stray `rgba(...)` with token-backed utilities so themes actually work.

**Files (mechanical find-replace per file):**

| File | Replace |
|---|---|
| `src/components/ui/primitives.tsx` | `hover:bg-white/5` → `hover:bg-[var(--surface-hover)]`; `border-white/10` → `border-[var(--border-soft)]`; `bg-white/5` → `bg-[var(--surface-hover)]` |
| `src/components/chat/SuggestedPrompts.tsx` | `bg-black/20` → `bg-[var(--surface-1)]`; `hover:bg-[var(--accent-dim)]` (already tokenized) |
| `src/components/chat/ChatPanel.tsx` | `bg-black/20` → `bg-[var(--surface-1)]`; `bg-white/[0.04]` → `bg-[var(--surface-2)]`; `bg-black/30` → `bg-[var(--surface-1)]`; `hover:bg-white/5` → `hover:bg-[var(--surface-hover)]`; composer shell `bg-[var(--bg-elevated)]/70` already tokens |
| `src/components/workspace/FilesTrigger.tsx` | `hover:bg-white/5` → `hover:bg-[var(--surface-hover)]` |
| `src/components/workspace/Workspace.tsx` | `bg-black/60` → `bg-[var(--backdrop)]` |
| `src/components/workspace/Sidebar.tsx` | `hover:bg-white/5` → `hover:bg-[var(--surface-hover)]` |
| `src/components/workspace/SidebarLinks.tsx` | `hover:bg-white/5` → `hover:bg-[var(--surface-hover)]` |
| `src/components/workspace/CenterUpload.tsx` | replace inline `shadow-[...]` value with `shadow-[var(--shadow-card)]` |
| `src/components/upload/Dropzone.tsx` | `bg-black/20` → `bg-[var(--surface-1)]` |
| `src/components/upload/DocumentList.tsx` | `bg-black/20` → `bg-[var(--surface-1)]`; `hover:bg-white/[0.03]` → `hover:bg-[var(--surface-hover)]` |
| `src/app/about/page.tsx` | `rgba(52,211,153,0.18)` in radial-gradient inline style → `var(--accent-glow)` |

**Verify:** `npm run typecheck && npm run lint` exit 0; switch theme in browser — all surfaces flip correctly.

---

### Task 6: Readability pass (small text + focus)

**Objective:** Improve small-text legibility and ensure focus rings stay visible on light backgrounds.

**Files:**
- `src/components/chat/ChatPanel.tsx` — empty-state card copy line-height, assistant bubble `leading-relaxed` is fine; bump `--text-muted` font weight on the status pill to `font-medium` (already is).
- `src/components/workspace/Sidebar.tsx` — increase count text line-height from default.
- `src/components/upload/DocumentList.tsx` — increase muted line-height.
- `src/app/globals.css` — add:
  ```css
  ::selection { background: var(--accent-dim); color: var(--text); }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
  ```
  Tailwind focus rings (`focus-visible:ring-[var(--accent)]`) keep working — this is just a fallback.

**Verify:** Lighthouse contrast check on light mode passes AA for body/muted text; keyboard tab shows clear focus ring.

---

### Task 7: About page glow + hero contrast (light)

**Objective:** Make sure the radial glow and eyebrow color still read well on light.

**Files:** `src/app/about/page.tsx`

**Step 1:** Already tokenized via Task 5 (`var(--accent-glow)`).
**Step 2:** Ensure hero h1 color is `var(--text)` (it is via `text-[var(--text)]` ancestor).
**Step 3:** Verify feature cards (`Card` primitive) have AA contrast in light — `Card` uses `bg-[var(--bg-elevated)]` + `border-[var(--border)]`. In light mode this is `#ffffff` with a soft border → AAA against `--text`.

**Verify:** Browser screenshot of `/about` in light mode — readable, no washed-out card edges.

---

### Task 8: ThemeToggle persistence + system-preference sync

**Objective:** On first visit (no saved preference), honor `prefers-color-scheme`. Allow system sync toggle later (YAGNI for now).

**Files:** `src/app/globals.css` + the bootstrap script (already in Task 2).

**Step 1:** Confirm the script also handles `prefers-color-scheme` correctly when `localStorage.cb-theme` is absent.

**Step 2:** Don't add a "system" mode in this pass; explicit light/dark only. Document this in README's footer.

**Verify:** First-time visit in dark-mode OS → app opens in dark; clicking toggle flips to light; reload persists light.

---

### Task 9: Final visual audit (light + dark)

**Objective:** Manual verification at three viewports × two themes.

**Procedure:**
1. Open `/` in light — sidebar, header, composer, upload hero all readable.
2. Toggle to black — all surfaces flip, no remaining light surfaces (no `bg-white/*` leaks).
3. Mobile fly-out — backdrop tone matches theme.
4. `/about` — both themes render cleanly, glow visible but subtle.
5. Tab through `/` keyboard-only — every interactive element shows the green focus ring.

**Verify:** Checklist signed off.

---

### Task 10: README + Footer note

**Objective:** Document the new theme toggle.

**Files:** `README.md`

Add a short note under the "Stack" or "Useful scripts" section:

```markdown
### Theme
Default theme is **light**. Toggle to **black** via the sun/moon button in the
header. Preference is stored in `localStorage.cb-theme` (`'dark'` or absent).
First visit honors `prefers-color-scheme: dark` if set.
```

**Verify:** Doc looks right; build still passes.

---

## Files likely to change

| Action | Path |
|---|---|
| Modify | `src/app/globals.css` |
| Modify | `src/app/layout.tsx` |
| Modify | `src/app/about/page.tsx` |
| Modify | `src/components/workspace/Workspace.tsx` |
| Modify | `src/components/workspace/CenterUpload.tsx` |
| Modify | `src/components/workspace/Sidebar.tsx` |
| Modify | `src/components/workspace/SidebarLinks.tsx` |
| Modify | `src/components/workspace/FilesTrigger.tsx` |
| Modify | `src/components/chat/ChatPanel.tsx` |
| Modify | `src/components/chat/SuggestedPrompts.tsx` |
| Modify | `src/components/upload/Dropzone.tsx` |
| Modify | `src/components/upload/DocumentList.tsx` |
| Modify | `src/components/ui/primitives.tsx` |
| Modify | `src/components/ui/icons.tsx` (add IconSun/IconMoon) |
| Modify | `README.md` |
| Create | `src/components/ui/ThemeToggle.tsx` |
| Create | `src/components/workspace/AboutHeaderActions.tsx` (client island for /about header) |

No API, schema, dependency, or route changes.

---

## Tests / validation

- `npm run typecheck` exit 0
- `npm run lint` exit 0 (only pre-existing bm25.ts warning OK)
- `npm run build` exit 0; route table unchanged (still 8 routes)
- Browser check at `/`, `/app`, `/about` × light/dark × desktop/mobile
- Lighthouse / DevTools contrast check on light mode ≥ AA
- Reload after toggle persists

---

## Risks, tradeoffs, open questions

1. **Tailwind v4 `bg-[var(--surface-1)]` opacity layer**  
   Token values for surfaces are `rgba(...)`. Tailwind v4 supports arbitrary CSS values — fine. If issues, fall back to inline style.

2. **`bg-[var(--accent-dim)]` hover on prompt chips in light**  
   Light mode `--accent-dim` is `rgba(15,118,110,0.10)` — subtle, may look washed. If feedback says too light, bump to `0.18`.

3. **Bubble contrast in light**  
   Assistant bubbles (`bg-[var(--surface-2)]`) on `--bg` need ≥ 1.3:1 separation. `#ffffff` on `#fafaf9` is subtle. May need to drop `--surface-2` slightly in light (e.g. `#f4f4f5`).

4. **About hero gradient `accent-glow`**  
   On white background, `rgba(15,118,110,0.18)` glow is faint. May want `--accent-glow` at `0.25` for light.

5. **System sync mode**  
   Out of scope (YAGNI). Add later if requested.

6. **Color picker for users**  
   Out of scope. We ship 2 themes only.

---

## Definition of done

- [ ] `globals.css` defines light (default) + dark (`[data-theme="dark"]`) tokens including `--surface-1/2`, `--surface-hover`, `--border-soft`, `--backdrop`, `--shadow-card`, `--accent-glow`
- [ ] No-flash inline script applies saved/system theme before paint
- [ ] Header toggle on `/`, `/app`, `/about`; persists to `localStorage`
- [ ] All `bg-black/*` / `bg-white/*` / `border-white/*` / stray `rgba(...)` removed
- [ ] Light mode passes AA contrast for body/muted text
- [ ] Focus rings visible on light
- [ ] README documents the toggle
- [ ] `npm run typecheck && npm run lint && npm run build` all green

---

## Execution order

```
1 token overhaul
2 no-flash script
3 ThemeToggle + icons
4 wire toggle into headers
5 tokenize hardcoded surfaces
6 readability pass
7 about light contrast
8 system preference sync (already in 2; just verify)
9 visual audit
10 README note
```

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review. Shall I proceed?
