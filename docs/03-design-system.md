# 03 — Design System

> Platform‑agnostic design language. Each client translates these tokens to its native primitives
> (CSS vars / Compose Theme / SwiftUI Environment). The *feel* described here is acceptance‑gated at P3
> and P7 — function alone does not pass.
>
> **Canonical token values now live in `../DESIGN.md`** (machine‑readable) with rationale in
> `../DESIGN-SYSTEM.md` and a live preview in `../design.html`. This file is the conceptual companion;
> where exact hex/scale/timing is needed, `DESIGN.md` wins.

## 1. Brand & tone — the aesthetic POV (commit to this, don't dilute it)

**Direction: "warm analog journal meets a living game."** Questline reads like a thoughtfully made
paper habit‑journal — warm off‑white stock, confident editorial typography, generous quiet margins —
that then *comes alive* with precise, physical motion the instant you act. Restraint everywhere;
reward on action. The user's habit colours are the only loud thing on the page.

- **References / mood:** the calm of Things 3 + Oura, the tactility of a Moleskine, the responsive
  game‑feel of a well‑tuned mobile game's completion moment. Editorial, not dashboard‑y.
- **The one memorable differentiator (protect it):** the **completion moment** — tap‑to‑+1 and
  hold‑to‑complete with habit‑coloured fill, burst, haptic and count‑up. If a user remembers one
  thing, it is how satisfying finishing a quest feels. Everything else stays quiet to let it land.
- **Intentionality, not intensity.** This is refined‑minimal by choice; execute it with precision.

### Banned (generic AI‑interface tells — an instant fail at review)
- Default system/Inter everywhere with no typographic intent; flat 14px‑everything hierarchy.
- Clichéd indigo→purple or blue→cyan gradients; neon "gamified" rainbow chrome.
- Evenly‑spaced identical card grids with generic soft drop shadows; Bootstrap/AI‑starter spacing.
- Emoji as iconography; childish badges/medals. Gamification here is felt through motion, not stickers.
Make every type, colour, spacing and motion choice deliberate and defensible against this list.

## 2. Colour

The product palette is **neutral**; the *colour energy comes from the user's habits*. Quests wear their
habit's colour — that is the visual system. So the base UI must stay quiet enough for habit colours to
sing.

### Base tokens (semantic — define per theme)
| token | light | dark | use |
|---|---|---|---|
| `bg` | `#FAF8F5` | `#0E0F12` | app background (warm paper / near‑black) |
| `surface` | `#FFFFFF` | `#17191E` | cards, sheets |
| `surface-2` | `#F1EDE7` | `#1F2228` | insets, chart fills |
| `text` | `#1A1A1A` | `#F2F2F2` | primary text |
| `text-muted` | `#6B6B6B` | `#9AA0A6` | secondary |
| `border` | `#E7E2DA` | `#2A2D34` | hairlines |
| `success` | `#2FA37C` | `#3FBB90` | completion |
| `xp` | `#E6B84A` | `#F2C75C` | XP accents |

### Habit colour palette (offer these when creating a habit; all pass AA on `surface`)
`#E8743B` ember · `#E0B040` gold · `#5AA469` fern · `#3E9CA8` teal · `#4F86C6` sky · `#7A6CD8` iris ·
`#C85A8E` rose · `#8A8F98` slate. Store the chosen hex on `habit.color`.

### Colour usage rules
- A quest card shows its habit colour as: a 3–4px leading bar / ring, the progress fill, and the
  completion burst. **Text stays neutral** for legibility.
- Progress fill uses the habit colour at the instance's completion ratio.
- Never colour two adjacent unrelated UI elements the same habit colour by accident — group by habit.

## 3. Type scale

| role | size / weight | use |
|---|---|---|
| display | 32–40 / 700 | screen hero numbers (XP, streak count) |
| title | 22 / 600 | screen titles |
| section | 17 / 600 | group headers |
| body | 15 / 400 | quest titles, content |
| caption | 13 / 500 | meta, units, dates |

Use the platform's best system font by default (web: Geist/Inter; Android: default/Roboto Flex; iOS:
SF). One typeface, weight for hierarchy.

## 4. Spacing, radius, elevation

- Spacing scale (px): `4 · 8 · 12 · 16 · 24 · 32 · 48`. Default screen padding 16, card gap 12.
- Radius: cards 16, chips/buttons 12, full‑round for the streak/XP pills and the "+".
- Elevation: flat by default; sheets and the "+" FAB get one soft shadow. Dark theme leans on
  `surface-2` contrast instead of shadow.

## 5. Motion (the soul of the app)

Timing tokens: `fast 120ms`, `base 200ms`, `slow 320ms`; easing `standard cubic‑bezier(.2,.0,.0,1)`,
`spring (stiffness ~420, damping ~30)` for completion pops.

| Interaction | Motion spec |
|---|---|
| **Tap (+1)** | Card nudges/scales to ~0.97 then springs back (≤120ms). Progress fill animates to new ratio. A tiny `+1` number floats up and fades. Haptic: light. |
| **Hold (complete)** | A radial/linear fill races toward full over the hold (≈450–600ms) so the user sees it filling; release at full → completion burst. If released early, fill recedes. Haptic: ramp then success thump. |
| **Completion burst** | Card flashes its habit colour, a brief confetti/particle or ring expands, the checkmark draws in, XP pill counts up, streak pill ticks +1. ≤500ms total, never blocks the next tap. Optional sound (respect mute). |
| **Screen transitions** | Subtle shared‑element / fade‑through at `base`. No long slides. |
| **Numbers (XP, streak)** | Count‑up tween, never hard‑swap. |

**Feel acceptance:** action‑to‑feedback latency must be perceptually instant (<100ms to first visual
response). Optimistic update happens *before* the network. If it doesn't feel good, it fails P3.

## 6. Components (conceptual — each client builds natively)

- **QuestCard**: leading habit‑colour bar, title, `progress/target` ("2/3"), tap target = +1, long‑press
  = complete. Completed state: filled, checkmark, dimmed‑but‑legible.
- **DashboardStat**: today ratio, current streak, XP — compact pills.
- **SleepChart**: line/area of hours per night across the month (home: compact; stats: full + heatmap).
- **AddSheet**: segmented New Habit / New Quest / Log Sleep.
- **BottomNav**: Home · Habits · ➕ · Stats · Profile. The ➕ is the visual anchor (raised/centre).
- **HabitColorPicker**: the 8 palette swatches + custom.

## 7. Accessibility (gated at P7)

- Contrast ≥ AA for text on its background in both themes.
- Every tap/hold has a non‑gesture alternative (a visible "complete" affordance) for motor/AT users.
- Haptics and sound are enhancements, never the only feedback — colour + shape + text always carry it.
- Respect "reduce motion": swap bursts for a simple fade, keep count‑ups instant.
- Min touch target 44×44 (iOS) / 48dp (Android).

## 8. Empty / error / loading states (gated at P7)

- Empty home: friendly prompt to create the first quest (links to ➕), not a blank screen.
- Offline: a quiet banner; taps still work (optimistic) and queue.
- Error on sync: non‑blocking toast + retry; never lose a logged action.
- Loading: skeletons that match card shapes, not spinners over content.
