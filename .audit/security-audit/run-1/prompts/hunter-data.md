Your goal is to find source-grounded security invariant failures in your assigned coverage units of the Time Portal repository at C:/Users/Zubair Hussain/Desktop/Time-Portal. You must return exactly one JSON object matching the structured-result contract at the end of this prompt.

## architecture.md (verbatim)

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


## Assigned coverage units (from coverage-ledger.json)

[
  {
    "coverage_id": "src%2Flib%2Fentries.ts%23time_entries%20PostgREST%20insert%2Fupdate%2Fselect::supabase%2Fschema.sql%23enforce_status_rules::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Business%20logic",
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
    ]
  },
  {
    "coverage_id": "src%2Flib%2Fentries.ts%23time_entries%20PostgREST%20insert%2Fupdate%2Fselect::supabase%2Fschema.sql%23time_entries%20RLS%20policies::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control",
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
    ]
  },
  {
    "coverage_id": "supabase%2Fadmin-create-user.sql%23admin_create_user%20and%20admin_list_users%20RPC::supabase%2Fschema.sql%23is_admin::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control",
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
    ]
  },
  {
    "coverage_id": "supabase%2Ffunctions%2Fadmin-create-user%2Findex.ts%23POST::supabase%2Ffunctions%2Fadmin-create-user%2Findex.ts%23getUser%20app_metadata.role%20check::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control",
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
    ]
  }
]

## Selected attack-class and companion blocks (verbatim)

### ATTACK-CLASSES.md#Business logic

**Business logic** (subagent_type: `general`)
Hunt logic errors by hand: standard scanners cannot find them, and they yield high-impact findings. For each major workflow:
- **State machine violations**: Can you skip steps? Go backwards? Reach an invalid state? What happens if you replay a completed flow? What about partial failure — if step 2 of 3 fails, is step 1 rolled back?
- **Race conditions with business impact**: Concurrent operations that produce invalid states (double-spend, double-approve, lost updates). Focus on operations that check-then-act non-atomically.
- **Numeric/quantity manipulation**: Negative values, zero values, overflow, precision loss, type coercion between string and number.
- **Access boundary violations**: Not "does the permission check exist" but "is it the right check for the business rule?" Can input to one operation bypass a restriction enforced on a different operation for the same effect?
- **Implicit trust assumptions**: Data from storage, config, other components, or plugins assumed safe because "we validated it on the way in." What if a different code path wrote it?
- **Time-based logic**: Expiry checks, scheduling, rate windows, clock skew. What happens at exact boundary moments? What about timezone differences between components?
- **Default and fallback behavior**: What is the security posture when config is missing? When a feature flag is off? When a dependency is unavailable? When the system is mid-migration?

### DATA-ISOLATION-AND-LIFECYCLE.md#Policy and query disagreement

**Policy and query disagreement**
Row-level policy, ORM default scopes, authorization filters, and raw/bypass clients apply different predicates. Check joins, aggregates, aliases, views, transactions, `unscoped` or service clients, and error paths where context is missing.

### DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline

## Core discipline (include in every agent prompt for this domain)

```
- A tenant or owner field on a record is not isolation. Find the query, key, path, policy, or row-level control that enforces it for each read and write path.
- Trace derived copies. Sanitized primary data can become unsafe in search, cache, analytics, export, previews, logs, replicas, and backups with different ACL and retention rules.
- Deletion and revocation are lifecycle contracts. Check current, historical, cached, indexed, exported, restored, and queued copies within the product's stated boundary.
- Privacy or retention preference is not automatically a security vulnerability. Require an explicit data-access boundary or deletion/revocation guarantee and an unauthorized reader or later operation.
- Use `confirmed` for complete source-visible lineage and bounded dummy-tenant tests. Use `needs_validation` when external storage policy, retention, CDN behavior, replica lag, or backup access is unavailable.
```

### DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves

## Universal moves (apply across the above)

