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
    "coverage_id": ".github%2Fworkflows%23push%20and%20pull_request%20events::.github%2Fworkflows%2Fci.yml%23deploy%20job%20production%20environment::profile%2Fquick%2Fall-in-scope-subsystems::SUPPLY-CHAIN-AND-RELEASE.md%23Untrusted%20code%20in%20a%20privileged%20workflow",
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
    ]
  },
  {
    "coverage_id": "public%2F_headers%23edge%20response%20headers::wrangler.jsonc%23static%20assets::profile%2Fquick%2Fall-in-scope-subsystems::CLOUD-AND-DEPLOYMENT.md%23Edge%2Fruntime%20boundary%20mismatch",
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
    ]
  },
  {
    "coverage_id": "repository%23committed%20source%20and%20config%20files::.gitignore%23secret%20exclusion::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Cryptography%20and%20secrets",
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
    "selected_companion_blocks": []
  },
  {
    "coverage_id": "repository%23committed%20source%20and%20config%20files::.gitignore%23secret%20exclusion::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Obvious%20things",
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
      "src/",
      "supabase/"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Obvious things",
    "selected_companion_blocks": []
  }
]

## Selected attack-class and companion blocks (verbatim)

### SUPPLY-CHAIN-AND-RELEASE.md#Untrusted code in a privileged workflow

**Untrusted code in a privileged workflow**
A pull request, issue comment, fork, dependency update, or external event runs contributor-controlled code with protected secrets, write tokens, deployment authority, or a trusted runner. Compare trigger type, checkout ref, approval gate, environment protection, and permission narrowing. Do not assume repository-host defaults that are not in source.

### SUPPLY-CHAIN-AND-RELEASE.md#Workflow command and expression confusion

**Workflow command and expression confusion**
Attacker-controlled branch names, commit messages, issue fields, artifact names, matrix values, or generated output enter shell commands, template expressions, paths, or privileged workflow inputs without canonical validation.

### SUPPLY-CHAIN-AND-RELEASE.md#Mutable and unbound build inputs

**Mutable and unbound build inputs**
Builds consume branches, tags, unverified submodules, downloaded tools, generated assets, remote includes, floating CI actions, or container tags whose content can change without source review. Require a lower-trust writer and a path into trusted build output; reproducibility by itself does not prove authenticity.

### SUPPLY-CHAIN-AND-RELEASE.md#Automation identity overreach

**Automation identity overreach**
CI jobs receive permissions beyond the operation, repository, environment, or duration needed, and untrusted job inputs can select the affected resource. Missing least privilege alone is hardening; require a reachable privileged action.

### SUPPLY-CHAIN-AND-RELEASE.md#Core discipline

## Core discipline (include in every agent prompt for this domain)

```
- A mutable or known-vulnerable dependency is not a finding by itself. Show who can influence resolution, which build consumes it, and what execution or release boundary follows.
- Follow integrity across every handoff: source identity, resolved inputs, build worker, artifact identity, test result, signature/attestation, promotion, and update consumer.
- CI configuration is authorization code. Establish which event triggered a workflow, whose code runs, which secrets and tokens exist, and what it may publish or mutate.
- A checksum fetched from the same untrusted location as the artifact does not establish independent integrity. Identify the trusted root and failure behavior.
- Use `confirmed` for in-repo control-flow failures with bounded local validation. Use `needs_validation` for branch protection, hosted-runner, registry, signing-service, or production promotion facts that are not observable.
```

### SUPPLY-CHAIN-AND-RELEASE.md#Universal moves

## Universal moves (apply across the above)

- Walk backward from a released digest or installed update to every source, generated input, credential, worker, cache, test result, and authorization decision.
- Compare untrusted and protected workflow events side by side. Mark each persisted channel crossing between them and require an immutable identity plus producer trust.
- Review revoked key, failed download, missing attestation, partial platform release, rollback, and registry outage paths. The failure policy is part of release integrity.

### SUPPLY-CHAIN-AND-RELEASE.md#Validation rules

## Validation rules (apply before reporting ANY finding here)

