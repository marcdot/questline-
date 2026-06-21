# GDPR fixes — verification log

## Test gate (webapp/) — all green, 2026-06-21
- `npm run lint` → exit 0
- `npm run test` → **59 passed (4 files)**, exit 0
- `npx tsc --noEmit` → exit 0
- `npm run build` → compiled successfully, exit 0

## Live erasure-cascade verification (throwaway account)
`admin_delete_user()` works by `delete from auth.users where id = auth.uid()`, relying on the
`ON DELETE CASCADE` chain off `user_profile`. That chain was verified live against the real backend
(project `oovismpmhcmytforydfe`) using the admin API on a throwaway user:

1. Created throwaway user → trigger auto-made `user_profile` + `user_settings`.
2. Seeded `habit`, `quest`, **`sleep_log` (Art. 9 health)**, **`google_token` (credential)**.
3. BEFORE: `{user_profile:1, user_settings:1, habit:1, quest:1, sleep_log:1, google_token:1}`.
4. Deleted the auth user (what `admin_delete_user` does internally).
5. AFTER: **all tables 0** — every row cascaded away, including sleep_log and google_token.

→ **PASS.** Erasure is complete; nothing (token, health data, profile) is left behind.

## Not verifiable from here (deploy-gated — owner runs after applying migration 010)
Migration `010` is **not yet deployed** — Supabase DDL can't be applied with the API keys alone
(needs the SQL editor / db password). So `export_user_data()` and the in-app `admin_delete_user`
RPC are not live until you deploy. Post-deploy smoke test (run as a logged-in test user):

```sql
-- Access/portability (Art. 15/20): returns one JSON blob of the caller's data
select public.export_user_data();
-- Erasure (Art. 17): irreversibly deletes the calling user — use a THROWAWAY login
select public.admin_delete_user();
```

Or in the app: Settings → **Download my data** (saves `questline-data-YYYY-MM-DD.json`), and
Settings → **Delete account** (revokes the Google grant, then erases everything).