- Pick one protected record and draw primary write, query, cache, index, event, export, backup, deletion, and restore paths. Mark principal and tenant at every edge.
- Compare two dummy tenants through the same local service methods, then repeat after ACL change, deletion, account switch, and restore. Do not use real user data.
- Start at bypass clients, background jobs, migrations, global uniqueness, and cache keys. These paths commonly omit request-scoped identity that interactive endpoints carry.

### DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules

## Validation rules (apply before reporting ANY finding here)

1. Name attacker or lower-trust principal, protected data/state, affected owner/tenant, alternate copy or operation, and unauthorized disclosure or mutation.
2. Cite both intended source-of-truth policy and the path that omits or disagrees with it. Confirm another layer does not enforce the same tenant/lifecycle condition.
3. Use local dummy tenants and non-sensitive fixtures to prove cross-scope access or stale lifecycle behavior. Stop at the minimum observable record or operation.
4. If external cache, object storage, replicas, analytics, backup, or retention policy is required, classify `needs_validation` and state the owner-observed check.
5. Return `confirmed` only with complete lineage and concrete boundary impact. Return `needs_validation` with the exact unresolved storage, ACL, invalidation, retention, or restore fact.

### ATTACK-CLASSES.md#Access control

**Access control** (subagent_type: `general`)
Verify that a caller cannot do something outside its authority. Go beyond checking whether permission checks exist — verify they check the *right* permission for the *right* resource via the *right* mechanism:
- Is there a path to the same state change that checks a different (weaker) permission?
- Can a field in the request body override what the permission system intended to restrict?
- Are there endpoints that gate on authentication but forget authorization?
- Does the same resource have multiple access paths with inconsistent checks?
- What about bulk/batch/export/import operations — do they enforce per-item permissions?

For complex access models, split into separate agents for auth bypass vs authorization logic.

### DATA-ISOLATION-AND-LIFECYCLE.md#Missing tenant or owner enforcement

**Missing tenant or owner enforcement**
A read, update, delete, list, count, or bulk query identifies an object without binding it to the authenticated tenant/owner, or trusts body fields to supply that identity. Compare direct lookup, nested relationship, background, admin, import, and legacy paths.

### WEB-PROTOCOL-AND-AUTH.md#JWT verification and claim binding

**JWT verification and claim binding**
Check signature verification, server-pinned algorithm and key source, then `exp`, `nbf`, `aud`, and `iss`. Review `kid`, `jku`, and `x5u` as untrusted key selectors, duplicate/header normalization, and decode-without-verify paths. A valid token for another service is invalid here even when signed by a trusted issuer.

### WEB-PROTOCOL-AND-AUTH.md#Core discipline

## Core discipline (include in every agent prompt for this domain)

```
- Framing and cache findings require two interpretations of the same request, response, or key. Name both components and the exact normalized value on each side.
- For every credential, find the signature or secret verification and every binding required for its role: issuer, audience, origin, RP, client, session, principal, resource, assurance, expiry, and one-time state.
- Host, Forwarded, X-Forwarded-*, Origin, Referer, redirect targets, callback state, and request-derived URLs are trust decisions. Trace each to the affected identity or response.
- A missing header, cookie attribute, MFA prompt, or rate limit is not a finding alone. Require an accepted invalid request, cross-principal impact, assurance downgrade, or credential disclosure.
- Classify `confirmed` only from complete source evidence and bounded local request/token tests. Use `needs_validation` when proxy, IdP, browser, certificate, secret, or deployed configuration is required but not visible.
```

### WEB-PROTOCOL-AND-AUTH.md#Universal moves

## Universal moves (apply across the above)

- Walk issue → store → transmit → consume → refresh → revoke for every credential and challenge. Compare normal, error, retry, migration, legacy, and account-switch paths.
- Enumerate every door to the same identity and every route to the same sensitive operation. The effective policy is the weakest parallel path, not the most polished UI.
- Diff parser, proxy, router, cache, and application normalization side by side. For local validation, feed identical bounded request fixtures into each component rather than sending traffic to a live deployment.
- For recovery and linking, draw the account before/after graph. Each edge must name the current principal, proof of the new identity, required assurance, callback/session binding, and revocation effect.

