# 00 — Product Brief (the "what")

> Structured, English‑of‑record version of the founder brief. This is the source of truth for product
> intent. If code and this file disagree, this file wins (or the lead amends it explicitly).

## Concept

A habit‑tracker journal that uses gamification for motivation and progression, and can sync relevant
activities to Google Calendar. Designed to make daily/weekly actions **fast, quantifiable and
rewarding** — without forcing the user to constantly engage with abstract routines or long‑term goals.

## Design principles

1. **Action over reflection.** Logging must feel immediate and rewarding.
2. **Gamification is a feedback layer, not the goal.**
3. **Quests are the operational unit; habits are the organising layer.**

## Core concepts

### Habit
A durable routine — e.g. "Run", "Read", "Train". Habits express *what the user wants to do over time*
but cannot be meaningfully quantified on their own. They are an **organisational / semantic layer**
that structures quests. Each habit has a **colour**. Quests attached to a habit **inherit that colour**
so the user intuitively sees which quests belong to which routine.

### Quest
A **time‑boxed, countable task** that springs from a habit. Quests — not habits — are what the user
interacts with. Quests make a routine quantifiable and gamifiable. Cadence is one of:
`daily | weekly | monthly | yearly`.

- Weekly (and longer) quests **may** have attached weekdays.
- If weekdays are set → the system **auto‑generates daily quests** on those days.
- If no weekdays are set → the quest exists only as a single aggregate weekly/longer quest.

The colour link to habits makes it visually obvious which quests belong to which routine and
strengthens the gamification/feedback layer.

### Gamification layer
A deliberately simple feedback system: **XP** and **Streaks**.

## Central design decision (do not violate)

Habits are **not** the primary interaction unit and are deliberately made *less visible* in daily use,
especially on the home screen. A habit is a desired direction; it can't be quantified meaningfully. The
user interacts with habits **indirectly through quests**, which are quantifiable, time‑boxed and suited
to gamification. Habits = organising/semantic layer; quests = operational layer the user sees, taps and
completes. Colour coding gives an intuitive overview and supports responsive gamification feedback.

## User flows

### Onboarding & login
App opens to a login / create‑account screen. New users get a quick intro and help creating their
first habit and its quests.

### Home screen (the centre of the app)
Shows:
- Active quests (daily + weekly) colour‑coded by their habit.
- A small dashboard: today's status, streaks, optional XP/progression.
- A small chart: hours slept per day over the month.

**Direct quest interaction (the core feature).** From home the user can complete quests without
navigating and log progress directly.

Interaction rules:
- **One tap → +1 progress.**
- **Hold → complete the whole quest (n/n).**
- A completed quest gives: visual feedback, XP, streak update.
- Gamification cues (animation, sound, micro‑feedback) make the action responsive and satisfying.
  **This is the strong UX decision that carries the whole app.**

### Bottom navigation
`Home/Dashboard` · `Habits/Quests` · `+ (quick action)` · `Stats/Progress` · `Profile/Settings`.

### Quick action / "+" button
Add / log:
- **New habit** → choose name + colour. Colour marks all quests attached to the habit.
- **New quest** → optionally attach to an existing habit (inherits its colour). If weekly, choose which
  weekdays it generates daily quests for, and whether to add it to Google Calendar.
- **Sleep for the previous night** (number of hours).

### Stats / Progress
Purpose: overview of performance, habits, quests and progression over time.
- Header: period selector (day/week/month/year) + filter (one habit or all).
- Body: XP/progression graph; optional gamification feedback; streaks (daily/weekly, longest per habit,
  colour‑coded); habit + quest status list/grid with completion state; sleep data / heatmap.
- Interaction: tap a habit → quest details; hold on graph → more info for day/week/month.

### Profile / Settings
Purpose: control over data, notifications, sync and preferences.
- **Profile:** user info (name, optional avatar); edit habits (name, colour, goal); stats/history per
  habit.
- **Settings:** notifications/reminders (daily/weekly per quest); Google Calendar sync (on/off, choose
  which quests sync); data management (export/import, delete habit/quest with visual feedback); general
  prefs (theme/colour scheme, XP/level display simplified vs detailed).

## Non‑negotiables checklist (lead enforces)

- [ ] Home screen foregrounds **quests**, not habits.
- [ ] Tap = +1, hold = complete — everywhere quests appear.
- [ ] Every quest visibly carries its habit's colour.
- [ ] Completion triggers XP + streak + tactile feedback within ~100ms.
- [ ] Weekly quest with weekdays auto‑generates daily quests.
- [ ] Sleep is logged per night and charted on home + stats.
- [ ] Calendar sync is opt‑in and per‑quest.
