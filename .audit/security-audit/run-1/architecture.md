# Time Portal — architecture summary (run-1, quick profile)

## 1. Product, principals, resources
Invite-only team time tracker (package.json:5, src/lib/auth.ts:8-13). No public sign-up in the client.
- **anon** — holds the public Supabase anon key baked into the static bundle (src/lib/supabaseClient.ts:12-27). Can call GoTrue sign-in and `auth.resend` (src/lib/auth.ts:100-104). RLS gives anon no rows; RPCs are revoked from anon (supabase/admin-create-user.sql:98,135).
- **member** — authenticated, `app_metadata.role` != 'admin'. Starts/stops timers (inserts/updates own `time_entries`), reads own entries and weekly insights.
- **admin** — `auth.jwt()->'app_metadata'->>'role' = 'admin'` (supabase/schema.sql:32-41). Reads/updates/deletes all entries, approves/rejects (status), sees leaderboard + monthly "Top Timer" award, creates users of either role and lists all users via SECURITY DEFINER RPCs.
- **service_role** — only in the (unused by src/) Deno Edge Function supabase/functions/admin-create-user/index.ts.
- **operator** — runs supabase/*.sql in the SQL editor; setup.sql bootstraps the first admin.
Protected resources: `public.time_entries` rows (status, duration_seconds drive the award), `auth.users` (account creation, roles), admin identity, session tokens in browser localStorage.

## 2. Comparable baseline
Standard Supabase "browser anon key + RLS + SECURITY DEFINER RPC" pattern (README.md:84-86). Known ecosystem pitfalls for this pattern: RLS policies that constrain only the owner column, INSERT not covered by UPDATE-only triggers, SECURITY DEFINER search_path, user-writable `user_metadata` used for display/authorization. Calibration only.

## 3. Stack and deployment
TypeScript strict, Next.js 15.1.0 App Router with `output: 'export'` (next.config.mjs:4) → static `out/`; React 19.0.0. No Next server, API routes or middleware at runtime. Hosting: Cloudflare Workers Static Assets (wrangler.jsonc, no `main`), headers from public/_headers (CSP `script-src 'self' 'unsafe-inline'`, `connect-src` *.supabase.co + dns.google). Backend: Supabase GoTrue + Postgres RLS. CI: .github/workflows/{ci,security,lighthouse}.yml (new, pinned action SHAs, deploy via cloudflare/wrangler-action with CLOUDFLARE_API_TOKEN). **Execution limits:** no OS-enforced sandbox and no safe promotion on this Windows host → all checks are source-only; no Postgres/Deno/Supabase CLI locally, so RLS/SQL/Edge Function behaviour is reviewed statically.

## 4. Entry surfaces and key paths
- Supabase REST on `time_entries` via src/lib/entries.ts: insert (39-43, client sets user_id/started_at/status 'pending'), stopEntry (51-59, client computes duration_seconds), listMyEntries (66-70), listAllEntries (78), reviewEntry (85). Any authenticated principal can call PostgREST directly with arbitrary columns, bypassing UI limits.
- RLS: schema.sql:44-71 / setup.sql:65-85 — INSERT `with check (user_id = auth.uid())`; UPDATE own `using/with check (user_id = auth.uid())` with no column restriction; status guarded only by BEFORE UPDATE trigger `enforce_status_rules` (schema.sql:73-88). Awards/leaderboard sum `duration_seconds` of approved rows (src/lib/awards.ts:17-24,53-58).
- RPCs: `admin_create_user` (admin-create-user.sql:17-99, SECURITY DEFINER, search_path public,extensions,auth; is_admin() first; writes auth.users/identities), `admin_list_users` (105-136). Unconditional email-lowercasing updates at 145-149.
- Other-user data rendered in admin console/awards: display names from user-writable `user_metadata.display_name` (src/lib/auth.ts:42, admin-create-user.sql:126), notes, emails — all JSX text (recon found no dangerouslySetInnerHTML/innerHTML/eval).
- Client role/route gating: src/lib/jwt.ts decodes JWT without signature (UX only); RequireAuth (src/components/RequireAuth.tsx); admin route obscured at /time/Portal/admIn/ (src/lib/routes.ts:16).
- Outbound: dns.google DoH with domain only (src/lib/emailCheck.ts:123-153).
- Secrets/config: supabase/setup.sql contains plaintext bootstrap admin credentials (lines ~12-13,132,139-140,200; owner has stated this is intentional for internal use); temp passwords from Math.random with fixed suffix (src/lib/userSql.ts:91-99); `buildCreateUserSql` dead code with comment-line interpolation (userSql.ts:24-88).
- Edge Function (not called by src/): verifies caller via getUser + app_metadata.role, invites via service role, unpinned esm.sh import, raw error.message returned.

## 5. Trust boundaries and strongest controls
| Boundary | Strongest source-visible control |
|---|---|
| anon → data | RLS (auth.uid() null), RPC revoke from anon |
| member → other members' rows | RLS `user_id = auth.uid()` on select/insert/update; delete admin-only |
| member → review status / award integrity | BEFORE UPDATE trigger on status only; nothing on INSERT or duration columns |
| member → admin capability | `is_admin()` from signed JWT app_metadata (not user-writable) |
| admin → auth.users | SECURITY DEFINER RPC with is_admin() first, email regex/disposable list, role coerced |
| browser → rendered content | React JSX escaping; CSP in _headers (deployment-applied) |
| CI → production | pinned actions, `permissions: contents: read`, deploy only on push to main, environment `production` |

## 6. Starting paths
supabase/schema.sql, supabase/setup.sql, supabase/admin-create-user.sql, supabase/functions/admin-create-user/index.ts, src/lib/{entries,auth,jwt,awards,userSql,emailCheck,supabaseClient,validation}.ts, src/context/AuthContext.tsx, src/components/{RequireAuth,AdminReviewTable,MembersPanel,AddUserForm,AwardBanner,CommandSearch}.tsx, src/app/**, public/_headers, wrangler.jsonc, .github/workflows/*.yml, package-lock.json, .gitignore.

## 7. Prior coverage
No prior ledger or findings exist; this is the first run. Deployment facts not observable from source (GoTrue signup setting, JWT expiry, which SQL files were applied, table grants, pgcrypto schema, Edge Function deployment/verify_jwt, header application at the edge) become needs_validation blockers when decisive.

## 8. Companion selection
- DATA-ISOLATION-AND-LIFECYCLE.md — per-owner RLS on a shared table; award derived from row data.
- WEB-PROTOCOL-AND-AUTH.md — JWT claim binding for role (`is_admin()`, client inspectJwt).
- CLIENT-SIDE.md — SPA rendering other users' data, tokens in browser storage, framing.
- SUPPLY-CHAIN-AND-RELEASE.md — GitHub Actions deploy with Cloudflare token, lockfile, remote esm.sh import.
- CLOUD-AND-DEPLOYMENT.md — edge/static-asset header boundary on Cloudflare Workers.
Excluded: MEMORY-SAFETY (no native code), AI-AND-LLM (no model), PROTOCOLS-RPC (no brokers/webhooks; PostgREST covered by access control), RESOURCE-EXHAUSTION (no operator-spend surface beyond Supabase quotas, not source-visible), DESKTOP-MOBILE (no native app).