### WEB-PROTOCOL-AND-AUTH.md#Validation rules

## Validation rules (apply before reporting ANY finding here)

1. Apply a source-visibility gate. Proxy chains, edge cache keys, IdP policy, certificate trust, browser cookie behavior, secrets, and deployed auth modes may be outside the repository. Record a precise `needs_validation` candidate instead of asserting missing infrastructure behavior.
2. For framing and cache findings, name both components and the divergent parse/key. Confirm cross-request, cross-user, or private-response impact with bounded local fixtures.
3. For token, MFA, passkey, account-link, recovery, API-key, and mTLS findings, cite the verification line and missing principal/session/resource/origin/audience/action/assurance binding. Prove the server accepts the invalid transition or credential.
4. For CSRF, name the ambient credential, state-changing route, accepted cross-site request shape, browser cookie policy, and missing effective check. Read-only actions and routes requiring a non-ambient bearer token do not qualify.
5. Verify framework and library defaults. If version or configuration is unknown, use `needs_validation`; do not turn an unverified critical claim into a lower-severity confirmed finding.
6. Return `confirmed` only with a complete source trace and observable unauthorized identity, state, or disclosure. For `needs_validation`, name the missing fact and safe local or owner-observed check that resolves it.

## Excluded blocks

- MEMORY-SAFETY-AND-BINARY.md#Core discipline: No native, unsafe or binary code in scope (TypeScript/SQL only).
- AI-AND-LLM.md#Core discipline: No model, prompt assembly or tool-calling agent in the product.
- DATA-ISOLATION-AND-LIFECYCLE.md#Soft-delete and tombstone bypass: No soft-delete; deletes are hard and admin-only.
- DATA-ISOLATION-AND-LIFECYCLE.md#Export and backup scope expansion: No export/backup feature exists in source.
- WEB-PROTOCOL-AND-AUTH.md#OAuth/OIDC request and callback binding: No OAuth/OIDC flow; password auth only.
- WEB-PROTOCOL-AND-AUTH.md#Ordinary CSRF: Function authenticates by bearer header, not cookies.

## Core hunting method

