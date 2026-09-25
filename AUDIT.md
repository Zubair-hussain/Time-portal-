# Time Portal — audit summary

Audited 2026-09-25. Interactive report: [claude.ai/artifact/6DZ7tYQKrYS2aBYacgkqny](https://claude.ai/artifact/6DZ7tYQKrYS2aBYacgkqny). Everything below can be re-run locally or by the GitHub workflows in
[`.github/workflows/`](.github/workflows/).

| Audit | Tool | Result | Full report |
| --- | --- | --- | --- |
| **Security (code)** | [Cloudflare security-audit skill](https://github.com/cloudflare/security-audit-skill), `quick` profile | 0 confirmed · **4 need validation** · 6 units clean · 2 deferred | [`.audit/security-audit/run-1/REPORT.md`](.audit/security-audit/run-1/REPORT.md) |
| **Performance / a11y / best practices / SEO** | Lighthouse 12 via Lighthouse CI, desktop, 3 runs | **99–100 · 100 · 100 · 100** | [`reports/lighthouse/sign-in.html`](reports/lighthouse/sign-in.html) · [`summary.json`](reports/lighthouse/summary.json) |
| **SEO checks** | [`scripts/seo-check.mjs`](scripts/seo-check.mjs) | **27 / 27 pass** | [`reports/seo/seo-check.json`](reports/seo/seo-check.json) |
| **Dependencies** | `npm audit` | **0** in shipped deps (after Next 15.1.0 → 15.5.26 and a `postcss` override) · 16 in dev-only tooling | [`reports/security/`](reports/security/) |
| **Tests** | Jest + Testing Library | **216 / 216 pass**, 17 snapshots | `npm run test:coverage` → `coverage/` |

## Security audit (Cloudflare skill)

Run folder: [`.audit/security-audit/run-1/`](.audit/security-audit/run-1/). It is git-ignored, as the skill
requires, because it describes open issues. The method itself is vendored in
[`.audit/security-audit-skill/`](.audit/security-audit-skill/).

The run used 12 agents: 4 reconnaissance, 3 hunters, 1 coverage critic, and 4 independent verifiers.
Both skill validators pass (`coverage-ledger.json`, `findings.json`). This host has no OS sandbox, so
the review was **source-only**. Under the skill's rules, that means nothing can be marked
"confirmed". Real issues are recorded as **needs validation**, each with a trace and a safe check.

| # | Lead (needs validation, no severity yet) | Where |
| --- | --- | --- |
| 1 | Members can **insert** time entries already marked `approved`, with any duration: the status guard runs only on UPDATE | `supabase/schema.sql:54,87` |
| 2 | Members can **edit duration or timestamps** of entries after they're approved | `supabase/schema.sql:59,78` |
| 3 | **Admin password in plain text** in `supabase/setup.sql`, and re-running the file resets it. *The owner says this is intentional for internal use.* | `supabase/setup.sql:140,182` |
| 4 | A member can set their **display name** to someone else's; the admin queue, leaderboard and award show only that name | `supabase/admin-create-user.sql:126` |

**Owner check:** in Supabase → Authentication → Providers → Email, make sure
**Allow new users to sign up is OFF**. Invite-only depends on that setting, and it isn't in code. This
was the coverage critic's open item.

Fix suggestions and the read-only SQL queries that settle each lead are in
[`NEEDS-VALIDATION.md`](.audit/security-audit/run-1/NEEDS-VALIDATION.md).

## Lighthouse

| Run | Performance | Accessibility | Best practices | SEO | LCP | TBT | Speed Index |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 99 | 100 | 100 | 100 | 0.8 s | 20 ms | 0.7 s |
| 2 | 100 | 100 | 100 | 100 | 0.6 s | 0 ms | 0.5 s |
| 3 | 100 | 100 | 100 | 100 | 0.7 s | 0 ms | 0.5 s |

Performance was **69–75** before this pass. The login page hid its content behind GSAP fade-ins
and ran full-screen SVG rotations. The fades were removed, and ambient motion now respects
`prefers-reduced-motion`. Budgets are enforced in CI by [`lighthouserc.json`](lighthouserc.json):
performance ≥ 90, accessibility ≥ 95, best practices ≥ 95, SEO = 100.

## Re-run everything

```bash
npm run test:coverage       # unit + snapshot tests
npm run build               # static export → out/
npm run audit:seo           # SEO checks on out/
npm run audit:lighthouse    # Lighthouse CI (needs Chrome)
npm run audit:security      # npm audit, shipped dependencies
```

The security audit is re-run by asking an agent that has the skill installed to *"security audit this
codebase"*. Later runs read `run-1` and target its gaps.
