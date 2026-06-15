# Go-Live Plan — Calendar + Public-Launch Security

Status as of 2026-06-15. This covers the three things standing between "works on
my machine / test account" and "safe to put on the public portfolio URL":

1. **Calendar** — make Google Calendar sync actually work in production.
2. **Cloudflare Turnstile** on the signup form (bot wall before public exposure).
3. **Supabase auth rate limits** (throttle credential-stuffing / signup abuse).

Items marked **[you]** must be done by you in a dashboard (I can't reach those
consoles). Items marked **[code]** are already in the repo or I can land them.

---

## Part A — Calendar go-live

The calendar code is finished and committed; what's missing is the **deploy** of
the database objects and Edge Functions to your Supabase project. Nothing here is
a code change — it's pushing what's already in `questline/supabase/` to the cloud.

### A1. Apply migrations **[you]**
In Supabase dashboard → **SQL Editor**, run these in order if not already applied:

- `supabase/migrations/006_google_token.sql` — service-role-only token table
- `supabase/migrations/007_rate_limit.sql` — `rate_limit` table + `check_rate_limit()`

> How to tell if they're already applied: in SQL Editor run
> `select to_regclass('public.google_token'), to_regclass('public.rate_limit');`
> Two non-null rows back = already applied; skip this step.

### A2. Redeploy both Edge Functions **[you]**
Dashboard → **Edge Functions**. Redeploy from the repo source:

| Function | Source | `verify_jwt` | Why |
|---|---|---|---|
| `calendar_oauth`  | `supabase/functions/calendar_oauth/index.ts` | **OFF** | Google hits the callback with no Supabase JWT; also lets the CORS preflight through |
| `calendar_sync`   | `supabase/functions/calendar_sync/index.ts`  | **OFF** | Called from the browser → its CORS preflight (OPTIONS) carries no JWT, so platform-level `verify_jwt` would 401 it. The function authenticates itself with `getUser()` and returns 401 on a bad/missing token, so security is unchanged. |

`verify_jwt` is set per-function in the function's settings.

> **Both functions must be `verify_jwt = OFF`** and both must send CORS headers +
> answer `OPTIONS` (they now do). With `verify_jwt = ON`, the browser's preflight
> (which has no `Authorization` header) is rejected by the platform before reaching
> the function → every call fails with "Failed to fetch". Authentication still
> happens *inside* each function, so turning the platform gate off is not a security
> downgrade.

### A3. Confirm the Google OAuth config **[you]**
Google Cloud Console → the OAuth client (`559386499305-…apps.googleusercontent.com`):
- **Authorized redirect URI** must be the `calendar_oauth` function URL +
  `/callback` (e.g. `https://<project>.supabase.co/functions/v1/calendar_oauth/callback`).
- Add your **production portfolio domain** to authorized JavaScript origins once
  the domain (Part D) is live.
- Supabase project → **Edge Function secrets**: only `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are needed. (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
  are auto-injected. The function reuses `GOOGLE_CLIENT_SECRET` as its HMAC
  state-signing key — there is **no** separate `OAUTH_STATE_SECRET`.)
- This project's redirect URI is exactly:
  `https://oovismpmhcmytforydfe.supabase.co/functions/v1/calendar_oauth/callback`

### A4. Verify **[you, ~2 min]**
1. Profile → **Connect Google Calendar** → Google consent → lands back on `/profile`
   showing **Connected ✓** within ~15s.
2. Create/complete a quest with calendar-sync on → event appears in Google Calendar.
3. **Disconnect** → returns 200, badge flips to Not connected, and the grant is
   gone from your Google account's "Third-party access" list.
4. Hammer the consent button >10×/min → you should get a **429** (rate limit working).

### A5. Known iOS limitation (not a bug — manage expectations)
In an **installed PWA** (Add to Home Screen), the OAuth round-trip bounces out to
Safari and iOS often won't hand control back to the standalone window — so the
"Connected ✓" poll may not fire inside the installed app. It works in a normal
**Safari tab**. Options, cheapest first:
- **Accept + document it** ("connect calendar in Safari, then open the app") — fine
  for a portfolio piece.
- Switch the standalone flow to an in-app browser tab (`SFSafariViewController`
  semantics) — not available to pure PWAs without a native shell.
- Defer until/if you ship the native iPhone shell.

---

## Part B — Cloudflare Turnstile on signup

Goal: a bot can't mass-create accounts against your public Supabase. Turnstile is
the "invisible CAPTCHA" — a token the client gets, the server verifies.

Supabase has **native Turnstile support for auth** — you do **not** have to build
your own siteverify endpoint. That's the path I recommend.

### B1. Create the widget **[you]**
Cloudflare dashboard → **Turnstile** → add a site:
- Domains: your production portfolio domain (+ `localhost` for dev).
- Mode: **Managed**.
- Copy the **Site Key** (public) and **Secret Key** (private).

