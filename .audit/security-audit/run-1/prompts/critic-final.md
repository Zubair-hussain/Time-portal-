You are the single post-wave coverage critic (`critic-final`) for a quick-profile Cloudflare security-audit-skill run on C:/Users/Zubair Hussain/Desktop/Time-Portal. You read source but do not write files or run anything.

## Coverage-critic waves

Immediately after each hunter wave, spend the reserved invocation on one fresh `research` post-wave coverage critic. It receives `architecture.md`, the full coverage ledger including each assignment block map, current candidate fingerprints and states, and the prior-ledger gap summary. It reads source but does not write or run targets. Require exactly this JSON:

```json
{
  "missing_units": [
    {
      "surface": "...",
      "boundary": "...",
      "subsystem": "...",
      "attack_class": "...",
      "starting_paths": ["repo/relative/path"],
      "selected_companion_blocks": ["FILE.md#section"],
      "excluded_blocks": [{"block": "FILE.md#section", "reason": "..."}],
      "reason": "source-backed coverage gap"
    }
  ],
  "reassign_ids": ["existing-id-that-did-not-close"],
  "resolved_prior_leads": ["fingerprint"],
  "stop": false
}
```

The critic checks for unmapped entry points, unchecked parallel paths, missing lifecycle modes, selected companion classes without a unit, unjustified exclusions, units closed without paths/checks, and prior `needs_validation` or changed-source gaps that no unit addresses. It proposes coverage, not findings. `stop` is the critic's own assessment: `true` only when it accepts no `missing_units` and no `reassign_ids`; the parent's loop condition below, not `stop` alone, decides whether another wave runs. For each fingerprint in `resolved_prior_leads`, the parent marks the linked unit or prior-lead entry resolved and records the critic's source-backed reason.

## architecture.md

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


## Full coverage ledger (with assignment block maps)