```text
## Defensive vulnerability-finding method

Your goal is to find source-grounded security invariant failures and the smallest fix,
not to expand harm beyond the boundary result. Stay within source review and bounded local execution.
Do not contact deployed endpoints, provider APIs, registries, identity systems,
message brokers, shared services, or other users. Use local dummy data only.

READ THE CODE AT DEPTH. Follow each assigned input through parsing, identity,
authorization, normalization, state, derived copies, and the final sink. Read sibling,
legacy, batch, retry, cancellation, migration, and error paths that produce the same
effect. Compare sibling controls for equivalence, not only presence, and compare what
one component guarantees with what the next component assumes.

WORK FROM A CONCRETE INVARIANT:
1. Name the lower-trust principal and starting capability.
2. Name the accepted value, action, state transition, or resource selector.
3. Locate the control that should reject, bind, isolate, limit, or revoke it.
4. Trace the exact source path after that decision.
5. Stop at the smallest affected dummy record, wrong return value, process-integrity
   effect, or locally observable shared-resource effect.
6. State a source-level change and regression case that enforce the invariant.

DEPTH BOUND: trace only paths that can reach your assigned boundary or whose
guarantees that boundary relies on. Stop a line of investigation as soon as the
invariant is settled either way, and record the result in your structured output —
a covered, candidate, or blocked disposition, or an `uncovered` entry — instead of
continuing to search.

TEST SAD PATHS AND DISAGREEMENTS. Check absent, empty, zero, negative, maximum,
over-limit, duplicate, mixed encoding, stale, revoked, reordered, concurrent,
partially migrated, failed dependency, and rollback state only where the interface
accepts them. Compare canonicalization and units at every parser or policy handoff.
For multi-step issues, treat each output as a prerequisite and do not assume a later
boundary. If any prerequisite is not established, record a blocker.

When a proposed high or critical candidate reveals a reusable root cause, search paths
owned by the assigned coverage IDs for lexical, structural, and logical variants.
Consolidate the same root cause, but establish each variant's conditions and impact
independently. Do not investigate peer-owned units. Return a variant with no current
coverage unit as `uncovered`.

USE THE NARROWEST LOCAL CHECK THAT SETTLES THE CLAIM. Target-controlled builds,
tests, processes, browsers, emulators, fuzzers, and fixture processing may run only
inside the parent-approved OS-enforced sandbox. It must disable external networking,
start from an empty allowlisted environment, expose target and tools read-only, permit
writes only to your scratch directory, and apply low CPU, memory, process, file-size,
disk, and wall-clock limits. Isolated loopback is allowed only for a local fixture.
If any control is unavailable, do not execute: return needs_validation with that exact
blocker. Prefer an existing unit test, minimal function harness, dummy-tenant service
call, small malformed fixture, deterministic race schedule, or locally rendered policy.
Do not install or fetch tools.

Record the exact input, command, limits, and minimum result. For the environment,
record only allowlisted variable names and safe non-secret values needed to reproduce
the check. Never capture the ambient environment, inherited variables, credentials,
authentication state, or unrelated host paths. The target-controlled process writes
only in scratch. After the sandbox and all its processes terminate, only trusted
parent-side code may promote predeclared scratch-relative files, following the
promotion procedure block included verbatim in this prompt. You and target code never
write retained artifacts. If promotion is unavailable or fails for decisive evidence,
return needs_validation with the exact promotion blocker.
Never stress availability, invoke a live target, use a real credential, publish an
artifact, or continue past the minimum observed effect.

A deployment, browser, provider, broker, OS, proxy, package, secret, or identity fact
outside source is not proof either way. If one such fact is decisive, return a
needs_validation record with the exact missing observation and safe owner-observed check.
```

```text
Artifact promotion procedure (trusted parent-side code only):
Reference only for you: the parent performs these steps; you never perform them.

Before execution, the parent opens and retains trusted, non-inheritable directory
descriptors for the agent's scratch/ and artifacts/ roots, and records an allowlist
of expected scratch-relative artifact files plus explicit per-file and cumulative
byte limits. Never pass those descriptors to the agent or sandbox. After the sandbox
and all its processes terminate, trusted parent-side code promotes each allowlisted
file separately:

1. Validate the declared relative path: reject absolute, empty, `.`, `..`, or
   symlinked components.
2. Walk each parent component from the retained scratch-root descriptor with
   no-follow directory-relative operations; never reopen by path.
3. Open the leaf no-follow and nonblocking.
4. Verify with `fstat` that it is a regular file with link count exactly one and
   within the recorded per-file and cumulative byte limits.
5. Enforce those limits again while reading from that descriptor.
6. Copy exactly the verified size, repeat `fstat`, and reject a changed identity,
   type, link count, or size.
7. For the destination, walk every parent component from the retained
   artifacts-root descriptor with no-follow directory-relative operations; require
   each existing component to be a real directory, and create any missing directory
   exclusively before reopening and verifying it no-follow.
8. Create the leaf exclusively without following links, verify that the opened
   destination is a regular file with link count exactly one, and copy from the
   verified source descriptor without reopening either path.
9. Use equivalent race-safe APIs on non-POSIX systems.
10. Never recursively copy or glob scratch, extract an archive into artifacts, or
    open or promote a symlink, FIFO, socket, device, directory, hard-linked file,
    changing file, or file that exceeds its bound.
11. If any check is unavailable, cannot be enforced, or fails, discard the scratch
    entry; if it is decisive evidence, retain `needs_validation` with the exact
    promotion blocker.
```

## Core validation rules

