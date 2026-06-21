# Retention — scheduling (deploy steps)

Wires the 12-month inactivity retention (migrations 011 + 012 + the
`retention_warn` Edge Function) to run daily. **Do this only after 011 + 012 are
applied and `retention_warn` is deployed.** No rush — nobody can reach 12 months
of inactivity for ~11 months.

## 1. Deploy the Edge Function `retention_warn`
Dashboard → Edge Functions → deploy from `supabase/functions/retention_warn/index.ts`.
- **verify_jwt = OFF** (the cron caller has no JWT; the function is guarded by `CRON_SECRET`).
- Edge Function **secrets** needed: `RESEND_API_KEY` (same key as SMTP), `CRON_SECRET`
  (any long random string), and optionally `APP_URL=https://questline.marcdot.site`.
  (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.)

## 2. Enable the extensions (SQL Editor, once)
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

## 3. Schedule both jobs (SQL Editor) — replace <CRON_SECRET> with the real value
```sql
-- daily warning at 02:00 UTC → calls the Edge Function
select cron.schedule('retention-warn', '0 2 * * *', $$
  select net.http_post(
    url     := 'https://oovismpmhcmytforydfe.supabase.co/functions/v1/retention_warn',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
  );
$$);

-- daily deletion at 03:00 UTC (1h after warnings)
select cron.schedule('retention-delete', '0 3 * * *', $$
  select public.delete_inactive_users();
$$);
```

## 4. Verify
```sql
select jobname, schedule, active from cron.job
  where jobname in ('retention-warn','retention-delete');   -- expect 2 active rows
```
Smoke-test the warn function once (won't email anyone unless a user is already
>11 months inactive):
```bash
curl -s -X POST https://oovismpmhcmytforydfe.supabase.co/functions/v1/retention_warn \
  -H "x-cron-secret: <CRON_SECRET>"        # expect {"warned":0}
```

## To change the windows
- Deletion line: `public.inactivity_cutoff()` (currently `now() - interval '12 months'`).
- Warning line: the `p_warn_cutoff` default in `public.users_to_warn()` (`now() - interval '11 months'`).
- To unschedule: `select cron.unschedule('retention-warn'); select cron.unschedule('retention-delete');`
