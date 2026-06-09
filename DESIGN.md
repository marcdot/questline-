---
name: questline-design-tokens
title: Questline — Design Tokens
version: 1.0.0
updated: 2026-06-07
status: source-of-truth
companion_specs:
  - DESIGN-SYSTEM.md        # rationale, components, do's/don'ts
  - design.html             # interactive live preview
  - docs/03-design-system.md # platform-agnostic conceptual companion
note: >
  This is the machine-readable token source of truth. The `tokens` block below is the
  canonical value set; design.html and every client theme derive from it. (The named
  "google DESIGN.md lint" tool is a spec-driven-dev methodology, not a token linter, so
  this file is structured as a clean YAML token doc rather than run through that CLI.)
---

# Questline — Design Tokens

> **North-star: "Spring/Summer" restraint, warm undertone.** Scandinavian premium = restraint,
> precision, and space. The chrome is **near-monochrome warm-grey + ink**; colour comes from *content*
> (the user's habit colours on cards/charts) and **one** ember accent for "aliveness" — never from
> decorative chrome. (Ref: `brain/Brain/_Claude/handoffs/_design-reference-spring-summer.md`.)
>
> **Philosophy in five lines** (full rationale in `DESIGN-SYSTEM.md`):
> 1. **Near-monochrome warm-grey ground; one ember accent.** Habit colours are the only other colour,
>    and they belong to data, not chrome. Premium = restraint, not decoration.
> 2. **Dark is for earned drama** (completion burst, stats hero) — never the default.
> 3. **Hairlines & whitespace before effects** — a faint ~3% grain at most; structure comes from rules
>    and generous space, not shadows or gradients.
> 4. **Big confident type + editorial rhythm** — § section numbers, hairlines, generous whitespace.
> 5. **Silky, controlled motion** — 180ms micro-interactions, 350ms page transitions; one earned spring
>    on completion. Restraint everywhere except the completion moment.

## Token set

```yaml
tokens:
  color:
    # --- LIGHT (default: near-monochrome WARM-GREY, not cream) ---
    light:
      bg:            "#F4F2ED"   # warm bone-grey ground (refined, desaturated — not cozy cream)
      surface:       "#FCFBF9"   # cards, sheets
      surface_2:     "#EAE7E0"   # insets, chart fills, pressed
      border:        "#E1DDD5"   # hairline rules (the primary structural device)
      text:          "#1A1814"   # primary ink (warm near-black)
      text_muted:    "#726E66"   # secondary (warm grey)
      text_disabled: "#A8A399"   # disabled
      accent:        "#D9542B"   # EMBER — the ONE accent = "aliveness" (use sparingly)
      accent_press:  "#BC4621"   # ember pressed
      xp:            "#B8902E"   # muted gold — XP numerals ONLY, never decoration
      success:       "#2E9E6B"   # completion / positive
      danger:        "#9E2B25"   # destructive (oxblood — kept distinct from ember)
      warning:       "#B5811A"
      info:          "#3E78A8"
      ring:          "#D9542B"   # focus ring (ember)
    # --- DARK (earned drama / dark mode: refined warm charcoal) ---
    dark:
      bg:            "#15140F"   # warm near-black (not pure)
      surface:       "#1D1B15"
      surface_2:     "#262319"
      border:        "#322E25"
      text:          "#F2EFE7"
      text_muted:    "#A7A296"
      text_disabled: "#6E685B"
      accent:        "#E2613A"   # ember, brightened for dark
      accent_press:  "#C8512C"
      xp:            "#D9AE52"   # muted gold for dark
      success:       "#46B98A"
      danger:        "#D7604F"
      warning:       "#D6A23C"
      info:          "#5C97C8"
      ring:          "#E2613A"
    # --- HABIT PALETTE (user-owned; quests inherit; AA on surface) ---
    habit:
      ember: "#E8743B"
      amber: "#E0B040"
      fern:  "#5AA469"
      teal:  "#3E9CA8"
      sky:   "#4F86C6"
      iris:  "#7A6CD8"
      rose:  "#C85A8E"
      slate: "#8A8F98"

  typography:
    families:
      display:  "'Bricolage Grotesque', system-ui, sans-serif" # big confident grotesque (Spring/Summer, warm character)
      ui:       "'Hanken Grotesk', system-ui, sans-serif"       # body + UI (warm humanist, NOT Inter)
      data:     "'JetBrains Mono', ui-monospace, monospace"     # counters, XP, data labels
    scale:      # role -> {family, size_px, weight, line, tracking}
      display_xl: { family: display, size: 40, weight: 600, line: 1.05, tracking: "-0.02em" }
      display:    { family: display, size: 32, weight: 600, line: 1.10, tracking: "-0.01em" }
      title:      { family: ui,      size: 22, weight: 600, line: 1.25, tracking: "0" }
      section:    { family: ui,      size: 17, weight: 600, line: 1.30, tracking: "0" }
      body:       { family: ui,      size: 15, weight: 400, line: 1.55, tracking: "0" }
      caption:    { family: ui,      size: 13, weight: 500, line: 1.40, tracking: "0.01em" }
      data:       { family: data,    size: 14, weight: 500, line: 1.0,  tracking: "0" }
      data_lg:    { family: data,    size: 22, weight: 600, line: 1.0,  tracking: "-0.01em" }
      label:      { family: ui,      size: 11, weight: 600, line: 1.0,  tracking: "0.08em", transform: uppercase }

  space:        # 4px base scale
    base: 4
    scale: [4, 8, 12, 16, 24, 32, 48, 64]
    screen_padding: 16
    card_gap: 12

  radius:
    sm:   8
    md:   12
    lg:   16
    xl:   24      # bottom sheets
    full: 999     # pills, FAB, streak flame

  shadow:         # warm-tinted (brown), never pure black
    sm: "0 1px 2px rgba(58,44,30,0.06)"
    md: "0 4px 16px rgba(58,44,30,0.10)"
    lg: "0 12px 32px rgba(58,44,30,0.14)"
    ember_glow: "0 0 0 4px rgba(217,84,43,0.14)"  # the "alive" focus/active glow

  motion:
    duration:
      instant: 120   # tap feedback, nudge
      micro:   180   # hover, progress fills
      base:    240   # component state changes
      page:    350   # screen transitions
    easing:
      standard: "cubic-bezier(0.2, 0, 0, 1)"      # default
      out:      "cubic-bezier(0.16, 1, 0.3, 1)"   # reveals (expo-out)
      spring:   "cubic-bezier(0.34, 1.56, 0.64, 1)" # completion overshoot
      ember_fill: "cubic-bezier(0.22, 0.61, 0.36, 1)" # SIGNATURE hold-to-complete ignite ramp

  texture:
    grain_opacity: 0.03          # SVG feTurbulence noise over bg (faint — restraint)
    hairline: "1px solid border" # the primary structural device (Spring/Summer restraint)

  a11y:
    min_touch_px: 48             # Android dp / generic
    min_touch_ios: 44
    contrast_body: "AA (>=4.5:1)"     # text & text_muted on bg verified
    contrast_large_ui: "AA (>=3:1)"   # accent used for fills/large UI, NOT small body text
    focus_ring: "2px ring + ember_glow; never remove outline without replacement"
    reduced_motion: "swap spring/burst for a 120ms fade; count-ups become instant"
```

## Usage rules (enforced)
- **Never hardcode hex in components.** Reference token names (`color.light.accent`, etc.).
- **Accent = aliveness only.** Ember marks what is *live right now* (active nav, in-progress fill,
  streak flame, primary CTA). Do not sprinkle it. This restraint is the brand (see signature).
- **Habit colours are data, not brand.** They live on quest cards/charts; pulled from `color.habit`.
- **XP gold appears only in XP moments.** Not as decoration.
- **Dark is earned.** Default is paper; dark mode + the dark burst backdrop are deliberate, not ambient.

## The signature (Phase 3 — the one bold thing)
**"Ember Fill"** — hold-to-complete ignites an ember→habit-colour radial fill from the touch point that
races across the card on `motion.easing.ember_fill`, crests into a spring burst, and leaves a streak
flame. The bespoke `ember_fill` curve (slow ignite → fast crest → settle) is Questline's recognizable
motion. See `DESIGN-SYSTEM.md §Signature` and `design.html §6`.
