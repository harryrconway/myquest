# MyQuest — AI Developer Context

## What this is
Cleaning business SaaS. Vanilla HTML/CSS/JS on Cloudflare Pages. Workers in `/functions/api/`. Supabase for Postgres + Auth + Storage. No bundler, no framework.

## Conventions you must follow

### JS pattern
All dashboard JS is IIFE (`(function(){ 'use strict'; ... })()`). Never use ES modules or `import`. Attach nothing to window except what `auth.js` exposes via `window.MQ`. Page JS hooks into `MQ.onReady(fn)`.

### Cache busting
When changing a JS or CSS file, bump the `?v=YYYYMMDD` query string on every `<script>` or `<link>` tag that references it.

### No comments
Default to no code comments. Only add one when the WHY is non-obvious — a hidden constraint, a workaround, a surprising invariant.

### Supabase client vs service role
- Client JS (`MQ.supabase`) uses the anon key + user JWT. Subject to RLS.
- Cloudflare Functions use `SUPABASE_SERVICE_KEY` which bypasses RLS. Never expose this to the client.

---

## Security rules — check these on EVERY change

### When adding a field to `update-profile.js`
Ask: should staff be able to set this themselves? If no → put it in the `if (callerRole === 'owner')` block. Check both `update-profile.js` and `get-staff-profile.js`.

### When adding a field to `get-staff-profile.js`
HR/sensitive fields go in `ownerFields` only, never `selfFields`. Staff calling for their own profile must never receive HR notes, compliance doc URLs, or other admin-only data.

### When adding a direct Supabase query in client JS
Never use `select('*')`. List only the columns the page actually needs. Sensitive columns (hr_notes, police_check_url, etc.) must never appear in client-side queries.

### When creating a new API endpoint
- Verify JWT first, then fetch caller's role from profiles.
- Return 401 for missing/invalid JWT, 403 for insufficient role.
- Use service key for all DB writes.
- Never trust userId from the request body for permission checks — always derive from the verified JWT.

### When changing the `profiles` schema
- Write a migration file in `supabase/migrations/YYYYMMDD_description.sql` using `ADD COLUMN IF NOT EXISTS`.
- Update `docs/database.html` (profiles table + migrations log).
- Update `get-staff-profile.js` ownerFields/selfFields as appropriate.
- Update `auth.js` select column list if the new field is needed at login.

---

## What to update when making changes

| Change type | Files to update |
|---|---|
| New DB column | Migration SQL + `docs/database.html` |
| New API endpoint | `docs/api-functions.html` + TOC |
| Changed dashboard page behaviour | `docs/dashboard-pages.html` |
| New RLS policy | Migration SQL + `docs/security.html` + `docs/database.html` RLS summary |
| Security model change | `docs/security.html` + README.md security table |
| New JS module | `docs/js-modules.html` |

---

## Role hierarchy
`owner` (3) > `manager` (2) > `senior-cleaner` / `mid-cleaner` / `junior-cleaner` / `staff` (1)

`data-min-role="owner"` on body → page is owner-only. `auth.js` enforces this and hides sidebar nav items.

## Staff lifecycle
Valid statuses: `onboarding` | `active` | `exited`

Flow: Owner adds staff (status = `onboarding`, no email sent) → Owner clicks "Send Invite" → `/api/send-invite` generates recovery link + sends email via Resend + sets `invited_at` → Staff sets password via link → Staff completes onboarding wizard → `onboarding_complete: true` → `status: 'active'` (auto-set in update-profile.js when isSelf + onboarding_complete).

The button on the HRIS view card shows "Send Invite" (no `invited_at`) or "Invited [date] — Resend" (has `invited_at`) for onboarding staff only.

## HRIS (staff.html)
Owner-only. Full spreadsheet table with A2 row-expand. Data comes from two sources:
- Table rows: direct Supabase query (basic fields only — id, name, email, role, status, colour, phone, mobile, start_date, doc URL columns)
- Expand card: `POST /api/get-staff-profile` with full owner field set. Cached in `profileCache` object.

Document uploads: owner uploads to `{userId}/{docType}` (no extension — overwrites same key). Staff can only upload/replace their own profile photo.

## Key gotchas
- `profiles` table did NOT have `phone`, `address`, `suburb`, `state`, `postcode`, `start_date`, `cleaning_level` in early migrations — they were added in `20260628_profiles_hris_columns.sql`. If you see a 400 on a profiles query, check that all selected columns exist.
- `auth.js` fires `mq:ready` after session + profiles are loaded. All page JS must wait for this via `MQ.onReady()`.
- Supabase Storage path for profile photos: `{userId}/profile-photo.{ext}` (with extension). Compliance docs: `{userId}/{docType}` (no extension, upsert overwrites).
- Valid status values for `update-profile.js`: `onboarding`, `active`, `exited`. Any other value returns a 400.
- `create-account.js` now uses the Supabase admin user create API (no email sent). Email is sent separately via `/api/send-invite`.
- `invited_at` column on `profiles` tracks when the invite email was sent. Added in `20260628_status_workflow.sql`.
