# Brighter Primary Buttons (Light Mode)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> **Mode:** Planning only in this document. Do not implement until the user says go.

**Goal:** Primary buttons on light mode look dull and the dark text on them is muddy. Switch to a brighter accent background with white text in light mode; keep the existing readable pairing in dark mode.

**Architecture:** Split the `Button` primitive's primary variant into two theme-aware tokens: `--primary-bg` (button fill) and `--primary-text` (button label). Set each to the right pair per theme. Brighten the light-mode `--accent` so the button pops, and derive `--primary-bg` from it.

**Tech Stack:** Next.js 16 · Tailwind v4 · existing token system in `src/app/globals.css` · no new deps

---

## Current context / assumptions

### What the user is seeing
- Light-mode primary button: `#0f766e` (teal-700) background, `#042f1a` (near-black) text.
- Contrast: ~5.4:1 — technically AA-passing but reads "muddy" because both are dark muted greens and they sit close in hue.
- The dark-mode pairing `#34d399` accent + dark text reads much brighter because the accent is a vivid emerald; the mismatch is the real issue.

### What's already tokenized
`--accent`, `--accent-dim`, `--bg-elevated`, `--text`, `--text-muted`, `--border`, etc. live in `globals.css` and have a `:root[data-theme="dark"]` override.

### What's hardcoded (the bug)
`src/components/ui/primitives.tsx:16`:
```
primary: 'bg-[var(--accent)] text-[#042f1a] hover:brightness-110 shadow-[0_0_24px_var(--accent-dim)]',
```
The `text-[#042f1a]` is hardcoded for both themes — works on dark `#34d399` (emerald) but looks flat on light `#0f766e` (teal-700).

### Constraints
- Don't break dark mode (which currently looks great).
- All other components that use `bg-[var(--accent)]` for their **background** (composer focus ring, send button, status dot) should stay on the bright `--accent` — those are fine.
- The fix is scoped to the **Button primitive's primary text** and the **primary button background brightness** in light mode.

---

## Proposed approach

1. **Add two new tokens** to `globals.css`:
   - `--primary-bg` — the primary button's fill (derived from `--accent`, but with a brighter light-mode value so it pops).
   - `--primary-text` — the primary button's text color (`#042f1a` in dark, `#ffffff` in light).

2. **Brighten the light-mode `--accent`** slightly so even non-Button uses (composer ring, status dot) feel a bit punchier without losing AA contrast against white. Use **teal-600 `#0d9488`** (was teal-700 `#0f766e`) — still passes AA-large on white and looks distinctly brighter.

3. **Refactor the `Button` primary variant** to use `bg-[var(--primary-bg)] text-[var(--primary-text)]` instead of the hardcoded `#042f1a`.

### Concrete token values

| Token | Light | Dark |
|---|---|---|
| `--accent` | `#0d9488` (was `#0f766e`) | `#34d399` |
| `--primary-bg` | `#0d9488` | `#34d399` |
| `--primary-text` | `#ffffff` | `#042f1a` |
| `--accent-dim` | `rgba(13,148,136,0.18)` | `rgba(52,211,153,0.15)` |
| `--accent-glow` | `rgba(13,148,136,0.28)` | `rgba(52,211,153,0.18)` |

Why these:
- `#0d9488` (teal-600) on white: ~4.9:1 — AA large text, AA UI components. Brightness comparable to dark-mode emerald.
- `#ffffff` on `#0d9488`: ~4.9:1 — AA large text. Looks like a vivid teal pill with white text — clearly a primary CTA.
- The previous `#0f766e` on `#042f1a` was 5.4:1 but muddy; the new combo is **visually brighter** even though raw contrast is similar.

---

## Step-by-step plan

### Task 1: Update tokens in `globals.css`

**Objective:** Brighten light-mode accent + add `--primary-bg` / `--primary-text` per theme.

**File:** `src/app/globals.css`

**Step 1:** In the `:root` (light) block, change:
- `--accent: #0f766e;` → `--accent: #0d9488;`
- `--accent-dim: rgba(15, 118, 110, 0.10);` → `--accent-dim: rgba(13, 148, 136, 0.18);`
- `--accent-glow: rgba(15, 118, 110, 0.20);` → `--accent-glow: rgba(13, 148, 136, 0.28);`