```text
## Candidate gate

1. A candidate needs a complete repository-relative source trace and evidence for the
   claimed root cause, including the strongest source-visible control.
2. A proposed confirmed record needs a bounded local observed result, meaningful impact
   across a stated boundary, complete conditions, and no visible preventing layer.
3. Do not strengthen a crash into code execution, ordinary work into shared availability,
   or a same-principal action into privilege gain.
4. If a required fact is not source-visible or locally observable, use
   needs_validation. Name exact blockers; do not give it severity or speculative completion.
5. A missing best practice with no affected principal/resource is excluded or hardening,
   not a finding. A candidate disproved by source is not needs_validation.
6. Use the same source-derived fingerprint for the same root cause in every state.
   It must match `^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$` and must not include a line,
   wave, agent, severity, or verdict.
7. Return an empty candidate array when nothing survives these gates.
```

## Exclusions and peers

Carried same-source prior confirmed exclusions: none (first run).
Peer-owned coverage IDs you must not duplicate:
- .github%2Fworkflows%23push%20and%20pull_request%20events::.github%2Fworkflows%2Fci.yml%23deploy%20job%20production%20environment::profile%2Fquick%2Fall-in-scope-subsystems::SUPPLY-CHAIN-AND-RELEASE.md%23Untrusted%20code%20in%20a%20privileged%20workflow
- public%2F_headers%23edge%20response%20headers::wrangler.jsonc%23static%20assets::profile%2Fquick%2Fall-in-scope-subsystems::CLOUD-AND-DEPLOYMENT.md%23Edge%2Fruntime%20boundary%20mismatch
- repository%23committed%20source%20and%20config%20files::.gitignore%23secret%20exclusion::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Cryptography%20and%20secrets
- repository%23committed%20source%20and%20config%20files::.gitignore%23secret%20exclusion::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Obvious%20things
- src%2Fapp%2Ftime%2FPortal%2FadmIn%2Fpage.tsx%23render%20other-user%20display_name%20note%20email::src%2Fcomponents%2FAdminReviewTable.tsx%23React%20JSX%20text%20rendering::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Injection
- src%2Fcomponents%2FAddUserForm.tsx%23email%20verification%20dns.google%20lookup::src%2Flib%2FemailCheck.ts%23verifyEmail::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage
- src%2Flib%2FsupabaseClient.ts%23persistSession%20browser%20storage::src%2Fcomponents%2FRequireAuth.tsx%23client%20route%20gate::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries

## Paths, identity, and result contract

- Your agent_id: `hunter-data` (use it as agent_id on every check).
- Scratch: .audit/security-audit/run-1/agents/hunter-data/scratch/ ; artifacts (parent-owned): .audit/security-audit/run-1/agents/hunter-data/artifacts/
- Promotion allowlist: empty; byte limits 0. **No OS-enforced sandbox and no safe promotion exist on this host**, so do NOT execute any target code (no npm/jest/next/wrangler/node on target files). Every check is `method: "source"` with `artifact: null`. A candidate that would need execution to confirm must be proposed as `needs_validation` with the missing sandbox as a blocker (plus any deployment fact).
- Owner note: the owner has stated that supabase/setup.sql's bootstrap admin credentials are intentional for internal use. Still evaluate and report them per the method; do not edit any file.
- Do not write any files except optional notes in your scratch directory. Do not edit target source.
- File paths in results are repository-relative with forward slashes (e.g. `supabase/schema.sql`). Line numbers must be exact.

## Structured hunter result

Return exactly one JSON object, with no surrounding prose:

```json
{
  "units": [
    {
      "coverage_id": "one assigned ID",
      "disposition": "covered|candidate|blocked",
      "reviewed_paths": ["repo/relative/path"],
      "checks": [
        {
          "agent_id": "canonical owner of this check",
          "reviewed_paths": ["repo/relative/path owned by this check"],
          "invariant": "specific control checked for this unit",
          "method": "source|local",
          "result": "what source or the bounded check established",
          "artifact": "agents/<agent-id>/artifacts/file for local, null for source"
        }
      ],
      "candidate_fingerprints": [],
      "unresolved": []
    }
  ],
  "candidates": [],
  "hardening": ["concrete non-finding note"],
  "uncovered": [
    {
      "surface": "...",
      "boundary": "...",
      "subsystem": "...",
      "attack_class": "...",
      "starting_paths": ["repo/relative/path"],
      "reason": "why this needs its own deterministic coverage unit"
    }
  ]
}
```

