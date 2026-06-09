# Questline — Design System

> The reasoned companion to `DESIGN.md` (tokens) and `design.html` (live preview). Tokens are the
> source of truth; this file explains *why*, defines every component against tokens (no hardcoded hex),
> and sets do's/don'ts. Conceptual platform-agnostic notes also live in `docs/03-design-system.md`.

---

## 1. Research foundation (Phase 1 — what the market validated)

### Reference apps in this domain
| App | What it nails | What we take / avoid |
|---|---|---|
| **Streaks** (Apple Design Award) | Radical minimalism — a grid of circles you tap to fill; friction is the enemy. | Take: one-gesture completion as the whole interaction. Avoid: so sparse there's no identity. |
| **Habitica** | The ~0.5s dopamine hit on check-off; XP/streak feedback that *feels*. | Take: completion must be felt, not just logged. Avoid: dated 8-bit pixel art, loud RPG chrome. |
| **Finch** | Gentle, cozy, no streak-break punishment; warmth and care. | Take: warmth, gracious tone, no shaming empty states. Avoid: childishness. |
| **Things 3 / Oura** | Calm editorial layout, single restrained accent, premium quiet. | Take: editorial calm + one accent + premium restraint. |

**Market split:** *minimalist* (Streaks) vs *comprehensive* (Habitica/Habitify). **Questline threads
both:** a minimal tap/hold core on Home, with a rich Stats surface for the data crowd.

### Reference design languages (closest to our domain)
- **Notion** — warm neutral ground, editorial type → our **paper base**.
- **Linear** — precise, fast micro-interactions, restrained accent, dark for drama → our **motion feel**.
- **Things / Oura** — calm wellness, single accent, generous space → our **restraint**.

### 2025–2026 trends we deliberately rode (and the evidence)
- **Warm off-whites + nature accents (terracotta/sage/sand)** dominate wellness palettes → our warm
  `#FAF7F2` paper + ember/fern habit colours.
- **Oversized, characterful letterforms** counter "AI precision" → **Fraunces** display.
- **Motion as a primary branding language**, micro → cinematic → our **Ember Fill** signature.
- Trends we *rejected* as wrong for a calm journal: bold full-bleed gradients, duotone neon,
  glassmorphism. They fight the paper concept.

> Sources informing this: market reviews of 2026 habit trackers; Awwwards/Muzli/Envato 2026 trend
> reporting on wellness palette, type, and motion. Synthesis, not copy — the system is ours.

---

## 2. Design philosophy

1. **1–3 accent colours max on a warm ground.** The UI is warm ink on paper. The *only* loud colour
   energy comes from the user's habit colours on quest cards. One brand accent (**ember**) signals
   "aliveness" and nothing else.
2. **Dark for earned drama.** Default is paper. Dark mode and the dark completion-burst backdrop are
   deliberate moments, not ambient theming.
3. **Texture before effects.** A ~4% paper grain and hairline rules carry depth — not heavy drop
   shadows or gradients. Shadows are warm-tinted and subtle.
4. **Editorial rhythm.** Section numbers (§), hairline rules, and generous whitespace make the app read
   like a finely-set journal. This is the visual brand language, applied everywhere (including this
   doc and `design.html`).
5. **Every pixel moves.** 180ms micro-interactions, 350ms page transitions, a spring on completion.
   Motion is responsive and physical, never decorative filler.

---

## 3. Tokens

See `DESIGN.md`. Components below reference token names only. **Never hardcode a hex in a component.**
Colour contract recap: `accent` (ember) = aliveness only; `xp` (gold) = XP moments only; habit colours
= user data on cards/charts; `danger` (oxblood) kept visually distinct from ember.

---

## 4. Components

> Each component lists: anatomy, states, token refs, and do/don't. All have a visible, non-gesture
> affordance (a11y) and a `prefers-reduced-motion` path.

### 4.1 Buttons
**Variants:** `primary` (ember fill, white text), `secondary` (surface + border, ink text),
`ghost` (text only, ink), `danger` (oxblood, destructive only).
- **Radius** `radius.md`; **height** 44–48 (touch); **padding** `space[16]` horizontal.
- **States:** rest → hover (lift `shadow.sm`, +4% bg) `motion.micro` → active (scale .97,
  `accent_press`) `motion.instant` → focus (`ring` + `ember_glow`) → disabled (`text_disabled`, no
  shadow, no pointer).
- **Do:** one primary action per view. **Don't:** two ember buttons competing; ember on a ghost.

### 4.2 Inputs (text / select / textarea)
- **Anatomy:** `label` (uppercase caption) + field (`surface`, `border`, `radius.md`) + helper/error.
- **States:** rest → focus (`border`→`accent`, `ember_glow`, `motion.micro`) → error (`border`→
  `danger`, helper text in `danger`, subtle shake `motion.base`) → disabled.
- **Select** uses the same shell + chevron; **textarea** min 3 lines, resizes vertically.
- **Do:** always pair a label; show errors inline with guidance. **Don't:** rely on placeholder as
  label; turn the whole field red (only border + message).