**Step 2:** Add to the `:root` (light) block:
```css
--primary-bg: #0d9488;
--primary-text: #ffffff;
```

**Step 3:** In the `:root[data-theme="dark"]` block, add:
```css
--primary-bg: #34d399;
--primary-text: #042f1a;
```

(Leave the existing `--accent`, `--accent-dim`, `--accent-glow` dark values alone.)

**Verify:** `npm run typecheck && npm run lint` exit 0.

---

### Task 2: Refactor `Button` primary variant to use the new tokens

**Objective:** Replace the hardcoded `text-[#042f1a]` with `text-[var(--primary-text)]` and pin the background to `bg-[var(--primary-bg)]`.

**File:** `src/components/ui/primitives.tsx`

**Step 1:** Change the `primary` variant string from:
```
'bg-[var(--accent)] text-[#042f1a] hover:brightness-110 shadow-[0_0_24px_var(--accent-dim)]'
```
to:
```
'bg-[var(--primary-bg)] text-[var(--primary-text)] hover:brightness-110 shadow-[0_0_24px_var(--accent-dim)]'
```

**Verify:** `npm run typecheck && npm run lint && npm run build` exit 0.

---

### Task 3: Visual audit (light + dark)

**Objective:** Confirm the button pops in light mode and stays readable in dark mode.

**Manual checks at `/`:**
1. Light mode primary buttons (upload hero "Upload documents", "Start chatting" on `/about`, ghost→primary on `/about`) — bright teal with white text.
2. Dark mode primary buttons — emerald fill, dark text (unchanged from before).
3. Composer focus ring on input still uses `var(--accent)` — fine in both themes.
4. Status dot (green pulse for processing) — fine.
5. Hover brightens via `hover:brightness-110` — fine.

**Done when:**
- Light mode: button reads as a vivid teal CTA, not muddy
- Dark mode: button still reads as emerald with dark text
- All gates green

---

## Files likely to change

| Action | Path |
|---|---|
| Modify | `src/app/globals.css` |
| Modify | `src/components/ui/primitives.tsx` |

No other files. The new tokens are opt-in via `--primary-bg` / `--primary-text`; existing `--accent` consumers (composer ring, status dot, etc.) keep working.

---

## Tests / validation

- `npm run typecheck` exit 0
- `npm run lint` exit 0 (only pre-existing bm25.ts warning)
- `npm run build` exit 0
- Browser check: `/`, `/app`, `/about` × light/dark — primary buttons legible and on-brand

---

## Risks, tradeoffs, open questions

1. **Slightly brighter `--accent` affects non-button surfaces too** (composer focus ring, status dot). They're fine — brighter teal is actually an improvement on white. If anything reads too neon, we can split `--accent` into `--accent` (rings, dots) and `--primary-bg` (buttons only) and keep them equal in dark, slightly different in light. Not needed in this pass.
2. **Hardcoded `#042f1a` text in dark** is removed from the Button, but dark still wants it — `--primary-text: #042f1a` keeps parity.
3. **Contrast on `#0d9488` white text is 4.9:1** — passes AA-large and AA-UI. If you want AAA-large (3:1 is min for non-text), the new combo is well over.
4. **Hover behavior** — `brightness-110` slightly brightens the teal; in dark the emerald brightens too. Consistent.

---

## Definition of done

- [ ] `--primary-bg` and `--primary-text` defined per theme
- [ ] Light `--accent` bumped from `#0f766e` to `#0d9488`
- [ ] Button primary variant uses both new tokens; no hardcoded hex
- [ ] Light mode: button is a bright teal CTA with white text
- [ ] Dark mode: button unchanged (emerald + dark text)
- [ ] `lint` / `typecheck` / `build` green
- [ ] No regressions elsewhere (rings, dots, citations, badges all unchanged)

---

## Execution order

```
1 update tokens (globals.css)
2 update Button primary variant (primitives.tsx)
3 visual audit + final validation
```

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review. Shall I proceed?