Each `candidates` entry is schema-shaped except that it uses `proposed_verdict` in place of `verdict`:

- `proposed_verdict: "confirmed"`: include every field required by the `confirmed` branch of `report-schema.json` other than `verdict`: `fingerprint`, title, description, `root_cause`, `intended_behavior`, ordered `trace`, `evidence`, `conditions`, target-neutral `execution`, `remediation`, `severity`, and `confidence`. The execution instructions describe only the bounded local check already performed. `payloads` holds the minimum test input, fixture, or native invocation. `observed_result` records actual local output. Overall severity must not exceed observed impact.
- `proposed_verdict: "needs_validation"`: include every field required by that schema branch other than `verdict`: `fingerprint`, title, description, `claimed_root_cause`, ordered `trace`, `evidence`, nonempty `blockers`, and `validation_plan` with at least one applicable `local` or `deployment` step. Do not invent an inapplicable context. Do not include severity, execution, remediation, reason, or a confirmed `root_cause`. `deployment` is an owner-observed check, not a request to probe a live target.

Every assigned coverage ID appears exactly once in `units`. A `covered` unit needs an owner, nonempty `reviewed_paths` and `checks`, no unresolved fact, and no candidate. A `candidate` unit has the same owned evidence and is the only state that carries linked fingerprints. A `blocked` unit is an owned partial review with nonempty paths, checks, and unresolved facts but no fingerprint. All source paths are repository-relative, never absolute or traversal paths. A trace with several entries begins at `entrypoint`, ends at `sink`, and labels intermediate steps `propagation`. Every check has its own canonical lowercase `agent_id` and nonempty `reviewed_paths`; the unit-level list is exactly the union of those owned paths. A `source` check uses `artifact: null`. A `local` check uses one successfully parent-promoted regular file beneath `agents/<check.agent_id>/artifacts/`; this permits a verifier to add independently owned evidence without taking ownership from the hunter. Never link scratch, an output-root file, or another check owner's artifact.

### report-schema.json — confirmed branch (verbatim)