1. Name the lower-trust actor, controllable source/cache/artifact/metadata, consuming trusted job or updater, and resulting unauthorized publication, code inclusion, secret disclosure, or privileged execution.
2. Prove artifact identity across the broken handoff. A different mutable name or unbound digest must reach a real consumer.
3. Verify built-in package-manager, repository-host, registry, and signing defaults for the pinned version. Unknown hosted controls require `needs_validation`.
4. Keep local validation bounded: use a harmless fixture repository, dummy credential marker, local registry/config, and non-production artifact namespace. Do not publish or alter a real release.
5. Return `confirmed` only with a complete source-visible handoff and meaningful result. Return `needs_validation` with the precise branch, runner, registry, signing, or deployment fact an owner must observe.

### CLOUD-AND-DEPLOYMENT.md#Edge/runtime boundary mismatch

**Edge/runtime boundary mismatch**
An edge or serverless runtime assumes a secret, API, filesystem, isolation, or tenant policy that differs from the origin runtime, and fallback to origin changes authority or cache behavior. Confirm which configuration selects each path.

### CLOUD-AND-DEPLOYMENT.md#Core discipline

## Core discipline (include in every agent prompt for this domain)

```
- Do not infer a live exposure from a manifest alone. Establish which environment consumes it, what defaults or overlays modify it, and whether the source path is active.
- Map each workload's identity to specific operations and resources. Broad policy is a finding only when lower-trust input can reach an unauthorized action.
- Ingress, proxies, service mesh, metadata services, and admission policy are real boundaries, but only count a control when its configuration and attachment are visible.
- Secret references are not secret disclosure. Require a lower-trust reader, output, artifact, log path, or unsafe fallback.
- Use `confirmed` for active in-repo configurations and local rendering/policy validation. Use `needs_validation` for account policy, network attachment, runtime admission, hosted metadata, or drift that needs owner observation.
```

### CLOUD-AND-DEPLOYMENT.md#Universal moves

## Universal moves (apply across the above)

- Render every maintained environment and make a matrix of external port, workload identity, network peers, mounted secrets, and cloud resources. Differences require an owner or policy explanation.
- Follow a lower-trust request, object, label, or event into cloud policy. Show which workload credential performs the final operation and what condition should scope it.
- Diff normal deploy, migration, restore, node maintenance, failover, and local/emulator paths. Review behavior when mesh, admission, identity, secret, or policy service is unavailable.

### CLOUD-AND-DEPLOYMENT.md#Validation rules

## Validation rules (apply before reporting ANY finding here)

1. Establish the active source path and effective deployment object; otherwise use `needs_validation` and state which rendered manifest or owner-observed attachment is missing.
2. Name the lower-trust caller/workload, cloud or application identity, controllable selector, affected resource, and unauthorized operation or disclosure.
3. Verify provider and orchestrator defaults at the pinned version. Do not assume a public IP, reachable metadata service, permissive firewall, or absent admission attachment.
4. Local validation may render templates, evaluate policy, inspect container/user namespaces in an isolated fixture, or run an emulator with dummy identities. Do not probe live endpoints or alter shared cloud resources.
5. Return `confirmed` only with a complete active source trace and concrete boundary result. Return `needs_validation` with the exact deployed policy, identity attachment, overlay, network, or drift observation needed.

### ATTACK-CLASSES.md#Cryptography and secrets

**Cryptography and secrets** (subagent_type: `general`)
- Weak randomness for security-critical values (tokens, keys, nonces)
- Hardcoded secrets, secrets in logs, error messages, URLs, or client-visible responses
- Broken key derivation, missing HMAC verification, nonce reuse
- Timing side-channels on secret comparison
- Misuse of crypto primitives (ECB mode, unauthenticated encryption, static IVs, etc.)
- What happens when crypto operations fail? Does the error path fall back to no-crypto?

### ATTACK-CLASSES.md#Obvious things

