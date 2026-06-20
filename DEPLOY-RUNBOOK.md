# Deploy Runbook — Shipping a project to a subdomain of `marcdot.site`

A reusable, end-to-end runbook generalized from the Questline deploy. Follow top to
bottom for the next site. The **Gotcha Hall of Fame** at the bottom lists the exact
traps that cost real time — skim it first.

**Architecture pattern:** each project = its own Git repo + its own Vercel project,
served at its own **subdomain** of `marcdot.site` (e.g. `questline.marcdot.site`).
The portfolio at `marcdot.site` stays untouched.

> **Critical fact about your setup:** DNS for `marcdot.site` is managed by **Vercel**
> (nameservers `ns1.vercel-dns.com` / `ns2.vercel-dns.com`), **not Hostinger**. All DNS
> records — subdomains, email — are added in **Vercel**, never in Hostinger.
> Hostinger only registers the domain.

---

## 1. Repo → GitHub
1. The project lives in its own git repo (separate history from the portfolio).
2. Create an **empty** GitHub repo (no README/.gitignore/license, or the first push conflicts).
3. Push:
   ```
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin master
   ```
4. Make sure no secrets are tracked — only `.env.example`, never `.env`/`.env.local`.

## 2. Import to Vercel
1. Vercel → **Add New → Project → Import** the repo.
2. **Root Directory:** if it's a monorepo, set this to the app subfolder (e.g. `webapp/`),
   not the repo root. ⚠️ Getting this wrong = build fails immediately.
3. Framework is auto-detected (Next.js, etc.).

## 3. Environment variables — THE biggest trap ⚠️
1. Add env vars on the **project itself** (project → Settings → Environment Variables),
   **not** the team-level **"Shared"** tab. Shared vars added to "all projects" do **not**
   attach to a specific project → the build sees nothing.
2. **Do NOT mark `NEXT_PUBLIC_*` vars as "Sensitive."** They're public by design (they get
   inlined into the browser bundle). Sensitive vars aren't exposed to the **build step**, so
   `NEXT_PUBLIC_` inlining bakes in `undefined` → the app throws at runtime (e.g. a blanket
   500 from middleware). Leave Sensitive **OFF**.
3. Tick **all environments** (Production + Preview).
4. After any env change, **Redeploy WITHOUT build cache** (Deployments → ⋯ → Redeploy →
   uncheck "Use existing Build Cache"). A cached redeploy reuses the old inlined values.

## 4. Add the subdomain (all in Vercel)
1. Project → **Settings → Domains → Add** → `sub.marcdot.site`.
2. Because Vercel runs the nameservers, it usually **auto-configures** the DNS and flips to
   **Valid ✓** on its own. If it asks for a record: Vercel account → **Domains** →
   `marcdot.site` → **DNS Records → Add**: `CNAME` `sub` → `cname.vercel-dns.com`.
3. ❌ Do **not** click "Change Nameservers" in Hostinger and do **not** add records in
   Hostinger — that would break the portfolio's DNS.
4. Vercel auto-issues TLS once the record resolves (minutes–~1h).

## 5. Point auth/security config at the new URL *(only if the app has auth)*
The new domain is the canonical URL — update everything that bakes it in:
- **Supabase → Authentication → URL Configuration:** Site URL = `https://sub.marcdot.site`;
  add `https://sub.marcdot.site/**` to Redirect URLs.
- **Google Cloud → OAuth client → Authorized redirect URIs:** add both flows if used —
  social login `https://<ref>.supabase.co/auth/v1/callback` and any custom function callback.
  Add `https://sub.marcdot.site` to **Authorized JavaScript origins**.
- **Cloudflare Turnstile widget:** add `sub.marcdot.site` to allowed hostnames (or the
  captcha won't render → login blocked).

## 6. Transactional email *(if the app sends mail — e.g. signup confirmation)*
Provider: **Resend** + Supabase custom SMTP.
1. Resend → **Add Domain** → use a sending **subdomain** (`send.marcdot.site`) for reputation isolation.
2. Resend shows DNS records → click **Auto configure / Go to Vercel** → it adds DKIM/SPF/DMARC
   to **Vercel DNS** via the integration (approve it; it only touches email records). Leave
   **"Enable Receiving" OFF** (you only send). Wait for **Domain verified ✓**.
3. Resend → **API Keys → Create** (Sending) → copy the `re_…` key.
4. Supabase → **Authentication → Emails → SMTP Settings → Enable Custom SMTP:**
   | Field | Value |
   |---|---|
   | Sender email | `noreply@send.marcdot.site` (must be on the verified domain) |
   | Sender name | the app name |
   | Host | `smtp.resend.com` |
   | Port | `465` (fallback `587`) |
   | Username | **`resend`** (literal word — NOT the API key's name) |
   | Password | the `re_…` API key |
5. Supabase → **Authentication → Providers → Email → Confirm email = ON.**
6. Supabase → **Authentication → Rate Limits → Sending emails:** raise from `2` → `30`/h
   (this field is locked until custom SMTP is enabled).
7. **Test:** sign up with a real email → confirmation arrives from the verified domain → link works.

## 7. Next.js app-level gotchas worth pre-empting
- **Auth-gated pages crash the build** if they construct a client needing env during static
  prerender. Fix: `export const dynamic = "force-dynamic"` on the authed route-group layout(s).
- **Edge Functions called from the browser** need CORS headers + an `OPTIONS` handler, and
  `verify_jwt = OFF` (the CORS preflight carries no JWT, so the platform gate would 401 it;
  authenticate inside the function instead).
- **CSP must allow third-party widgets** (e.g. Turnstile → add `challenges.cloudflare.com`
  to `script-src`, `frame-src`, `connect-src`).
- **Sign-out must navigate** — `signOut()` clears the session but doesn't redirect; call
  `window.location.assign('/login')` after it.

---

## Gotcha Hall of Fame (the time-wasters, in order of pain)
1. **Env vars on "Shared/all projects" instead of the project** → build sees nothing → runtime 500.
2. **`NEXT_PUBLIC_*` marked "Sensitive"** → not inlined at build → blanket 500 in middleware.
3. **Redeploy with build cache after an env change** → stale `undefined` values persist.
4. **DNS edited in Hostinger** → no effect; DNS lives in **Vercel** (nameservers point there).
5. **SMTP username not the literal `resend`** → auth failures sending mail.
6. **Google `redirect_uri_mismatch`** → the exact callback URL isn't in the OAuth client's
   Authorized redirect URIs (`/auth/v1/callback` for social login).
7. **Edge Function "Failed to fetch"** → missing CORS / `verify_jwt` left ON.
8. **Root Directory not set to the app subfolder** in a monorepo → build fails at import.

## One-glance checklist for the next site
- [ ] Repo pushed to GitHub (no secrets, only `.env.example`)
- [ ] Vercel project imported, **Root Directory** correct
- [ ] Env vars on the **project**, **not Sensitive**, all environments
- [ ] Redeployed **without** build cache
- [ ] Subdomain added in Vercel → **Valid ✓** (DNS auto-configured, Hostinger untouched)
- [ ] Auth URLs updated (Supabase / Google / Turnstile) — if applicable
- [ ] Email: Resend domain verified, SMTP wired (`resend` username), confirm-email ON — if applicable
- [ ] Live URL loads, sign-up + sign-in + sign-out all work