```json
{
  "type": "object",
  "description": "A source-grounded vulnerability that was independently demonstrated.",
  "properties": {
    "verdict": {
      "type": "string",
      "const": "confirmed"
    },
    "fingerprint": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$",
      "description": "A stable source-derived identifier that does not change between validation states."
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "visibleContent": true
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "visibleContent": true
    },
    "root_cause": {
      "type": "string",
      "minLength": 1,
      "visibleContent": true
    },
    "intended_behavior": {
      "type": "string",
      "minLength": 1,
      "visibleContent": true
    },
    "trace": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "enum": [
              "entrypoint",
              "propagation",
              "sink"
            ]
          },
          "file": {
            "type": "string",
            "minLength": 1
          },
          "line": {
            "type": "integer",
            "minimum": 1
          },
          "scope": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "required": [
          "kind",
          "file",
          "line",
          "scope",
          "description"
        ],
        "additionalProperties": false
      }
    },
    "evidence": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "object",
        "properties": {
          "file": {
            "type": "string",
            "minLength": 1
          },
          "line": {
            "type": "integer",
            "minimum": 1
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "required": [
          "file",
          "line",
          "description"
        ],
        "additionalProperties": false
      }
    },
    "conditions": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "enum": [
              "authentication_level",
              "authorization_role",
              "user_interaction",
              "system_configuration",
              "network_routing",
              "environmental_dependency",
              "data_state",
              "timing_dependency",
              "third_party_dependency"
            ]
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "required": [
          "kind",
          "description"
        ],
        "additionalProperties": false
      }
    },
    "execution": {
      "type": "object",
      "description": "Target-neutral reproduction in the target's native interface.",
      "properties": {
        "attacker_perspective": {
          "type": "string",
          "minLength": 1,
          "visibleContent": true
        },
        "payloads": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": {
            "type": "string"
          }
        },
        "instructions": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "observed_result": {
          "type": "string",
          "minLength": 1,
          "visibleContent": true
        }
      },
      "required": [
        "attacker_perspective",
        "payloads",
        "instructions",
        "observed_result"
      ],
      "additionalProperties": false
    },
    "remediation": {
      "type": "object",
      "properties": {
        "strategy": {
          "type": "string",
          "minLength": 1,
          "visibleContent": true
        },
        "code_changes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "file_name": {
                "type": "string",
                "minLength": 1
              },
              "fixed_code": {
                "type": "string"
              }
            },
            "required": [
              "file_name",
              "fixed_code"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "strategy"
      ],
      "additionalProperties": false
    },
    "severity": {
      "type": "object",
      "properties": {
        "likelihood": {
          "type": "object",
          "properties": {
            "score": {
              "type": "string",
              "enum": [
                "informational",
                "low",
                "medium",
                "high",
                "critical"
              ]
            },
            "reason": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "required": [
            "score",
            "reason"
          ],
          "additionalProperties": false
        },
        "impact": {
          "type": "object",
          "properties": {
            "score": {
              "type": "string",
              "enum": [
                "informational",
                "low",
                "medium",
                "high",
                "critical"
              ]
            },
            "reason": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "required": [
            "score",
            "reason"
          ],
          "additionalProperties": false
        },
        "overall_severity": {
          "type": "string",
          "enum": [
            "informational",
            "low",
            "medium",
            "high",
            "critical"
          ]
        }
      },
      "required": [
        "likelihood",
        "impact",
        "overall_severity"
      ],
      "additionalProperties": false
    },
    "confidence": {
      "type": "object",
      "properties": {
        "score": {
          "type": "string",
          "enum": [
            "low",
            "medium",
            "high"
          ]
        },
        "reason": {
          "type": "string",
          "minLength": 1,
          "visibleContent": true
        }
      },
      "required": [
        "score",
        "reason"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "verdict",
    "fingerprint",
    "title",
    "description",
    "root_cause",
    "intended_behavior",
    "trace",
    "evidence",
    "conditions",
    "execution",
    "remediation",
    "severity",
    "confidence"
  ],
  "additionalProperties": false
}
```

### report-schema.json — needs_validation branch (verbatim)

```json
{
  "type": "object",
  "description": "A source-grounded candidate whose decisive validation is blocked.",
  "properties": {
    "verdict": {
      "type": "string",
      "const": "needs_validation"
    },
    "fingerprint": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "visibleContent": true
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "visibleContent": true
    },
    "claimed_root_cause": {
      "type": "string",
      "minLength": 1,
      "visibleContent": true
    },
    "trace": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "enum": [
              "entrypoint",
              "propagation",
              "sink"
            ]
          },
          "file": {
            "type": "string",
            "minLength": 1
          },
          "line": {
            "type": "integer",
            "minimum": 1
          },
          "scope": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "required": [
          "kind",
          "file",
          "line",
          "scope",
          "description"
        ],
        "additionalProperties": false
      }
    },
    "evidence": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "object",
        "properties": {
          "file": {
            "type": "string",
            "minLength": 1
          },
          "line": {
            "type": "integer",
            "minimum": 1
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "required": [
          "file",
          "line",
          "description"
        ],
        "additionalProperties": false
      }
    },
    "blockers": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "visibleContent": true
      }
    },
    "validation_plan": {
      "type": "object",
      "properties": {
        "local": {
          "type": "string",
          "minLength": 1,
          "visibleContent": true
        },
        "deployment": {
          "type": "string",
          "minLength": 1,
          "visibleContent": true
        }
      },
      "additionalProperties": false
    }
  },
  "required": [
    "verdict",
    "fingerprint",
    "title",
    "description",
    "claimed_root_cause",
    "trace",
    "evidence",
    "blockers",
    "validation_plan"
  ],
  "additionalProperties": false
}
```