**Obvious things** (subagent_type: `general`)
Other agents hunt subtle bugs. This agent checks the basic exposures that are easy to overlook because everyone assumes someone else already checked them:
- Are there any hardcoded passwords, API keys, tokens, or secrets in the source? (grep for `password`, `secret`, `apikey`, `token`, `Bearer`, `-----BEGIN`, common default passwords)
- Are there any TODO/FIXME/HACK/XXX comments that reference security? (`TODO: add auth`, `FIXME: validate input`, `HACK: skip permission check`)
- Is debug mode / dev mode properly gated? Can it be enabled in production via environment variable, query parameter, or header?
- Are there test/example/seed credentials that work in production?
- Is there a `/debug`, `/admin`, `/test`, `/status`, `/health`, `/metrics`, `/env`, `/.env`, `/config` endpoint that is unprotected?
- Are there any `.env`, `.env.local`, `credentials.json`, `*.pem`, `*.key` files checked into the repo?
- Does the `.gitignore` actually cover secrets, uploads, and local config?
- Are dependencies pinned? Are there known CVEs in the dependency tree? (check lockfiles)
- Are there any `eval()`, `exec()`, `child_process`, `Function()`, `vm.runInContext`, `import()` with dynamic input?
- Are CORS headers set to `*` or overly permissive? Is `Access-Control-Allow-Credentials` combined with a wildcard origin?
- Are cookies missing `HttpOnly`, `Secure`, or `SameSite` attributes?
- Are there any open redirects? (parameters named `redirect`, `return`, `next`, `url`, `goto`, `continue` that feed into redirects without validation)
- Is TLS enforced? Are there any HTTP-only endpoints?
- Are error responses in production returning stack traces, internal paths, or SQL errors?

This agent does not need to be creative. It needs to be thorough and literal. Check every item. Report each result.

**Important**: For any finding this agent reports, it must verify the full code path, not just surface appearance. If a cookie is missing `HttpOnly`, check whether the cookie contains security-sensitive data and whether JS needs to read it by design. If an error message contains a field name, check whether the field is ever actually populated with sensitive data. A flag is not a finding — trace the impact before reporting.

## Excluded blocks

- MEMORY-SAFETY-AND-BINARY.md#Core discipline: No native, unsafe or binary code in scope (TypeScript/SQL only).
- AI-AND-LLM.md#Core discipline: No model, prompt assembly or tool-calling agent in the product.
- SUPPLY-CHAIN-AND-RELEASE.md#Update metadata and rollback confusion: No self-update or client update channel.
- CLOUD-AND-DEPLOYMENT.md#Host or control-plane capability exposure: No containers or orchestration.

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
- src%2Fapp%2Ftime%2FPortal%2FadmIn%2Fpage.tsx%23render%20other-user%20display_name%20note%20email::src%2Fcomponents%2FAdminReviewTable.tsx%23React%20JSX%20text%20rendering::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Injection
- src%2Fcomponents%2FAddUserForm.tsx%23email%20verification%20dns.google%20lookup::src%2Flib%2FemailCheck.ts%23verifyEmail::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage
- src%2Flib%2Fentries.ts%23time_entries%20PostgREST%20insert%2Fupdate%2Fselect::supabase%2Fschema.sql%23enforce_status_rules::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Business%20logic
- src%2Flib%2Fentries.ts%23time_entries%20PostgREST%20insert%2Fupdate%2Fselect::supabase%2Fschema.sql%23time_entries%20RLS%20policies::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control
- src%2Flib%2FsupabaseClient.ts%23persistSession%20browser%20storage::src%2Fcomponents%2FRequireAuth.tsx%23client%20route%20gate::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries
- supabase%2Fadmin-create-user.sql%23admin_create_user%20and%20admin_list_users%20RPC::supabase%2Fschema.sql%23is_admin::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control
- supabase%2Ffunctions%2Fadmin-create-user%2Findex.ts%23POST::supabase%2Ffunctions%2Fadmin-create-user%2Findex.ts%23getUser%20app_metadata.role%20check::profile%2Fquick%2Fall-in-scope-subsystems::ATTACK-CLASSES.md%23Access%20control

## Paths, identity, and result contract

- Your agent_id: `hunter-repo` (use it as agent_id on every check).
- Scratch: .audit/security-audit/run-1/agents/hunter-repo/scratch/ ; artifacts (parent-owned): .audit/security-audit/run-1/agents/hunter-repo/artifacts/
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
