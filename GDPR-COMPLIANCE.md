# Questline — GDPR Compliance Report

> Audit of Questline (`questline.marcdot.site`) against Regulation (EU) 2016/679 (GDPR).
> Scope: a portfolio app with a single controller (the developer) and a small set of real
> users. Goal is **defensible** compliance — a privacy notice, working access/export + erasure,
> a processor list, and a sleep-data classification — not enterprise DPIA theatre.
> Ticket: `Q-005`. Audited against the live code on 2026-06-21.

**Controller:** Marc Landersson (sole developer/operator), Denmark.
**Supervisory authority:** Datatilsynet (Danish DPA).

## Status legend
| Mark | Meaning |
|---|---|
| ✅ | Compliant |
| ⚠️ | Partial — gap noted |
| ❌ | Gap — not met |
| 🔧 | Fixed in this PR (`tickets/gdpr-2026-06-21`) |
| 👤 | Owner action required (only you can do it — see end) |

---

## 0. Data map — what personal data Questline processes

Verified against `docs/02-data-model.md`, `docs/04-backend-supabase.md`, and migrations 001–009.

| Category | Fields | Table(s) | Source | Special category (Art. 9)? |
|---|---|---|---|---|
| Identity | email, display_name, avatar_url | `user_profile` (mirrors `auth.users`) | Supabase Auth / user | No |
| Auth metadata | hashed password, IP, session/login timestamps | `auth.*` (Supabase-managed) | Supabase Auth | No (but IP = personal data) |
| Preferences | theme, xp_display, calendar_sync_enabled, reminders_enabled, google_connected, weight_kg, walk_pace | `user_settings` | User | **weight_kg → see §5** |
| Behavioural | habit (name, color), quest (title, schedule, targets, reminder_time) | `habit`, `quest` | User | No |
| Gamification | quest_instance, quest_event, xp_event, streak | (derived from actions) | Derived | No |
| Health | sleep_log (hours per night) | `sleep_log` | User input | **Yes — see §5** |
| Calendar | google_event_id, sync state | `calendar_link` | Google OAuth | No |
| Credential | Google OAuth **refresh token** | `google_token` (RLS, no policies; service-role only) | Google OAuth | No (secret credential) |

No marketing data, no analytics, no profiling beyond the user's own gamification stats.

---

## 1. Lawful basis & transparency — Art. 6, 13  ⚠️ → 👤

**Status:** Legal bases are clear and defensible; **no privacy notice is published** (the one real transparency gap).

**Legal basis per activity** (document this in the privacy notice):

| Processing | Basis | Article |
|---|---|---|
| Account + core habit/quest/XP tracking | **Contract** (the service the user signed up for) | 6(1)(b) |
| Sleep / weight / calorie tracking (health) | **Explicit consent** | 9(2)(a) + 6(1)(a) |
| Google Calendar sync | **Consent** (separate opt-in per connect) | 6(1)(a) |
| Bot defence (Turnstile) | **Legitimate interest** (security of the service) | 6(1)(f) |
| Transactional email (confirmation) | **Contract** | 6(1)(b) |

**Gap:** Art. 13 requires a privacy notice given *at the point of collection*. None exists.
**Fix:** 🔧 A complete draft is provided in `PRIVACY-POLICY-DRAFT.md` — **draft only, you own the final legal wording**. 👤 Publish it at `/privacy`, link it from the signup form, and add a one-line acknowledgement at signup.

---

## 2. Right of access & data portability — Art. 15, 20  ❌ → 🔧

**Status (before):** ❌ No way for a user to obtain a full copy of their data. Stats page showed aggregates only.

**Fix:** 🔧 Added `export_user_data()` RPC (migration `010`) + a **"Download my data"** button on the profile page. Returns all of the user's rows from every table as a single structured JSON document (machine-readable → satisfies Art. 20 portability). Runs `SECURITY INVOKER` so existing RLS scopes it to the caller; the secret Google refresh token is deliberately **not** exported (it is a credential, not user content — its existence is disclosed via `user_settings.google_connected`).

**Response time (Art. 12.3):** self-service → instant, well within the 1-month limit.

---

## 3. Right to erasure — Art. 17  ❌ → 🔧  (most serious finding)

**Status (before):** ❌ **The "Delete account" button was broken.** `profile/page.tsx` called `supabase.rpc('admin_delete_user')`, but **no such function existed in any migration** (001–009). The Android client even comments "if defined". So deletion silently failed and *no* user could erase their account — a direct Art. 17 breach.

**Fix:** 🔧 Migration `010` defines `admin_delete_user()` (`SECURITY DEFINER`, pinned `search_path`, deletes only `auth.uid()`). It runs `delete from auth.users where id = auth.uid()`, which cascades through `user_profile` (`ON DELETE CASCADE`) to **every** table that references it — `habit`, `quest`, `quest_instance`, `quest_event`, `xp_event`, `streak`, `sleep_log`, `calendar_link`, `user_settings`, **and `google_token`** (migration 006 also cascades off `user_profile`). One statement, complete erasure.

