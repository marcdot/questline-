# 12 — Feedback System (semantic colour + patterns)

> How Questline talks to the user through colour and feedback. The tokens already
> live in `app/globals.css` (`--success`, `--danger`, `--warning`, `--info`,
> `--ink-muted`) and switch with light/dark. This doc is the **meaning** behind
> them — pick the colour by intent, never decoratively. Source ticket: Q-004.

## 1. Semantic palette

| Purpose | Token | Light | Dark | Used for |
|---|---|---|---|---|
| **Success / Confirmation** | `--success` | `#2e9e6b` | `#46b98a` | completed quest, saved settings, "check your email", calendar connected |
| **Error / Blocking** | `--danger` | `#9e2b25` | `#d7604f` | failed action, validation error, sign-in failure |
| **Warning / Attention** | `--warning` | `#b5811a` | `#d6a23c` | offline banner, rate limit, non-blocking issues |
| **Info / Instruction** | `--info` | `#3e78a8` | `#5c97c8` | tips, neutral guidance |
| **Neutral / Muted** | `--ink-muted` | `#726e66` | `#a7a296` | secondary text, hints, timestamps |

Use as Tailwind classes: `text-success`, `bg-danger/10`, `border-warning/30`, etc.

**Rule:** the colour is chosen by *what the message means*, not by where it
appears. An instruction shown after a successful sign-up ("check your email") is
**success**, not danger — that was the Q-004 trigger bug.

## 2. Feedback patterns

- **Inline banner (in use)** — a coloured pill above a form (`login`, `AddSheet`).
  Success → `--success`, error → `--danger`. Always pair colour with an icon
  (`✓` / `⚠`) and `role="status"` / `role="alert"` so it isn't colour-only.
- **Offline banner (in use)** — `--warning` tinted strip on the home screen.
- **Empty states (in use)** — home shows "No quests today / tap + to create one";
  guide the user to the next action, don't show a blank panel.
- **Loading states (in use)** — skeleton blocks (`animate-pulse`) on home and
  stats while data loads; no spinners-on-spinners.
- **Toast / snackbar (pattern, not yet built)** — for transient confirmations
  (e.g. "Quest completed ✓ [Undo]"). When needed: a single bottom-anchored,
  auto-dismiss (~4s), `role="status"` element reusing the semantic tokens. Not
  built yet — inline banners cover current needs (YAGNI until a flow needs it).

## 3. Accessibility

- **Never colour alone.** Every semantic message carries an icon or text label
  (✓ / ⚠) alongside the colour, for colour-blind users.
- **Contrast.** The ink/surface token pairs meet WCAG AA (4.5:1) in both themes;
  semantic text colours are used on their own tinted backgrounds (`/5`–`/10`),
  which keep contrast high. Don't put `--warning`/`--success` text on a
  saturated fill.
- **Focus.** Global `:focus-visible` ring (`outline: 2px solid var(--accent)`)
  is defined in `globals.css` — keep it; don't `outline:none` without a
  replacement.
