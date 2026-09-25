# Time Portal — security audit report (run-1)

Method: [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) @ `c1c8a8c`
(vendored in [`.audit/security-audit-skill/`](../../security-audit-skill/)). Date: 2026-09-25.

## 1. Run profile, scope and limits

| | |
| --- | --- |
| Profile | **`quick`**: one hunter wave, one final coverage critic, one fresh verifier per candidate (Phase 3 and 5 merged). **This is a partial pass, not complete coverage.** |
| Scope | `src/`, `supabase/`, `public/`, `next.config.mjs`, `wrangler.jsonc`, `package.json`, `package-lock.json`, `.github/` |
| Source ref | No VCS in the working copy. Snapshot hash `a81b556c868ea874` (sha256 over the scoped files, including the 2026-09-25 font, logo, SEO and Cloudflare-config edits) |
| Budget | 16 agent invocations; **12 spent**: 4 reconnaissance, 3 hunters, 1 final critic, 4 verifiers |
| Execution | **Sandboxed-source-and-local-only, with source review only.** This Windows host has no OS-enforced sandbox (no-network, empty environment, read-only target, resource limits) and no safe artifact promotion, so no target code was executed. The `confirmed` verdict requires a bounded local reproduction, so none was possible in this run. Every real lead is recorded as `needs_validation` with its exact blocker. |
| Validators | The skill's `validateDocument()` functions for `coverage-ledger.json` and `findings.json` both pass. The CLI wrappers refuse to start on Windows because they need POSIX `O_NOFOLLOW`, so the parent called the exported validation functions directly on parent-written files. The GitHub `security.yml` job reruns the validators on Linux. |
| Prior runs | None. This is the first run. |
| Deferred coverage | 2 units: GoTrue public sign-up setting (from the final critic), and display-name business logic (already covered by a candidate). See §7. |
| After-audit changes | After the snapshot, `next` was upgraded 15.1.0 → 15.5.26 with a `postcss` override (0 production advisories), and login-page entrance fades were removed for performance. Neither touches an audited trust boundary. |

## 2. Security posture summary

Authorization is enforced where it should be: in Postgres RLS and in `SECURITY DEFINER` RPCs that check a
signature-verified JWT claim. The client-side role checks are UX only, and the code says so. No XSS
sink, open redirect, dangerous `eval`, secret-in-bundle, or CI secret exposure was found.

The weak spot is **data integrity of the review and award system**. The RLS write policies bind only
`user_id`. A member can therefore insert rows that are already `approved`, or edit durations after approval,
without going through the UI. Separately, **a working admin password is committed in plaintext** in
`supabase/setup.sql`. The owner has said this is intentional for internal use; it is listed so the risk is
on record.

## 3. Confirmed findings

**None.** No record could reach `confirmed`, because that verdict requires a bounded local reproduction and
this host has no sandbox (§1). This is a limit of the run, not evidence that the code is clean.

## 4. Confirmed finding details

Not applicable (no confirmed records).

## 5. NEEDS VALIDATION

These leads have a complete source trace and survived an independent verifier, but still need one
decisive fact. They are **not scored**, per the method: no severity is given until confirmed.
Details, full traces and exact commands are in [`NEEDS-VALIDATION.md`](NEEDS-VALIDATION.md).

| # | Lead | Repository trace | Blocker | Bounded local next step | Owner-observed check (no production probing) |
| --- | --- | --- | --- | --- | --- |
| 1 | **Members can insert pre-approved entries** with any duration, skipping review and winning the monthly award | `src/lib/entries.ts:41` → `supabase/schema.sql:54` (INSERT checks only `user_id`) → `schema.sql:87` (status trigger is `BEFORE UPDATE` only) → `src/lib/awards.ts:23` | No sandbox; deployed column grants and applied SQL not visible | Local Postgres with `setup.sql`: insert `status='approved'` as a dummy member and expect it to succeed | `pg_trigger`, `pg_constraint`, `has_column_privilege` queries on `time_entries` |
| 2 | **Members can edit duration and timestamps of already-approved entries** | `src/lib/entries.ts:56` → `schema.sql:59` (UPDATE binds only `user_id`) → `schema.sql:78` (trigger compares only status) → `src/lib/awards.ts:58` | Same as #1 | As an approved dummy row's owner, `update … set duration_seconds=2147483647` and expect it to succeed | `pg_policy` and `column_privileges` queries |
| 3 | **Plaintext bootstrap admin password** in `supabase/setup.sql`; re-running the file resets the admin to it | `supabase/setup.sql:140` → `:161-162` → `:182` (reset on re-run) → `src/lib/auth.ts:38` → `setup.sql:59` (`is_admin`) | Repo visibility and whether production still accepts the literal are not observable | `git log --all -- supabase/setup.sql`; test the re-run reset on a throwaway local Supabase | Repo visibility and collaborators; admin account's last password change in the dashboard |
| 4 | **Member-controlled `display_name` is the only label** in the review queue, leaderboard and award, so a member can impersonate another | `src/lib/supabaseClient.ts:21` → `supabase/admin-create-user.sql:126` → `src/lib/auth.ts:126` → `src/app/time/Portal/admIn/page.tsx:61` → `src/components/AdminReviewTable.tsx:34` | No sandbox; GoTrue `user_metadata` update policy is deployment config | Local Supabase: member B renames to "Alice"; the admin queue shows B's entry as Alice | Dashboard: no hook blocks `user_metadata` updates; `admin_list_users` definition |