**Google grant:** 🔧 The profile delete handler now calls the existing calendar-disconnect Edge Function **before** deletion, which best-effort **revokes the grant at Google** and deletes the stored refresh token. So both our copy *and* Google's grant are cleared. Best-effort by design — a Google outage must not block the user's right to delete.

**Append-only ledgers (`quest_event`, `xp_event`):** these cascade-delete with the account (not anonymised/retained). For a portfolio app with no legal-retention obligation, full deletion is the correct, simplest choice.

**Verification:** the `ON DELETE CASCADE` chain this relies on was verified live against the backend (throwaway account) — see `VERIFICATION-gdpr.md`.

---

## 4. Right to rectification — Art. 16  ✅

Users can edit display_name, theme, XP display, weight, walk pace, habits (name/colour), quests, and sleep entries (upsert per night) directly in the UI. Covered.

---

## 5. Special-category data (sleep, weight) — Art. 9  ⚠️ → 👤 (decision required)

**Classification (decision):** `sleep_log.hours` and `user_settings.weight_kg` are **self-reported wellness data**, not clinical health data — but sleep duration and body weight are widely treated as **health data under Art. 9(1)**, and the ticket Q-002 plans calorie tracking. The conservative, defensible position for an app open to EU users: **treat sleep and weight as special-category data** and process them under **explicit consent (Art. 9(2)(a))**.

**Status:** ⚠️ Currently collected with no explicit, separate consent step.

**Gap & fix:**
- 👤 Add a **one-time explicit opt-in** at the first sleep/weight entry: *"Questline stores sleep and weight as health-related information to power your stats. I consent."* — freely given, specific, withdrawable. (UI work, deferred — out of this PR's "safe code fixes" scope; tracked here as the next consent task.)
- 👤 Add a **withdraw** toggle in Settings that stops processing + offers to delete existing health rows (consent withdrawal must be as easy as giving it — Art. 7(3)).
- ✅ Extra security already in place: RLS owner-scoping + Supabase encryption at rest (Art. 9 "appropriate safeguards").
- **DPIA (Art. 35):** **not required at this scale** (a handful of users, not "large-scale" special-category processing). Trigger that would change this: opening to many users *or* adding profiling/automated health inferences → run a DPIA then.

> If you would rather **not** carry Art. 9 obligations at all, the alternative is to drop sleep/weight tracking. Keeping them = the consent step above is mandatory before opening signups.

---

## 6. Consent & ePrivacy (cookies, Turnstile) — Art. 7, ePrivacy Directive  ⚠️ → 👤

**Cookies:** ✅ The only cookies are Supabase Auth's `sb-*-auth-token` (HTTP-only, Secure, SameSite via `@supabase/ssr`). These are **strictly necessary** for authentication → **exempt from consent**, no banner needed. Verified: no analytics, Sentry, gtag, Pixel, or tracking SDKs anywhere in `app/` or `lib/`. **Document this decision** (done — here).

**Turnstile / IP disclosure:** ⚠️ Cloudflare Turnstile on the login form collects the visitor's **IP address and behavioural signals** for bot detection. IP is personal data; this processing relies on **legitimate interest (Art. 6(1)(f))** and **must be disclosed** in the privacy notice (it currently isn't, because there is no notice).
**Fix:** 🔧 The privacy-policy draft includes a Turnstile/Cloudflare disclosure paragraph. 👤 Publish it.

**Automated decision-making (Art. 22):** Questline's gamification (XP, streaks) is automated but has **no legal or similarly significant effect** → Art. 22 does **not** bite. Disclose its existence in the notice for transparency (Art. 13(2)(f)) — included in the draft.

---

## 7. Data minimisation & retention — Art. 5(1)(c), 5(1)(e)  ⚠️ → 👤

**Minimisation:** ✅ No data is collected that the app doesn't use. `avatar_url`, `reminder_time`, `weight_kg` are all optional/nullable.

**Retention:** ⚠️ No retention policy is defined.
- Active accounts: data kept while the account exists (justified — it *is* the service). ✅
- **Inactive/dead accounts:** no auto-deletion. 👤 **Set a retention decision** (e.g. "delete accounts after 24 months of inactivity, after an email warning") and state it in the notice. For this scale a documented policy is enough; automation can come later.
- Google refresh token: deleted on disconnect and on account deletion. ✅
- Transactional email logs (Resend): don't retain longer than needed — 👤 confirm Resend's retention setting.

---

## 8. Security of processing — Art. 32  ✅ (evidence, a win to show)

Already strong (see `SECURITY.md`, audited live 2026-06-14). Mapped to Art. 32:

| Art. 32 measure | Questline evidence |
|---|---|
| Access control / confidentiality (32(1)(b)) | **RLS on all 11 tables**, owner-scoped (`user_id = auth.uid()`); `google_token` + `rate_limit` have RLS enabled with **no policies** → invisible to all client roles, service-role only |
| Encryption in transit (32(1)(a)) | TLS everywhere; HSTS (2y), full security-header set (CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) |
| Encryption at rest (32(1)(a)) | Supabase disk encryption |
| Secret handling | service-role key + Google client secret never in git history (blobs scanned); never reach the client bundle |
| Integrity / anti-tamper | XP & streak writes only via `SECURITY DEFINER` RPCs that check `auth.uid()`; OAuth `state` is HMAC-signed (forged → 403) |
| Resilience / abuse limits | per-user rate limiting on the Calendar Edge Functions (429 + Retry-After); Turnstile on signup |
| Password storage | Supabase Auth (bcrypt) |

**Minor follow-ups (already noted in SECURITY.md, acceptable for the threat model):** Data-API reads aren't per-request rate-limited; CSP allows `unsafe-inline`/`unsafe-eval` for the Next.js runtime. Not GDPR blockers.

---

## 9. Processors & international transfers — Art. 28, 44+  ⚠️ → 👤

| Processor | Role | Data | Region | Art. 28 DPA | Transfer (Art. 44+) |
|---|---|---|---|---|---|
| **Supabase** | DB + Auth | everything | ❓ **confirm region** (project `oovismpmhcmytforydfe`) | 👤 sign DPA (Dashboard → Settings → Legal) | If US region → SCCs / DPF needed; **move to EU region** to avoid |
| **Vercel** | Hosting | request data, IP | Global edge (incl. US) | 👤 accept DPA (Vercel dashboard) | SCCs in Vercel's DPA; DPF-certified |
| **Cloudflare** | Turnstile | IP, behavioural | Global | 👤 covered by Cloudflare DPA | DPF-certified |
| **Resend** | Email | email address | US | 👤 confirm DPA | SCCs / DPF |
| **Google** | Calendar + OAuth | calendar events, OAuth identity | Global | Google Cloud DPA / CDPA | DPF-certified |

**Status:** ⚠️ No DPAs signed yet; Supabase region unconfirmed.
**Fix:** 👤 (1) Confirm Supabase project region — **move to an EU region if it is US-hosted** (simplest transfer compliance); (2) sign/accept each processor DPA; (3) list all processors in the notice (done in the draft).

---

## 10. Breach response — Art. 33, 34  ⚠️ → 👤

**Status:** ⚠️ No written procedure.
**Fix (portfolio-scale, document — don't automate):** 👤 One short paragraph: *on becoming aware of a breach, notify Datatilsynet within 72h (Art. 33); if high risk to users, notify affected users (Art. 34); Supabase's DPA obliges them to notify the controller of breaches on their side.* A `BREACH-RESPONSE.md` stub is enough at this scale.

---

## 11. Children's data — Art. 8  ⚠️ → 👤

**Status:** ⚠️ No age gate; a child could sign up and the controller stays liable.
**Fix:** 👤 Add a **"I am 16 or older"** checkbox/declaration at signup (Denmark's Art. 8 digital-consent age is 13, but 16 is the safe EU-wide default). Minimal UI change; deferred from this PR.

---

## 12. Not required at this scale (with the trigger that would change it)

| Item | Why skipped | Trigger to revisit |
|---|---|---|
| Formal **ROPA** (Art. 30) | <250 people, processing not large-scale or high-risk → Art. 30(5) exemption largely applies; this report *is* a lightweight record | Hiring staff, or large-scale/high-risk processing |
| **DPIA** (Art. 35) | Small user base, no large-scale special-category processing, no profiling with significant effects | Many users **or** analytics/profiling/automated health inference |
| **DPO** (Art. 37 / BDSG §38) | Solo operator, not core-activity large-scale monitoring | 20+ staff (DE) or large-scale monitoring as core activity |
| **EU representative** (Art. 27) | Controller is established in the EU (Denmark) | If controller moves outside the EU |

---

## Summary

| # | Area | Article | Before | Now |
|---|---|---|---|---|
| 2 | Access / export | 15, 20 | ❌ | 🔧 done |
| 3 | Erasure (broken delete) | 17 | ❌ | 🔧 done |
| 1 | Privacy notice | 13 | ❌ | 🔧 drafted → 👤 publish |
| 5 | Health consent | 9 | ⚠️ | 👤 consent UI |
| 6 | Turnstile/IP disclosure | 6(1)(f) | ⚠️ | 🔧 drafted → 👤 publish |
| 7 | Retention | 5(1)(e) | ⚠️ | 👤 decide |
| 9 | DPAs + transfers | 28, 44+ | ⚠️ | 👤 sign + region |
| 10 | Breach procedure | 33, 34 | ⚠️ | 👤 write stub |
| 11 | Age gate | 8 | ⚠️ | 👤 add |
| 4 | Rectification | 16 | ✅ | ✅ |
| 8 | Security | 32 | ✅ | ✅ |
| 12 | Cookies | ePrivacy | ✅ | ✅ |

**The two ❌ blockers (export + broken erasure) are fixed in code in this PR.** Everything else is either already green or an owner action listed at the end of this work.