### B2. Wire Supabase Auth → Turnstile **[you]**
Supabase dashboard → **Authentication → Attack Protection → CAPTCHA protection**:
- Enable, provider **Turnstile**, paste the **Secret Key**.
- This makes Supabase reject `signUp` / `signInWithPassword` calls that don't carry
  a valid Turnstile token — enforced server-side, can't be bypassed from the client.

### B3. Render the widget + pass the token **[code]**
On `app/(auth)/login/page.tsx`:
- Add the Turnstile script + a widget div, capture the token in state.
- Pass it through on the auth calls:
  ```ts
  supabase.auth.signUp({ email, password, options: { captchaToken } })
  supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
  ```
- Reset the widget after each attempt (tokens are single-use).
- Put the **Site Key** in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public env, safe to expose).

> There's an installable `turnstile-spin` skill that scaffolds the widget + snippets
> if we want to automate B3. Say the word and I'll run it against the login page.

### B4. Verify
Sign up with the widget removed/blocked → Supabase returns a captcha error. With it
present → normal signup. (The Secret Key lives only in Supabase, never in the bundle.)

---

## Part C — Supabase auth rate limits

This is the auth-endpoint counterpart to the `check_rate_limit()` we already added
for the Edge Functions. It throttles brute-force on the **login/signup** endpoints
themselves.

### C1. Set the limits **[you]**
Supabase dashboard → **Authentication → Rate Limits**. Sensible starting values for
a single-owner portfolio app:
- **Sign-ups / sign-ins per hour per IP**: low (e.g. 10–30) — you're the main user.
- **Token refreshes**, **OTP/email sends**: keep the conservative defaults.
- **Email sends per hour**: low, and pair with custom SMTP (below) so you're not on
  Supabase's shared mailer.

### C2. Email confirmation + SMTP **[you]** (recommended before public)
- **Authentication → Providers → Email**: turn **Confirm email ON** (the signup code
  already handles the "check your email" path).
- Configure **custom SMTP** (Resend/Postmark/etc.) so confirmations actually deliver
  and you avoid Supabase's default-mailer bounce warnings.

### C3. Verify
Trigger >N rapid logins from one IP → Supabase starts returning `429`. Confirm a new
signup receives the confirmation email and can't sign in until confirmed.

---

## Part D — Hosting Questline at `questline.marcdot.site`

**Decision:** Questline is its own repo + its own Vercel project. The portfolio
(`marcdot.site`) is a *separate* project and is never touched. Questline lives at the
**subdomain `questline.marcdot.site`** — the right pattern for two independent apps
sharing one domain. (Subpath `marcdot.site/questline` was considered but rejected: it
would require a reverse-proxy on the portfolio + a Next.js `basePath` change, coupling
the two projects.)

### D1. Add the subdomain in the Questline Vercel project **[you]**
Questline project → **Settings → Domains → Add** → `questline.marcdot.site`.
Vercel shows a pending status + the DNS record it wants (a `CNAME` →
`cname.vercel-dns.com`). Use Vercel's shown value as the source of truth.

### D2. Add the DNS record where marcdot.site is managed (Hostinger) **[you]**
Hostinger → **Domains → DNS / Nameservers → Manage DNS records → Add record**:
- **Type:** `CNAME`
- **Name/Host:** `questline`
- **Value/Target:** `cname.vercel-dns.com`
- **TTL:** default

Save. Vercel flips to **Valid ✓** within minutes–an hour and auto-issues TLS. The
portfolio's own records (apex/www) are untouched.

### D3. After the subdomain is live — point security at it **[you]**
- **Supabase → Authentication → URL Configuration:** Site URL =
  `https://questline.marcdot.site`; add `https://questline.marcdot.site/**` to Redirect URLs.
- **Google OAuth client:** add `https://questline.marcdot.site` to Authorized
  JavaScript origins. (Redirect URI stays the Supabase function URL — unchanged.)
- **Turnstile widget:** add `questline.marcdot.site` to allowed domains.
- **Vercel env:** confirm `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set for Production.

---

## One-glance checklist

- [x] A1 migrations 006 + 007 applied
- [x] A2 both Edge Functions redeployed (verify_jwt: **both OFF** + CORS added)
- [x] A3 Google OAuth redirect URI + secrets correct
- [x] A4 connect / sync / disconnect verified (completion is in-app only, by design)
- [ ] B1–B4 Turnstile: widget + Supabase enforcement done; ship `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + redeploy webapp
- [ ] C1–C3 auth rate limits set, email confirm + SMTP on
- [ ] D1–D3 `questline.marcdot.site` added in Vercel, CNAME at Hostinger, security URLs updated
