# 08 — Security, QA & Testing

> Cross‑cutting quality contract for every client. Pairs with the Iron Law (`docs/06 §B6`): claims
> here are proven with fresh command output, never assertions. Skills referenced are install pointers
> (`npx skills add …`) — the build agent may install and follow them.

## 1. Testing strategy — the pyramid (every client)

| Layer | What it covers | Web | Android | iOS |
|---|---|---|---|---|
| **Unit** (most) | `domain/` math: period keys, XP, streaks — must reproduce `docs/05 §8` exactly | Jest/Vitest | JUnit + kotlin.test | XCTest |
| **Integration** | repo ↔ Supabase: reads, `apply_quest_event` idempotency, RLS denies cross‑user | supabase test project + Vitest | instrumented + test project | XCTest + test project |
| **E2E** (few, critical) | sign‑up → onboard → tap/hold complete → XP/streak update → offline replay | Playwright | Compose UI test / Espresso | XCUITest |
| **Exploratory QA** | the *feel* gates (`docs/03 §5`), edge/empty/error states | manual, per `docs/06` VR | same | same |

**Non‑negotiable unit tests (gate at P1, kept green after):**
- Period keys: ISO‑week table incl. `2026-01-01 → 2026-W01`, `2026-06-07 → 2026-W23`.
- Idempotency: replaying the same `quest_event.id` twice → progress changes once.
- XP/streak worked example (`docs/05 §8`): Wed completion with prior Mon streak → `14` XP, streak `2`.
- Quest generation: weekly `[mon,wed,fri]` → exactly 3 daily children; instances appear only on those days.

Skills: `anthropics/skills@webapp-testing` (web), `wshobson/agents@e2e-testing-patterns`,
`@javascript-testing-patterns`, `@python-testing-patterns`; `obra/superpowers@test-driven-development`.

## 2. QA pass (gate at P3 and P7)

Run a structured QA pass, not vibes. For each critical flow: list steps, expected result, actual
result, pass/fail, screenshot/log evidence. Cover: first‑run, complete a quest, complete offline then
reconnect, weekly→daily generation, sleep log upsert, calendar sync on/off, theme switch, sign‑out/in.
Skills: `mattpocock/skills@qa`, `softaworks/agent-toolkit@qa-test-planner`,
`affaan-m/everything-claude-code@browser-qa`.

### Test-account rule (MANDATORY — learned 2026-06-10, Supabase bounce warning)
Creating users via the **public signup endpoint** while email confirmations are ON sends real
confirmation emails — to fake addresses, that means **hard bounces** that damage the project's
sender reputation (Supabase warned/can suspend email privileges for this). Rules:
1. Test users are created ONLY via the **admin API** (`POST /auth/v1/admin/users` with
   `email_confirm: true`, service-role key) — this sends NO email — or via public signup only
   while `mailer_autoconfirm` is on (Dashboard → Auth → "Confirm email" OFF).
2. NEVER use real-domain fake addresses (`@gmail.com` etc.) — if an email ever fires, those are
   the most damaging bounces. Use `@questline.test` (.test never resolves) consistently.
3. Delete test users when a phase's verification is done (Dashboard → Authentication → Users,
   or admin DELETE). Don't accumulate them.
4. Before PROD launch (P6/P7): configure a **custom SMTP provider** (e.g. Resend/Postmark) on
   the prod project and re-enable confirmations there — never ship on Supabase's shared mailer.

## 3. Security gates (mandatory, Lead‑verified)

### S1 — Secrets & config (every phase)
- Only `SUPABASE_URL` + `SUPABASE_ANON_KEY` in clients. **No service‑role key, no Google client secret,
  no refresh token** in any client, repo, log, or commit. Verify with a secret scan before each push.
- `.env.example` accurate; real `.env*` git‑ignored. Keystores/provisioning profiles never committed.

### S2 — Data access / RLS (gate at P1 + P2)
- RLS enabled on **every** table (`docs/04 §4`). Prove with a second account that user B cannot read or
  write user A's rows (integration test, output attached).
- XP/streak written **only** by the `security definer` RPCs (`docs/04 §6`); direct client `xp_event`
  inserts are rejected by policy — test that the rejection happens.

### S3 — Auth & OAuth (gate at P2 + P6)
- Sessions stored per‑platform secure norms (web: httpOnly/secure cookies via `@supabase/ssr`; Android:
  encrypted DataStore/Keystore; iOS: Keychain). No tokens in localStorage/plain prefs.
- Google Calendar uses **incremental** scope, requested only when the user enables sync. The **refresh
  token lives server‑side only** (Edge Function / secured table) — Lead checks it never reaches a client.
- Skills: `firebase/agent-skills@firebase-security-rules-auditor` (RLS/rules mindset, transferable),
  `wshobson/agents@security-requirement-extraction`, `affaan-m/everything-claude-code@security-review`,
  `better-auth/skills@better-auth-security-best-practices`.

### S4 — Input & abuse (gate at P4 + P7)
- Validate/normalise all user input server‑side (lengths, hex colour format, hours 0–24, weekday enum).
- Quest counters can't go negative or exceed target server‑side; XP can't be self‑granted (S2).
- Rate‑limit RPCs where cheap; never trust client timestamps for security decisions (only for ordering).

### S5 — Dependency & final review (gate at P7)
- `npm audit` / Gradle dependency check / SwiftPM audit clean of high‑severity (output attached).
- Run a full security review of the diff before the final PASS. Use the local `/security-review`
  command (this repo) and/or `affaan-m/everything-claude-code@security-review`. The Lead will not issue
  the final platform PASS without it.

## 4. How this folds into the phase gates

`docs/07` now carries a per‑phase **Security/QA** line. Summary of *added* gates:

| Phase | Added security/QA gate |
|---|---|
| P1 | S1 + S2 (RLS proven with 2nd account); non‑negotiable unit tests green |
| P2 | S3 (session storage, no plaintext tokens) |
| P3 | QA pass on the core loop + offline; feel gate |
| P4 | S4 (input validation, counter bounds) |
| P6 | S3 (Calendar token server‑side) + sync QA |
| P7 | S5 (dep audit + full security review) + full exploratory QA + reduce‑motion |

Each appears in the Validation Request's Self‑check **with command output** (Iron Law).