**Smallest fixes** (source-level, for when the owner chooses to act):
- **#1 and #2:** add a `BEFORE INSERT OR UPDATE` trigger on `time_entries` that, for non-admins:
  - forces `status='pending'` on insert;
  - rejects changes to `started_at`, `ended_at` and `duration_seconds` once `status <> 'pending'`;
  - derives `duration_seconds` server-side from `ended_at - started_at`.
  
  Add `CHECK (duration_seconds >= 0 and ended_at >= started_at)`.
- **#3:** supply the bootstrap password at run time (a psql variable or a dashboard-created admin), drop the password reset in the existing-account branch, and rotate the admin password.
- **#4:** show the email (or a user-id prefix) next to the name in the queue, leaderboard and award, or read names from an admin-writable `profiles` table or `raw_app_meta_data`.

## 6. Hardening notes and positive patterns

**Hardening (not findings: each has no demonstrated boundary failure)**
- `supabase/admin-create-user.sql:30,116`: `search_path` lists `public` before `extensions`, and `crypt`/`gen_salt` are unqualified. Qualify them as `extensions.crypt`, or set `search_path = ''`.
- `supabase/schema.sql:37-40`: `is_admin()` trusts the JWT claim, so a demoted admin keeps rights until the token expires. Keep the JWT lifetime short.
- `supabase/setup.sql:110-127`: `time_entries` is in the realtime publication with `replica identity full`, but no client subscribes. Remove it.
- `supabase/admin-create-user.sql:145-149`: lowercases all emails in bulk every time the file is run. Run this once, deliberately.
- `public/_headers`: the CSP keeps `script-src 'unsafe-inline'` (needed by Next's static export) and allows `connect-src https://*.supabase.co`. Pin the exact project host.
- `src/lib/userSql.ts:91-99`: `generateTempPassword` uses `Math.random` and a fixed `A9z` suffix (~52 bits). Use `crypto.getRandomValues`. `buildCreateUserSql` (lines 24-88) is dead code.
- `src/components/Nav.tsx:34`: `signOut()` errors are ignored, so a failed sign-out on a shared device keeps the session.
- `supabase/functions/admin-create-user/index.ts:9`: unpinned `esm.sh` import. The function is unused by `src/`.
- `.gitignore`: add `/.wrangler/`, `/.swc/` and `*.key`. **Done after the audit.**
- `ci.yml`: the live header smoke test checks only `/`. Consider also checking a signed-in route. gitleaks' default rules may not flag the SQL password.
- Next 15.1.0 had server-side advisories. They were not reachable in a static export, but it has been **upgraded to 15.5.26 after the audit**.

**Positive patterns observed**
- No `signUp` in the client. User creation goes through an `is_admin()`-gated `SECURITY DEFINER` RPC that revokes access from `anon`, coerces the role, and validates email and password server-side.
- RLS isolates members' rows for select, update and delete. Delete is admin-only.
- The JWT is decoded client-side for UX only, with an explicit comment that it is not verified.
- All user-controlled strings render as escaped JSX. There is no `dangerouslySetInnerHTML`, `innerHTML` or `eval`.
- `detectSessionInUrl: false`. There are no redirect parameters and no third-party scripts, and fonts are self-hosted.
- CI hygiene:
  - actions pinned by SHA;
  - `permissions: contents: read`;
  - `persist-credentials: false`;
  - no `pull_request_target`;
  - deploy only on push to `main` inside a `production` environment;
  - lockfile-enforced `npm ci`.
- Cloudflare `_headers` sets HSTS (preload), CSP with `frame-ancestors 'none'`, XFO DENY, nosniff, COOP/CORP, and `noindex` + `no-store` on signed-in routes.

## 7. Coverage summary (from `coverage-ledger.json`)

| Status | Units |
| --- | --- |
| covered | 6 |
| candidate | 5 (4 unique fingerprints) |
| blocked | 0 |
| deferred | 2 |
| **Total** | **13** |

- **Deferred 1 (final critic, `quick_profile_final_critic`):** GoTrue `/auth/v1/signup` with the public anon key.
  - Invite-only depends on the Supabase "Allow new users to sign up" setting, and that setting is not in source.
  - If it is on, anyone becomes a member and can reach leads #1, #2 and #4.
  - Owner check: Authentication → Providers → Email → *Allow new users to sign up* should be **off**.
  - Assign this unit first in the next run.
- **Deferred 2:** display-name business logic, surfaced by a hunter as uncovered. Its root cause is already lead #4.
- **Excluded companions:** memory-safety (no native code), AI/LLM (no model), protocols/RPC brokers (none), resource exhaustion (no operator-spend surface in source), desktop/mobile IPC (none).
- **Final critic result:** 1 missing unit (deferred above) and no reassignments. Clean coverage is **not** claimed.

## Files

| File | Contents |
| --- | --- |
| [`run-metadata.json`](run-metadata.json) | Run facts, budget, execution policy |
| [`architecture.md`](architecture.md) | Phase 1 synthesis |
| [`coverage-ledger.json`](coverage-ledger.json) | Coverage claim (validator: valid) |
| [`findings.json`](findings.json) | 4 `needs_validation` records (validator: valid) |
| [`NEEDS-VALIDATION.md`](NEEDS-VALIDATION.md) | Full traces and exact resolution plans |
| [`FINDINGS-DETAIL.md`](FINDINGS-DETAIL.md) | Confirmed medium+ details (none this run) |
| `hunter-results/`, `prompts/` | Structured agent outputs and the exact prompts used |