### 4.3 Cards
- **default:** `surface`, `border` hairline, `radius.lg`, no shadow.
- **elevated:** + `shadow.md` (sheets, modals).
- **interactive:** hover lifts to `shadow.sm` + 1px translateY, `motion.micro`; focus ring.
- **QuestCard (hero component):** leading 3px **habit-colour** bar + ring; title (`body`); counter
  `n/n` in `data`; progress fill = habit colour at completion ratio; **tap = +1**, **hold = Ember
  Fill complete** (§Signature). Completed: filled, checkmark drawn in, dimmed-but-legible. Text stays
  **ink** for legibility — colour comes from the bar/fill, not the words.

### 4.4 Navigation
- **Bottom nav** (primary): Home · Habits · ➕ · Stats · Profile. Active item tinted **ember**
  (aliveness); the ➕ is a raised ember FAB — the visual anchor. Inactive = `text_muted`.
- **Tabs** (Stats period filter): underline indicator slides on `motion.base`/`ease.out`; active
  label ink, inactive muted.
- **Top bar:** title in `title`; minimal; hairline bottom rule.
- **Do:** ember only on the active/raised element. **Don't:** colour every icon.

### 4.5 Modal / Dialog & Bottom Sheet
- **Overlay:** ink @ 40% + 2px backdrop blur. **Container:** `surface`, `radius.xl` (sheet) /
  `radius.lg` (dialog), `shadow.lg`.
- **Motion:** sheet slides up `motion.page`/`ease.out`; dialog fades + scales from .96.
- **Dismiss:** tap-scrim, drag-down (sheet), Esc; a visible close affordance always present.
- The **Add sheet** (➕) is segmented: New Habit / New Quest / Log Sleep.

### 4.6 Lists / Tables
- Rows on `surface`, separated by hairline `border` (not boxes-in-boxes). Row height ≥ 48.
- Stats grids: habit-coloured chips/dots; numbers in `data`. Keep tabular numbers aligned (mono).
- **Don't:** zebra-stripe (fights the paper calm); use hairlines + whitespace instead.

### 4.7 Loading states
- **Skeleton** (preferred): shapes that match the real card; shimmer sweep `surface_2`→`surface`,
  1.2s loop, paused under `reduced-motion`.
- **Spinner:** only for ≤1 action-scoped waits (button busy). Ember stroke.
- **Don't:** spinner over content that could be a skeleton.

### 4.8 Empty states (gracious — never "No data")
- Friendly one-liner + a clear next action. Examples:
  - Home empty → *"Nothing live yet. Plant your first quest →"* (links ➕).
  - Stats empty → *"Your story starts after your first completion."*
  - Offline → quiet banner: *"Offline — your taps are saved and will sync."*
- **Don't:** dead-ends, error-codes-as-copy, blame ("You haven't…").

### 4.9 Toast / Notification
- Bottom, above nav; `surface` + left accent bar by kind: `success` / `danger` / `warning` / `info`.
- Auto-dismiss 4s, swipe to dismiss, max 1 at a time; non-blocking. Sync errors offer **Retry**.
- **Don't:** stack toasts; never lose a logged action behind a toast.

---

## 5. Accessibility (WCAG AA baked into tokens)
- **Contrast:** `text`/`text_muted` on `bg` meet AA (≥4.5:1); `accent` is used for **fills/large UI**
  (AA ≥3:1), never small body text. Verified in both themes.
- **Focus:** every interactive element shows a 2px `ring` + `ember_glow`. Never remove an outline
  without a replacement.
- **Touch:** ≥48px (Android) / 44px (iOS).
- **Gestures have alternatives:** tap/hold-to-complete also exposes a visible complete affordance for
  motor/AT users; nothing is gesture-only.
- **`prefers-reduced-motion`:** Ember Fill/burst → a 120ms fade; count-ups become instant; shimmer
  stops. Functionality is identical, drama removed.
- **Feedback is multi-channel:** colour + shape + text always carry meaning; haptics/sound are
  enhancements only.

---

## 6. Signature — "Ember Fill" (the one bold, ownable thing)
Holding a quest card ignites an **ember→habit-colour radial fill** from the touch point. It races
across the card on the bespoke `motion.easing.ember_fill` curve (slow ignite → fast crest), overshoots
into a spring **burst**, the checkmark draws in, the XP pill counts up, and a small **streak flame**
settles in the corner. Released early, the fill recedes. This single motion — its custom curve and the
ember-to-habit-colour gradient — is Questline's recognizable moment. Everything else is research-
validated restraint; *this* is ours.

Supporting brand traits (consistent identity, not the "one thing"): the **§ editorial numbering +
hairline rules**, **accent-only-on-aliveness** colour deployment, and the **paper grain** texture.

---

## 7. Master do's & don'ts
**Do:** warm paper ground · one ember accent for aliveness · habit colours as the only loud layer ·
hairlines + whitespace for structure · skeletons over spinners · gracious empty copy · motion on every
state · AA contrast from the tokens.
**Don't:** hardcode hex · use ember as decoration · default to dark · neon/duotone/glassmorphism · zebra
tables · "No data" copy · gesture-only actions · pure-black shadows · generic Inter-everything.