```json
[
  {
    "coverage_id": ".github%2Fworkflows%23push%20and%20pull_request%20events::.github%2Fworkflows%2Fci.yml%23deploy%20job%20production%20environment::profile%2Fquick%2Fall-in-scope-subsystems::SUPPLY-CHAIN-AND-RELEASE.md%23Untrusted%20code%20in%20a%20privileged%20workflow",
    "canonical_refs": {
      "surface": ".github/workflows#push and pull_request events",
      "boundary": ".github/workflows/ci.yml#deploy job production environment",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "SUPPLY-CHAIN-AND-RELEASE.md#Untrusted code in a privileged workflow"
    },
    "surface": "push and pull_request events (.github/workflows)",
    "boundary": "deploy job production environment (.github/workflows/ci.yml)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Untrusted code in a privileged workflow",
    "starting_paths": [
      ".github/workflows/ci.yml",
      ".github/workflows/security.yml",
      ".github/workflows/lighthouse.yml",
      ".github/dependabot.yml",
      "package.json",
      "package-lock.json",
      "supabase/functions/admin-create-user/index.ts"
    ],
    "ordinary_attack_class_block": null,
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Untrusted code in a privileged workflow",
      "SUPPLY-CHAIN-AND-RELEASE.md#Workflow command and expression confusion",
      "SUPPLY-CHAIN-AND-RELEASE.md#Mutable and unbound build inputs",
      "SUPPLY-CHAIN-AND-RELEASE.md#Automation identity overreach",
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#Universal moves",
      "SUPPLY-CHAIN-AND-RELEASE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "SUPPLY-CHAIN-AND-RELEASE.md#Update metadata and rollback confusion",
        "reason": "No self-update or client update channel."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter-repo",
    "reviewed_paths": [
      ".github/dependabot.yml",
      ".github/workflows/ci.yml",
      ".github/workflows/lighthouse.yml",
      ".github/workflows/security.yml",
      "package-lock.json",
      "package.json",
      "supabase/functions/admin-create-user/index.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          ".github/workflows/ci.yml",
          ".github/workflows/security.yml",
          ".github/workflows/lighthouse.yml"
        ],
        "invariant": "Contributor-controlled code (fork PRs, Dependabot PRs, workflow_dispatch) never runs in a job holding CLOUDFLARE_API_TOKEN/ACCOUNT_ID or write-scoped tokens",
        "method": "source",
        "result": "All three workflows trigger on push(main)/pull_request/workflow_dispatch (+schedule for security.yml); there is no pull_request_target, workflow_run or issue_comment. Top-level permissions are contents: read (ci.yml:14-15, security.yml:13-14, lighthouse.yml:10-11). The only Cloudflare secrets are referenced at ci.yml:103-104 inside the deploy job, which is gated by `github.event_name == 'push' && github.ref == 'refs/heads/main'` (ci.yml:81) and bound to environment production (ci.yml:85-86), so workflow_dispatch and pull_request never reach deploy. PR jobs run PR code with read-only tokens and no secrets; checkout uses persist-credentials: false everywhere. Only someone who can push to main (trusted maintainer boundary) reaches deploy.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          ".github/workflows/ci.yml",
          ".github/workflows/security.yml",
          ".github/workflows/lighthouse.yml"
        ],
        "invariant": "No attacker-controlled event field (branch name, PR title, commit message, artifact name) is interpolated into run: shell or privileged action inputs",
        "method": "source",
        "result": "Every ${{ }} expression resolves to vars.*, secrets.*, env.*, github.event_name or github.ref; github.ref appears only in the concurrency group (ci.yml:18). The smoke test reads $SITE_URL from env (ci.yml:89,109), quoted, sourced from repository variables (admin-controlled). The security.yml:103-106 loop iterates repository paths in an unprivileged job. No expression-injection path.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          ".github/workflows/ci.yml",
          ".github/workflows/security.yml",
          ".github/workflows/lighthouse.yml",
          ".github/dependabot.yml",
          "package.json",
          "package-lock.json"
        ],
        "invariant": "Build inputs consumed by the production deploy are immutable and bound (actions, npm packages, deploy tool, cache, artifacts)",
        "method": "source",
        "result": "All actions are pinned to full 40-hex commit SHAs. package-lock.json is lockfileVersion 3 with 1062 integrity hashes, all resolved URLs on registry.npmjs.org, no git/file/link specs. The deploy job runs `npm ci` (ci.yml:98), which enforces lockfile integrity, so a PR-scoped setup-node npm cache cannot change resolved content (PR caches are ref-scoped and not readable from main). wrangler is lockfile-pinned (4.86.0, package.json:49), so wrangler-action uses the local binary. The deploy job rebuilds from the main checkout (ci.yml:98-99) and never consumes PR-uploaded artifacts. Dependabot PRs are pull_request events with no secrets and are not auto-merged.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "supabase/functions/admin-create-user/index.ts",
          ".github/workflows/ci.yml"
        ],
        "invariant": "Remote/unpinned imports do not reach a trusted deployed runtime through CI",
        "method": "source",
        "result": "index.ts:9 imports https://esm.sh/@supabase/supabase-js@2 (floating major, no lock), but no workflow deploys Supabase Edge Functions; the only deploy is `wrangler deploy` of ./out, and src/ does not call the function. It becomes mutable only if an operator manually runs `supabase functions deploy`. Not a finding; recorded as hardening.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          ".github/workflows/security.yml",
          ".github/workflows/ci.yml"
        ],
        "invariant": "Job-level permission elevations cannot be driven by untrusted input to a privileged action",
        "method": "source",
        "result": "Elevations: pull-requests: write for dependency-review (security.yml:44-46, pull_request only; fork tokens are downgraded to read) and security-events: write + actions: read for CodeQL (security.yml:60-63). A PR cannot select a resource beyond its own PR/SARIF upload. gitleaks receives GITHUB_TOKEN (security.yml:85) with contents: read. No reachable privileged action.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "public%2F_headers%23edge%20response%20headers::wrangler.jsonc%23static%20assets::profile%2Fquick%2Fall-in-scope-subsystems::CLOUD-AND-DEPLOYMENT.md%23Edge%2Fruntime%20boundary%20mismatch",
    "canonical_refs": {
      "surface": "public/_headers#edge response headers",
      "boundary": "wrangler.jsonc#static assets",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "CLOUD-AND-DEPLOYMENT.md#Edge/runtime boundary mismatch"
    },
    "surface": "edge response headers (public/_headers)",
    "boundary": "static assets (wrangler.jsonc)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Edge/runtime boundary mismatch",
    "starting_paths": [
      "public/_headers",
      "wrangler.jsonc",
      "next.config.mjs",
      "src/app/robots.ts",
      "src/app/sitemap.ts"
    ],
    "ordinary_attack_class_block": null,
    "selected_companion_blocks": [
      "CLOUD-AND-DEPLOYMENT.md#Edge/runtime boundary mismatch",
      "CLOUD-AND-DEPLOYMENT.md#Core discipline",
      "CLOUD-AND-DEPLOYMENT.md#Universal moves",
      "CLOUD-AND-DEPLOYMENT.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "CLOUD-AND-DEPLOYMENT.md#Host or control-plane capability exposure",
        "reason": "No containers or orchestration."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter-repo",
    "reviewed_paths": [
      ".github/workflows/ci.yml",
      "next.config.mjs",
      "public/_headers",
      "src/app/robots.ts",
      "src/app/sitemap.ts",
      "src/lib/routes.ts",
      "src/lib/site.ts",
      "wrangler.jsonc"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "public/_headers",
          "wrangler.jsonc",
          "next.config.mjs",
          "src/lib/routes.ts"
        ],
        "invariant": "Every served path, including the admin console, receives the security header set, and signed-in routes are no-store/noindex, with no alternate runtime path serving responses without them",
        "method": "source",
        "result": "wrangler.jsonc has no `main`, so only Workers Static Assets serve ./out; there is no Worker script or origin fallback to bypass _headers. The `/*` block (_headers:5-14) applies CSP with frame-ancestors 'none', HSTS, nosniff, XFO DENY, Referrer-Policy, COOP and CORP. `/time/*` (_headers:27-29) covers the admin route /time/Portal/admIn/ (routes.ts:16) with no-store + noindex, as do /dashboard/* and /insights/*. not_found_handling (wrangler.jsonc:10) serves the 404 page, still matched by /*. output: 'export' (next.config.mjs:4) means no Next server, middleware or API route. Pages embed only NEXT_PUBLIC_* anon values; data authority is Supabase RLS.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "src/app/robots.ts",
          "src/app/sitemap.ts",
          "src/lib/site.ts",
          "src/lib/routes.ts"
        ],
        "invariant": "Public crawl metadata does not disclose protected paths or rely on obscurity for access control",
        "method": "source",
        "result": "robots.ts:13 disallows only /dashboard/ and /insights/ and deliberately omits the admin path; sitemap.ts:8 lists only the root. The admin path is in the client bundle via ROUTES (routes.ts:16) and is documented as obscurity only (routes.ts:4-8); real enforcement is RLS/RPC (peer units). No finding.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "public/_headers",
          ".github/workflows/ci.yml"
        ],
        "invariant": "Edge header application is verified for the deployed environment",
        "method": "source",
        "result": "Whether Cloudflare applies _headers is a deployment fact, not decisive for any boundary because the app has no server-side authority. CI verifies it after each deploy (ci.yml:106-112) by requiring CSP, HSTS, nosniff, XFO and Referrer-Policy on `/` and failing the job otherwise. It checks only `/`, not /time/*; noted as hardening.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "repository%23committed%20source%20and%20config%20files::.gitignore%23secret%20exclusion::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Cryptography%20and%20secrets",
    "canonical_refs": {
      "surface": "repository#committed source and config files",
      "boundary": ".gitignore#secret exclusion",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Cryptography and secrets"
    },
    "surface": "committed source and config files (repository)",
    "boundary": "secret exclusion (.gitignore)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Cryptography and secrets",
    "starting_paths": [
      "supabase/setup.sql",
      "src/lib/userSql.ts",
      ".gitignore",
      ".env.example",
      "src/lib/supabaseClient.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Cryptography and secrets",
    "selected_companion_blocks": [],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "candidate",
    "agent_id": "hunter-repo",
    "reviewed_paths": [
      ".env.example",
      ".gitignore",
      "README.md",
      "src/components/AddUserForm.tsx",
      "src/lib/supabaseClient.ts",
      "src/lib/userSql.ts",
      "supabase/functions/admin-create-user/index.ts",
      "supabase/setup.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "supabase/setup.sql",
          ".gitignore",
          "README.md"
        ],
        "invariant": "No working privileged credential is committed in plaintext to tracked files",
        "method": "source",
        "result": "supabase/setup.sql (not excluded by .gitignore) hardcodes the bootstrap admin email and password (setup.sql:12-13,132,139-140,200), bcrypt-hashes that password into auth.users with app_metadata.role='admin' (setup.sql:161-162), and on re-run resets the existing admin's password to the committed value and re-asserts role admin (setup.sql:180-185,196). README.md:374-378 tells operators to run it and only advises editing the credentials first; the committed values are a real address and a weak 10-char lowercase+digit password. Proposed needs_validation: repository visibility and whether production still accepts that password are not source-visible. Owner states it is intentional.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "src/lib/userSql.ts",
          "src/components/AddUserForm.tsx"
        ],
        "invariant": "Security-critical random values (temporary passwords) come from a CSPRNG with full entropy",
        "method": "source",
        "result": "generateTempPassword (userSql.ts:91-99) uses Math.random over a 56-char alphabet and overwrites the last 3 chars with the constant 'A9z' (userSql.ts:98), leaving 9 random chars (~52 bits). Used by AddUserForm.tsx:35,91,195. Predicting it requires V8 PRNG state from the admin's own tab; no such exposure is visible. Hardening, not a finding.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "src/lib/supabaseClient.ts",
          ".env.example",
          ".gitignore",
          "supabase/functions/admin-create-user/index.ts"
        ],
        "invariant": "Only public (anon) keys reach the browser bundle; service-role keys and local env files stay out of VCS and client code",
        "method": "source",
        "result": "supabaseClient.ts:12-13,21 uses only NEXT_PUBLIC_SUPABASE_URL/ANON_KEY. The service-role key is read only from Deno.env in the edge function (index.ts:12), never from src/. .env.example:7,10 holds placeholders and warns against service-role use (12-14). .gitignore:26-28 excludes .env, .env*.local and .env.local. The local .env.local holds only the two NEXT_PUBLIC_* names (values not captured). A grep of local out/ and .next/static found no service-role or bootstrap password strings.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "src/lib/userSql.ts"
        ],
        "invariant": "SQL text generation for credentials escapes all interpolations",
        "method": "source",
        "result": "buildCreateUserSql (userSql.ts:24-88) escapes values placed in literals, but the unescaped trimmed email goes into a `--` comment line (userSql.ts:30), so a newline would break out of the comment. It is imported only by __tests__/lib/userSql.test.ts; no src/ caller exists, so it is dead code with no reachable sink. Hardening.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "supabase/setup.sql:bootstrap-admin-hardcoded-password"
    ],
    "unresolved": []
  },
  {
    "coverage_id": "repository%23committed%20source%20and%20config%20files::.gitignore%23secret%20exclusion::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Obvious%20things",
    "canonical_refs": {
      "surface": "repository#committed source and config files",
      "boundary": ".gitignore#secret exclusion",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Obvious things"
    },
    "surface": "committed source and config files (repository)",
    "boundary": "secret exclusion (.gitignore)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Obvious things",
    "starting_paths": [
      ".gitignore",
      "package.json",
      "package-lock.json",
      "public/_headers",
      "next.config.mjs",
      "src",
      "supabase"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Obvious things",
    "selected_companion_blocks": [],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "candidate",
    "agent_id": "hunter-repo",
    "reviewed_paths": [
      ".gitignore",
      "next.config.mjs",
      "package-lock.json",
      "package.json",
      "public/_headers",
      "scripts/seo-check.mjs",
      "src/app/page.tsx",
      "src/components/RequireAuth.tsx",
      "src/lib/auth.ts",
      "src/lib/site.ts",
      "supabase/setup.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "supabase/setup.sql",
          "src/lib/auth.ts"
        ],
        "invariant": "No seed/bootstrap credentials committed in source that work against production",
        "method": "source",
        "result": "A grep for password/secret/apikey/token/Bearer/BEGIN across src, supabase, scripts, __tests__ and public found one hardcoded credential: the setup.sql bootstrap admin (setup.sql:13,132,140,200), usable through the public sign-in path (auth.ts:38 signInWithPassword). Same root cause as the Cryptography and secrets unit; consolidated under one fingerprint.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "src/app/page.tsx",
          "src/components/RequireAuth.tsx",
          "src/lib/site.ts",
          "next.config.mjs",
          "scripts/seo-check.mjs"
        ],
        "invariant": "No security TODOs, env/query-gated debug modes, dynamic code execution, or open redirects",
        "method": "source",
        "result": "No TODO/FIXME/HACK/XXX in src/; no NODE_ENV or debug switches (only NEXT_PUBLIC_* reads at site.ts:7 and supabaseClient.ts:12-13); no eval, new Function, child_process or dynamic import. Redirects are router.replace to constants only (page.tsx:18, RequireAuth.tsx:16,18), with no redirect/next/url parameter. Static export (next.config.mjs:4) exposes no /debug, /health, /env or /config endpoints. scripts/seo-check.mjs is build-time only with constant regex keys.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          "public/_headers",
          "src/lib/auth.ts"
        ],
        "invariant": "CORS, cookie, TLS and error-disclosure basics",
        "method": "source",
        "result": "No Access-Control-Allow-* headers are emitted by the static host config (_headers). The app sets no cookies (session in browser storage, peer-owned). TLS is enforced via HSTS preload and upgrade-insecure-requests (_headers:6-7). Errors show GoTrue/PostgREST error.message to the acting user only (auth.ts:39), with no stack traces or server paths.",
        "artifact": null
      },
      {
        "agent_id": "hunter-repo",
        "reviewed_paths": [
          ".gitignore",
          "package.json",
          "package-lock.json"
        ],
        "invariant": "Secret/local files are ignored and dependencies are pinned without reachable known-vulnerable code",
        "method": "source",
        "result": ".gitignore covers .env*, *.pem, /coverage, /.next, /out, /Ideas and /.audit/security-audit/, but not *.key, /.wrangler/ or /.swc/; local .wrangler/ holds only empty state/tmp dirs (hardening). Dependencies are lockfile-pinned with integrity hashes. next 15.1.0 / react 19.0.0 have published advisories in server-only features (middleware authorization bypass, RSC server functions); output: 'export' ships no Next/RSC server, so none is reachable at runtime. Hardening: upgrade.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "supabase/setup.sql:bootstrap-admin-hardcoded-password"
    ],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fapp%2Ftime%2FPortal%2FadmIn%2Fpage.tsx%23render%20other-user%20display_name%20note%20email::src%2Fcomponents%2FAdminReviewTable.tsx%23React%20JSX%20text%20rendering::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Injection",
    "canonical_refs": {
      "surface": "src/app/time/Portal/admIn/page.tsx#render other-user display_name note email",
      "boundary": "src/components/AdminReviewTable.tsx#React JSX text rendering",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Injection"
    },
    "surface": "render other-user display_name note email (src/app/time/Portal/admIn/page.tsx)",
    "boundary": "React JSX text rendering (src/components/AdminReviewTable.tsx)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Injection",
    "starting_paths": [
      "src/app/time/Portal/admIn/page.tsx",
      "src/components/AdminReviewTable.tsx",
      "src/components/MembersPanel.tsx",
      "src/components/AwardBanner.tsx",
      "src/components/CommandSearch.tsx",
      "public/_headers"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Injection",
    "selected_companion_blocks": [
      "CLIENT-SIDE.md#DOM-based XSS",
      "CLIENT-SIDE.md#Clickjacking",
      "CLIENT-SIDE.md#Core discipline",
      "CLIENT-SIDE.md#Universal moves",
      "CLIENT-SIDE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "CLIENT-SIDE.md#`postMessage` origin and source trust",
        "reason": "No postMessage/message listeners in src/."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "candidate",
    "agent_id": "hunter-client",
    "reviewed_paths": [
      "public/_headers",
      "src/app/layout.tsx",
      "src/app/time/Portal/admIn/page.tsx",
      "src/components/AdminReviewTable.tsx",
      "src/components/AwardBanner.tsx",
      "src/components/CommandSearch.tsx",
      "src/components/MembersPanel.tsx",
      "src/components/Nav.tsx",
      "src/lib/adminFilter.ts",
      "src/lib/auth.ts",
      "src/lib/awards.ts",
      "src/lib/entries.ts",
      "supabase/admin-create-user.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-client",
        "reviewed_paths": [
          "src/app/time/Portal/admIn/page.tsx",
          "src/components/AdminReviewTable.tsx",
          "src/components/MembersPanel.tsx",
          "src/components/AwardBanner.tsx",
          "src/components/CommandSearch.tsx",
          "src/components/Nav.tsx",
          "src/lib/adminFilter.ts",
          "src/app/layout.tsx"
        ],
        "invariant": "Other-user controlled strings (display_name, note, email, error messages) reach the DOM only through React-escaped JSX text or attribute values; no HTML/URL/script sink.",
        "method": "source",
        "result": "Grep of src/ for dangerouslySetInnerHTML, innerHTML, outerHTML, document.write, eval, new Function, dynamic href/src, location assignment, postMessage, storage reads found none. display_name/email render as JSX text at AdminReviewTable.tsx:34, MembersPanel.tsx:47-48, AwardBanner.tsx:26, page.tsx:132; notes at AdminReviewTable.tsx:37 and CommandSearch.tsx:54 (text) and key={s} at CommandSearch.tsx:51; aria-label template strings (MembersPanel.tsx:62, AdminReviewTable.tsx:47,55) are attribute values escaped by React. Only Link hrefs are constants (Nav.tsx:29 ROUTES.admin). adminFilter.ts uses String.includes (no regex built from input). No HTML/script injection path; no CSV/export sink exists.",
        "artifact": null
      },
      {
        "agent_id": "hunter-client",
        "reviewed_paths": [
          "public/_headers",
          "src/components/AdminReviewTable.tsx",
          "src/components/MembersPanel.tsx"
        ],
        "invariant": "State-changing admin actions (approve/reject, resend, create user) cannot be completed inside a cross-origin frame.",
        "method": "source",
        "result": "public/_headers:7 sets frame-ancestors 'none' and line 9 X-Frame-Options: DENY for /*. Whether the edge actually applies the file is owned by the peer CLOUD-AND-DEPLOYMENT unit; source shows the control present, so no clickjacking candidate.",
        "artifact": null
      },
      {
        "agent_id": "hunter-client",
        "reviewed_paths": [
          "supabase/admin-create-user.sql",
          "src/lib/auth.ts",
          "src/app/time/Portal/admIn/page.tsx",
          "src/lib/awards.ts",
          "src/components/AdminReviewTable.tsx",
          "src/components/AwardBanner.tsx",
          "src/lib/entries.ts"
        ],
        "invariant": "The identity label an admin sees for another user's entries, leaderboard rank and monthly award is bound to an admin-controlled or unique attribute, not a string the subject member can freely set.",
        "method": "source",
        "result": "admin_list_users returns raw_user_meta_data->>'display_name' (supabase/admin-create-user.sql:126), which the account owner can rewrite via GoTrue user update. auth.ts:126 maps it; page.tsx:61 nameFor prefers it over email; AdminReviewTable.tsx:34 shows only that label in the Member column; page.tsx:66 feeds it to awards.ts:41/67, rendered at AwardBanner.tsx:26 and page.tsx:132. No uniqueness or admin binding. Proposed as needs_validation candidate (display-name spoofing); cannot render locally (no sandbox) and GoTrue metadata-update acceptance is a deployment fact.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "user-metadata-display-name/admin-console-identity-spoofing"
    ],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fcomponents%2FAddUserForm.tsx%23email%20verification%20dns.google%20lookup::src%2Flib%2FemailCheck.ts%23verifyEmail::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "src/components/AddUserForm.tsx#email verification dns.google lookup",
      "boundary": "src/lib/emailCheck.ts#verifyEmail",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "email verification dns.google lookup (src/components/AddUserForm.tsx)",
    "boundary": "verifyEmail (src/lib/emailCheck.ts)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Feature abuse and data leakage",
    "starting_paths": [
      "src/lib/emailCheck.ts",
      "src/components/AddUserForm.tsx",
      "src/components/MembersPanel.tsx",
      "src/lib/auth.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "CLIENT-SIDE.md#Credentialed CORS trust",
        "reason": "dns.google fetch sends no credentials and only the domain."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter-client",
    "reviewed_paths": [
      "public/_headers",
      "src/components/AddUserForm.tsx",
      "src/components/MembersPanel.tsx",
      "src/lib/auth.ts",
      "src/lib/emailCheck.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-client",
        "reviewed_paths": [
          "src/lib/emailCheck.ts",
          "public/_headers"
        ],
        "invariant": "The DoH lookup discloses only the domain, uses a fixed destination, and cannot be steered to another host or carry credentials.",
        "method": "source",
        "result": "dohQuery (emailCheck.ts:123-127) builds a fixed https://dns.google/resolve URL with encodeURIComponent(domain) and a literal type; domain is only produced after validateEmailFormat LABEL_RE/TLD checks (emailCheck.ts:59-82, 167). Default fetchFn (line 135) passes only signal, no credentials/headers. No local part or token is sent; connect-src allows only dns.google besides Supabase (_headers:7). Domain disclosure to Google is documented design (emailCheck.ts:10); no finding.",
        "artifact": null
      },
      {
        "agent_id": "hunter-client",
        "reviewed_paths": [
          "src/components/AddUserForm.tsx",
          "src/lib/emailCheck.ts",
          "src/lib/auth.ts"
        ],
        "invariant": "Client email verification is not relied on as the security boundary, and its results/reasons cannot inject content or bypass server validation for a lower-privilege principal.",
        "method": "source",
        "result": "AddUserForm re-runs verify on submit (AddUserForm.tsx:67) and sends result.email (72-73) to admin_create_user RPC, which performs its own admin check and validation server-side (auth.ts:78-92; RPC owned by peer unit). Only admins reach this form (RequireAuth adminOnly, page.tsx:152), so bypassing the client check is a same-principal action. verdict.reason/suggestion render as JSX text (AddUserForm.tsx:134,137,151). 'unknown' DNS results allow creation by design. No enumeration oracle to a lower-privilege principal: verification is local + public DNS only.",
        "artifact": null
      },
      {
        "agent_id": "hunter-client",
        "reviewed_paths": [
          "src/components/MembersPanel.tsx",
          "src/lib/auth.ts"
        ],
        "invariant": "Resend-confirmation feature cannot be used by a lower-privilege principal to learn account state or abuse mail beyond what GoTrue already exposes publicly.",
        "method": "source",
        "result": "sendConfirmationEmail (auth.ts:100-104) calls the public GoTrue resend API with the anon client; the admin UI adds no extra capability beyond the public endpoint, and member/confirmation state is only listed via admin_list_users (admin-gated). GoTrue rate limiting / enumeration behaviour of resend is platform behaviour outside this repo; noted as hardening, not a finding.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Flib%2Fauth.ts%23auth.updateUser%20user_metadata.display_name::supabase%2Fadmin-create-user.sql%23admin_list_users%20display_name::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/lib/auth.ts#auth.updateUser user_metadata.display_name",
      "boundary": "supabase/admin-create-user.sql#admin_list_users display_name",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "auth.updateUser user_metadata.display_name (src/lib/auth.ts)",
    "boundary": "admin_list_users display_name label (supabase/admin-create-user.sql)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Business logic",
    "starting_paths": [
      "supabase/admin-create-user.sql",
      "src/app/time/Portal/admIn/page.tsx",
      "src/lib/auth.ts",
      "src/components/AdminReviewTable.tsx"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [],
    "excluded_blocks": [
      {
        "block": "CLIENT-SIDE.md#DOM-based XSS",
        "reason": "Rendering is JSX-escaped; reviewed under the Injection unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "deferred",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [
      "quick_profile_single_wave: surfaced by hunter-data as uncovered; its root cause is already candidate user-metadata-display-name/admin-console-identity-spoofing from the Injection unit, so no second wave was launched."
    ]
  },
  {
    "coverage_id": "src%2Flib%2Fentries.ts%23time_entries%20PostgREST%20insert%2Fupdate%2Fselect::supabase%2Fschema.sql%23enforce_status_rules::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/lib/entries.ts#time_entries PostgREST insert/update/select",
      "boundary": "supabase/schema.sql#enforce_status_rules",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "time_entries PostgREST insert/update/select (src/lib/entries.ts)",
    "boundary": "enforce_status_rules (supabase/schema.sql)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Business logic",
    "starting_paths": [
      "supabase/schema.sql",
      "supabase/setup.sql",
      "src/lib/entries.ts",
      "src/lib/awards.ts",
      "src/lib/insights.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Policy and query disagreement",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Soft-delete and tombstone bypass",
        "reason": "No soft-delete; deletes are hard and admin-only."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "candidate",
    "agent_id": "hunter-data",
    "reviewed_paths": [
      "src/app/dashboard/page.tsx",
      "src/app/time/Portal/admIn/page.tsx",
      "src/lib/awards.ts",
      "src/lib/entries.ts",
      "src/lib/insights.ts",
      "src/lib/time.ts",
      "supabase/schema.sql",
      "supabase/setup.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/schema.sql",
          "supabase/setup.sql",
          "src/lib/entries.ts"
        ],
        "invariant": "A member cannot create a time_entries row in a reviewed (approved) state without an admin transition",
        "method": "source",
        "result": "enforce_status_rules is attached only as BEFORE UPDATE (schema.sql:86-88, setup.sql:100-103); the INSERT policy checks only user_id = auth.uid() (schema.sql:53-54, setup.sql:72-73). No INSERT trigger, CHECK constraint or column restriction on status exists in any SQL file, so a member-supplied status='approved' on INSERT is not rejected by any source-visible control. The client itself sends status explicitly (entries.ts:41). Candidate raised; column grants and applied-SQL are deployment facts.",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/schema.sql",
          "supabase/setup.sql",
          "src/lib/entries.ts"
        ],
        "invariant": "Once an entry is approved, its member owner cannot change the reviewed quantities (duration_seconds, started_at, ended_at)",
        "method": "source",
        "result": "The member UPDATE policy has no column restriction (schema.sql:58-60, setup.sql:76-77) and the trigger compares only status (schema.sql:78, setup.sql:93). The client already writes duration_seconds computed in the browser (entries.ts:53-56). A member can therefore rewrite duration/timestamps on an approved row while status stays 'approved'. Candidate raised.",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "src/lib/awards.ts",
          "src/lib/insights.ts",
          "src/lib/time.ts",
          "src/app/time/Portal/admIn/page.tsx",
          "src/app/dashboard/page.tsx"
        ],
        "invariant": "Award/leaderboard derives only from admin-reviewed, bounded durations",
        "method": "source",
        "result": "computeMonthlyAward and monthlyLeaderboard sum stored duration_seconds of rows with status 'approved' and endedAt, bucketed by started_at month (awards.ts:18-23,54-58); normalizeSeconds only clamps negatives/NaN (time.ts:6-9), so any positive integer up to the Postgres integer max (2147483647) counts. The admin console computes the award from listAllEntries (admIn/page.tsx:32,74-75). The derived award trusts row data written by the member paths above.",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/schema.sql",
          "src/lib/entries.ts"
        ],
        "invariant": "Status transitions by members (pending->approved, rejected->approved) are blocked on UPDATE",
        "method": "source",
        "result": "Held: the BEFORE UPDATE trigger raises when not is_admin() and new.status is distinct from old.status (schema.sql:78-80). reviewEntry (entries.ts:85) relies on this plus the admin UPDATE policy (schema.sql:64-65).",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "supabase/schema.sql:time_entries:insert-status-unguarded",
      "supabase/schema.sql:time_entries:approved-row-quantities-mutable"
    ],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Flib%2Fentries.ts%23time_entries%20PostgREST%20insert%2Fupdate%2Fselect::supabase%2Fschema.sql%23time_entries%20RLS%20policies::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/lib/entries.ts#time_entries PostgREST insert/update/select",
      "boundary": "supabase/schema.sql#time_entries RLS policies",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "time_entries PostgREST insert/update/select (src/lib/entries.ts)",
    "boundary": "time_entries RLS policies (supabase/schema.sql)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Access control",
    "starting_paths": [
      "supabase/schema.sql",
      "supabase/setup.sql",
      "src/lib/entries.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Missing tenant or owner enforcement",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Policy and query disagreement",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Export and backup scope expansion",
        "reason": "No export/backup feature exists in source."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "candidate",
    "agent_id": "hunter-data",
    "reviewed_paths": [
      "src/lib/entries.ts",
      "supabase/schema.sql",
      "supabase/setup.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/schema.sql",
          "supabase/setup.sql"
        ],
        "invariant": "Members cannot read, update or delete other members' time_entries rows",
        "method": "source",
        "result": "Held: SELECT using (user_id = auth.uid() or is_admin()) (schema.sql:48-49); member UPDATE using and with check user_id = auth.uid() (schema.sql:58-60) prevents both targeting and reassigning another user's row; DELETE admin-only (schema.sql:69-70); RLS enabled (schema.sql:44). setup.sql:65-85 is identical. listMyEntries' .eq('user_id') filter (entries.ts:69) is not relied upon; listAllEntries (entries.ts:78) relies on RLS, which returns only own rows to members.",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/schema.sql",
          "supabase/setup.sql",
          "src/lib/entries.ts"
        ],
        "invariant": "RLS write policies bind the review-controlled columns (status, duration) for member writes",
        "method": "source",
        "result": "Not held: INSERT with check and member UPDATE with check constrain only user_id (schema.sql:54,60); status/duration/timestamps are unconstrained on INSERT and duration/timestamps on UPDATE. Same root causes as the business-logic unit candidates.",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/setup.sql",
          "src/lib/entries.ts"
        ],
        "invariant": "Alternate read path (Realtime publication) does not widen access",
        "method": "source",
        "result": "setup.sql:110-127 adds time_entries to supabase_realtime with replica identity full, but no client code subscribes (no channel/postgres_changes in src/). Realtime enforces RLS for authenticated postgres_changes by provider design; not decisive for this unit, recorded as hardening.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "supabase/schema.sql:time_entries:insert-status-unguarded",
      "supabase/schema.sql:time_entries:approved-row-quantities-mutable"
    ],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Flib%2FsupabaseClient.ts%23persistSession%20browser%20storage::src%2Fcomponents%2FRequireAuth.tsx%23client%20route%20gate::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": "src/lib/supabaseClient.ts#persistSession browser storage",
      "boundary": "src/components/RequireAuth.tsx#client route gate",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "persistSession browser storage (src/lib/supabaseClient.ts)",
    "boundary": "client route gate (src/components/RequireAuth.tsx)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      "src/lib/supabaseClient.ts",
      "src/lib/jwt.ts",
      "src/components/RequireAuth.tsx",
      "src/context/AuthContext.tsx",
      "src/lib/routes.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "CLIENT-SIDE.md#Browser-storage disclosure and stale authorization",
      "CLIENT-SIDE.md#Core discipline",
      "CLIENT-SIDE.md#Universal moves",
      "CLIENT-SIDE.md#Validation rules",
      "WEB-PROTOCOL-AND-AUTH.md#Session fixation and invalidation",
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "CLIENT-SIDE.md#Service-worker registration and scope takeover",
        "reason": "No service worker registered."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter-client",
    "reviewed_paths": [
      "package-lock.json",
      "src/app/time/Portal/admIn/page.tsx",
      "src/components/Nav.tsx",
      "src/components/RequireAuth.tsx",
      "src/context/AuthContext.tsx",
      "src/lib/auth.ts",
      "src/lib/jwt.ts",
      "src/lib/routes.ts",
      "src/lib/supabaseClient.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-client",
        "reviewed_paths": [
          "src/components/RequireAuth.tsx",
          "src/lib/jwt.ts",
          "src/lib/auth.ts",
          "src/lib/routes.ts",
          "src/app/time/Portal/admIn/page.tsx"
        ],
        "invariant": "No privileged data or action depends solely on the client route gate or on unverified JWT claims.",
        "method": "source",
        "result": "RequireAuth (RequireAuth.tsx:13-30) and inspectJwt (jwt.ts:38-75, no signature check) only drive UI; routes.ts:4-7 states obscurity is not the control. Every admin datum/action on the page goes through Supabase calls (listAllEntries, reviewEntry, admin_list_users, admin_create_user) that are enforced server-side by RLS/is_admin() (peer-owned units). A member forging localStorage claims only unhides the static admin shell; data calls still carry the real signed JWT. No chained gap from the client gate.",
        "artifact": null
      },
      {
        "agent_id": "hunter-client",
        "reviewed_paths": [
          "src/lib/supabaseClient.ts",
          "src/context/AuthContext.tsx",
          "src/components/Nav.tsx",
          "package-lock.json"
        ],
        "invariant": "Session tokens in browser storage are not readable by a less-trusted same-origin component and are cleared/revoked on logout and account switch; no session fixation via URL.",
        "method": "source",
        "result": "createClient uses persistSession:true (localStorage), autoRefreshToken, detectSessionInUrl:false (supabaseClient.ts:21-27), so no session can be planted via URL fragment. No XSS sink, no third-party script, no service worker, and no other same-origin writer/reader of storage was found (layout.tsx has no external scripts; next/font self-hosts). signOut calls supabase.auth.signOut() (auth.ts:46-50; auth-js 2.109.0 per package-lock.json:3063, default global scope revoking refresh tokens) and AuthContext clears user state on SIGNED_OUT (AuthContext.tsx:37-44). Account switch re-derives user from the new session. Token-in-storage alone has no less-trusted reader, so no finding.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "supabase%2Fadmin-create-user.sql%23admin_create_user%20and%20admin_list_users%20RPC::supabase%2Fschema.sql%23is_admin::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "supabase/admin-create-user.sql#admin_create_user and admin_list_users RPC",
      "boundary": "supabase/schema.sql#is_admin",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "admin_create_user and admin_list_users RPC (supabase/admin-create-user.sql)",
    "boundary": "is_admin (supabase/schema.sql)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Access control",
    "starting_paths": [
      "supabase/admin-create-user.sql",
      "supabase/schema.sql",
      "src/lib/auth.ts",
      "src/components/AddUserForm.tsx"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#JWT verification and claim binding",
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "WEB-PROTOCOL-AND-AUTH.md#OAuth/OIDC request and callback binding",
        "reason": "No OAuth/OIDC flow; password auth only."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter-data",
    "reviewed_paths": [
      "src/lib/auth.ts",
      "supabase/admin-create-user.sql",
      "supabase/schema.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/admin-create-user.sql",
          "supabase/schema.sql"
        ],
        "invariant": "admin_create_user refuses non-admin callers before any write",
        "method": "source",
        "result": "Held: first statement is `if not public.is_admin() then raise` (admin-create-user.sql:38-40); variable initializers (33-36) perform no writes. EXECUTE revoked from public/anon and granted to authenticated (98-99). is_admin() reads auth.jwt()->app_metadata->>role (schema.sql:37-40), which PostgREST populates only after verifying the JWT signature; app_metadata is not user-writable via GoTrue updateUser.",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/admin-create-user.sql",
          "src/lib/auth.ts"
        ],
        "invariant": "Caller-supplied role/confirmation fields cannot escape intended values",
        "method": "source",
        "result": "Held: p_role coerced to 'admin' or 'member' (admin-create-user.sql:34); only an already-verified admin reaches the insert, and admin creating admins is intended. Email regex/length/disposable checks and duplicate check run server-side (43-65); password is bcrypt-hashed (77). src/lib/auth.ts:80-86 passes values straight through, which is fine because the server enforces.",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/admin-create-user.sql"
        ],
        "invariant": "admin_list_users discloses auth.users only to admins",
        "method": "source",
        "result": "Held: is_admin() check before the query (admin-create-user.sql:119-121); revoke from public/anon, grant authenticated (135-136). Returned columns are limited to id, email, display_name, role, confirmation flag, created_at (124-129); no password hashes or tokens.",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/admin-create-user.sql"
        ],
        "invariant": "SECURITY DEFINER functions cannot be hijacked through search_path by lower-trust callers",
        "method": "source",
        "result": "search_path is pinned (admin-create-user.sql:30,116) but lists public before extensions, so unqualified crypt/gen_salt/gen_random_uuid (36,77,89) would resolve to a public-schema shadow if one existed. Creating such a function requires DDL, which members cannot issue via PostgREST; no member path to plant it. Recorded as hardening, not a finding.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "supabase%2Ffunctions%2Fadmin-create-user%2Findex.ts%23POST::supabase%2Ffunctions%2Fadmin-create-user%2Findex.ts%23getUser%20app_metadata.role%20check::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "supabase/functions/admin-create-user/index.ts#POST",
      "boundary": "supabase/functions/admin-create-user/index.ts#getUser app_metadata.role check",
      "subsystem": "profile/quick/all-in-scope-subsystems",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "POST (supabase/functions/admin-create-user/index.ts)",
    "boundary": "getUser app_metadata.role check (supabase/functions/admin-create-user/index.ts)",
    "subsystem": "All in-scope subsystems (quick profile)",
    "attack_class": "Access control",
    "starting_paths": [
      "supabase/functions/admin-create-user/index.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#JWT verification and claim binding",
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "MEMORY-SAFETY-AND-BINARY.md#Core discipline",
        "reason": "No native, unsafe or binary code in scope (TypeScript/SQL only)."
      },
      {
        "block": "AI-AND-LLM.md#Core discipline",
        "reason": "No model, prompt assembly or tool-calling agent in the product."
      },
      {
        "block": "WEB-PROTOCOL-AND-AUTH.md#Ordinary CSRF",
        "reason": "Function authenticates by bearer header, not cookies."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter-data",
    "reviewed_paths": [
      "supabase/functions/admin-create-user/index.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/functions/admin-create-user/index.ts"
        ],
        "invariant": "Only a GoTrue-verified admin can reach the service-role invite",
        "method": "source",
        "result": "Held: the bearer token is verified server-side by caller.auth.getUser() against GoTrue (index.ts:24-30), and role comes from the returned user record's app_metadata (31-34), not from an unverified decode. A missing or garbage Authorization header yields userErr -> 401. The service-role client is created only after both checks (47).",
        "artifact": null
      },
      {
        "agent_id": "hunter-data",
        "reviewed_paths": [
          "supabase/functions/admin-create-user/index.ts"
        ],
        "invariant": "Request body cannot set privileged attributes on the invited user",
        "method": "source",
        "result": "Held: body.role is parsed but never used (36, 48-50); only display_name goes into user metadata, so invitees get no app_metadata role (member by default). Nothing in src/ calls this function.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  }
]
```

## Current candidate fingerprints (all pending independent validation)

- supabase/schema.sql:time_entries:insert-status-unguarded
- supabase/schema.sql:time_entries:approved-row-quantities-mutable
- user-metadata-display-name/admin-console-identity-spoofing
- supabase/setup.sql:bootstrap-admin-hardcoded-password

## Prior-ledger gap summary

No prior ledger exists (first run).

Return exactly the JSON object described above and nothing else.
