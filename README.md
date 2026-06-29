# MyQuest

Cleaning business management platform — online quoting, job scheduling, staff management, and client tracking.

**Stack:** Vanilla HTML/CSS/JS → Cloudflare Pages · Cloudflare Workers (Functions) · Supabase (Postgres + Auth + Storage)  
**No bundler. No framework. No build step.**

---

## Local Development

Two options depending on what you're working on:

| Method | Command | Works for |
|---|---|---|
| Pages only | `python3 -m http.server 8788` | All HTML/CSS/JS, dashboard UI |
| Pages + API | `npx wrangler pages dev . --port 8788` | Everything including `/api/*` calls |

API calls (login, saving data, uploads) only work under Wrangler — they'll 404 with the plain python server.

---

## Setting up .dev.vars (one-time, local only)

`.dev.vars` is a private file that lives only on your computer. It gives the local API functions your secret keys so they can connect to Supabase, send emails, etc. **It is never committed to git.**

1. Duplicate `.dev.vars.example` → rename the copy to `.dev.vars`
2. Fill in each value (see where to find them below)
3. Done — Wrangler picks it up automatically

**Where to find each key:**

| Key | Where |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Project Settings → API → service_role key |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `TURNSTILE_SECRET` | Cloudflare dashboard → Turnstile → your site → Secret Key |
| `CRON_SECRET` | Any random string — must match the reminder worker config |
| `ADMIN_EMAIL` | Your email address for shift alerts |

---

## Environment Variables (production)

The same keys must also be set in Cloudflare Pages → **Settings → Environment Variables** for the live site. Do this once, or whenever a key changes.

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public key — safe to expose, RLS controls access |
| `SUPABASE_SERVICE_KEY` | Secret key — bypasses RLS. Never expose to browser. |
| `RESEND_API_KEY` | Sends transactional emails |
| `TURNSTILE_SECRET` | Validates bot-check on the quote form |
| `CRON_SECRET` | Protects cron endpoints |
| `ADMIN_EMAIL` | Where urgent shift alerts are sent |

---

## Database Setup (first time)

Run all migrations in order in the Supabase SQL Editor:

```
supabase/migrations/20260612_company_settings.sql
supabase/migrations/20260612_staff_colour.sql
supabase/migrations/20260613_staff_onboarding.sql
supabase/migrations/20260614_onboarding_extra.sql
supabase/migrations/20260617_schedule_reminder_sent.sql
supabase/migrations/20260618_recurrence_columns.sql
supabase/migrations/20260622_open_shift_coverage.sql
supabase/migrations/20260622_profiles_realtime.sql
supabase/migrations/20260622_staff_documents_storage_policy.sql
supabase/migrations/20260625_input_length_constraints.sql
supabase/migrations/20260627_staff_hr_fields.sql
supabase/migrations/20260628_profiles_hris_columns.sql
supabase/migrations/20260628_rls_security_hardening.sql
supabase/migrations/20260628_status_workflow.sql
supabase/migrations/20260629_quote_internal_fields.sql
```

All migrations use `IF NOT EXISTS` and are safe to re-run.

---

## Security Model

| Layer | What it enforces |
|---|---|
| **Cloudflare Functions** | All writes go through `/api/*`. JWT verified on every request. Role checked server-side before any mutation. |
| **Supabase RLS** | `profiles`: SELECT open to authenticated users; INSERT/UPDATE/DELETE blocked (service role only). `staff-documents` storage: staff can only read their own profile photo; compliance docs are owner/manager only. |
| **Frontend** | `data-min-role` attributes hide pages and elements below required role. `auth.js` redirects unauthenticated users and staff with `onboarding` status. |
| **API field tiers** | `update-profile`: owner-only fields (HR notes, doc URLs, role, status) gated server-side. `get-staff-profile`: returns different field sets for owner vs self-caller — HR fields never sent to staff. |

**Never expose `SUPABASE_SERVICE_KEY` to the client.** It bypasses RLS and has full database access.

---

## Deployment

Push to `main` → Cloudflare Pages auto-deploys. No build step required.

Cache-busting is manual: update `?v=YYYYMMDD` query strings on `<script>` and `<link>` tags when changing JS/CSS files.

---

## Developer Wiki

Full technical reference: [`/docs/index.html`](docs/index.html)

Covers: architecture, database schema, RLS policies, all API endpoints, dashboard pages, JS modules, security model.
