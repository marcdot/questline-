# 10 — Animation Plan (Awwwards-level motion) — PLAN ONLY

> Status: **planning, not yet implemented** (deferred per the user — token budget). This doc captures
> the motion direction so a build agent can execute it later in one focused pass. Nothing here is built.

## 0. North star
Motion should feel **silky, weighty, and earned** — the same restraint as the visual language. Every
animation reinforces the **Ember Fill** signature (`DESIGN.md`) and the **liquid-glass** chrome, never
competes with them. If a motion doesn't help the user feel progress or orient, it's cut.

## 1. Non-negotiable constraints (apply to ALL animations)
- **60fps or it ships off.** Animate only `transform` + `opacity` (+ `filter` sparingly). Never animate
  layout (width/height/top/left) or trigger reflow per frame.
- **Respect `prefers-reduced-motion`** — already wired in `globals.css`; every new animation must have a
  reduced/again-instant fallback (fade or none).
- **iOS reality:** no `navigator.vibrate`; animation is the feedback. Test on a real device (the
  headless preview has no rAF). Keep work off the main thread where possible.
- **One easing family:** reuse `motion.easing.*` from DESIGN (`ember_fill`, `spring`, `out`). No ad-hoc curves.

## 2. The catalog (priority order)

### A. Sun logo for "＋" (Add) — the brand moment
Replace the plain `＋` CTA tab with a small **sun mark** that *is* the add affordance.
- **Idle:** the sun's rays breathe slowly (subtle scale/opacity loop, ~6s, pausable).
- **Press:** rays retract → core brightens to ember (`--accent`) → on release, rays spring back out
  (overshoot on `ember_fill`/`spring`) as the Add sheet opens. The sun "rising" = creating.
- **Ties to:** Ember Fill (same ember core), liquid tab bar (the sun sits in the glass).
- Asset: SVG sun (8–12 rays), animate via CSS/SVG `transform` on `<g>` groups, or Hyperframes (§3).

### B. Chart animate-in (Stats)
XP bars / sleep heatmap / streak rings **draw in** when Stats mounts or the filter changes.
- **XP bars:** stagger from baseline, `scaleY` 0→1 transform-origin bottom, 30–40ms stagger, `out` easing.
- **Sleep heatmap:** cells fade+scale in on a diagonal sweep.
- **Streak rings:** stroke-dashoffset draw (the one allowed non-transform — cheap on a single path).
- Re-runs on filter change (not just first mount). Reduced-motion → appear instant.

### C. Number roll-ups (dashboard XP / streak)
When XP changes, the hero number **counts up** to the new value (short, ~400ms, `out`), paired with the
existing XP pill pop. Already have the data hook (`reconcileXp`) — animate the displayed value only.

### D. Route/page transitions
Soft shared-axis: outgoing fades/slides 8px, incoming settles in — matched to the bottom-tab direction.
Keep it <250ms so the app feels instant (the dev-mode 2s lag is compile-time, separate concern).

### E. Sheet / modal (liquid)
Add sheet rises with a glass-blur ramp (backdrop blur 0→16px) + content spring — emphasizes the
liquid-glass material. Dismiss reverses.

## 3. Hyperframes evaluation (the user's idea)
**What it is:** a tool for authoring high-fidelity, timeline-based UI animations (keyframe/“hyperframe”
sequences) exported for web. Good fit for **A (sun)** and complex **B (chart draw)** where hand-rolled
CSS gets fiddly.
**Recommendation (to confirm before building):**
- Use Hyperframes (or Rive/Lottie-style export) ONLY for the **self-contained brand pieces**: the sun
  mark and maybe the streak-flame. Export as a lightweight vector animation (not a video/gif).
- Keep **interaction-driven** motion (Ember Fill, press states, number roll-ups, route transitions) in
  code (Framer Motion / CSS) — they need live state + gesture timing a pre-baked timeline can't do.
- **Decision needed from lead/user before implementing:** (1) Hyperframes export format + bundle-size
  budget (target <30KB per asset, lazy-loaded); (2) does it honor `prefers-reduced-motion` / can we gate
  it; (3) licensing. Park these as the first questions of the build phase.

## 4. Suggested build phasing (when un-deferred)
1. **C (number roll-up)** + **B (chart animate-in)** — pure code, high delight/effort ratio, no new deps.
2. **A (sun logo)** — brand signature; decide Hyperframes vs hand-rolled SVG first (§3).
3. **D + E (transitions, liquid sheet)** — polish pass.
Each ships behind the 60fps + reduced-motion gates (§1) with a real-device check. Update `design.html`
with any new signature motion so it stays the canonical reference.
