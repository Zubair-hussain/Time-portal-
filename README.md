<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo/svg/time-portal-lockup-dark.svg" />
  <img src="logo/svg/time-portal-lockup-light.svg" width="380" alt="ZH. Time Portal" />
</picture>

<br />

Invite-only time tracking with weekly insights, admin review and a monthly award.

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088ff?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-RLS-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=white)](#deployment)
[![Tests](https://img.shields.io/badge/tests-216%20passing-2ea043)](#testing)
[![Coverage](https://img.shields.io/badge/coverage-95%25-2ea043)](#testing)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-99--100-2ea043?logo=lighthouse&logoColor=white)](#audits)
[![License: MIT](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

[Audit report](https://claude.ai/artifact/6DZ7tYQKrYS2aBYacgkqny) · [Portfolio](https://zubair-hussain-portfolio.detroonshah.workers.dev/) · [Design](figma-design/) · [Wireframes](wireframes/)

</div>

---

## Overview

Time Portal is a small web app for tracking working time inside a closed team. Members sign in,
run a timer for each work session and see their weekly totals. Admins approve or reject entries,
manage members, and each month the member with the most approved hours is named **Top Timer**.

There is no public sign-up: accounts are created by an admin. The app is a static Next.js export
served from Cloudflare Workers. Authentication and data live in Supabase, and access is enforced by
Postgres Row Level Security.

<img src="figma-design/png/02-dashboard.png" width="100%" alt="Member dashboard: live timer, approved hours, monthly award and recent entries" />

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Supabase setup](#supabase-setup)
- [Project structure](#project-structure)
- [Design and branding](#design-and-branding)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Audits](#audits)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

| | |
| --- | --- |
| **Sign-in only** | Email and password through Supabase Auth. Sessions persist and refresh automatically. |
| **Live timer** | Start and stop a session with an optional note. |
| **Weekly insights** | Hours per ISO week, active-day averages and a bar chart. |
| **Admin review** | Approve or reject entries, with search and status filters. |
| **Monthly award** | Leaderboard and Top Timer based on approved hours only. |
| **Member management** | Admins register members or admins in one step. Email addresses are checked for format, disposable domains and mail records. |
| **Roles** | `admin` and `member`, read from the signed JWT and enforced in the database. |

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.5 (App Router, `output: 'export'`), React 19 |
| Language | TypeScript, strict mode |
| Data and auth | Supabase: Auth, Postgres, Row Level Security, `SECURITY DEFINER` RPCs |
| Hosting | Cloudflare Workers Static Assets ([`wrangler.jsonc`](wrangler.jsonc), [`public/_headers`](public/_headers)) |
| Charts and motion | Recharts, GSAP |
| Typography | Hanken Grotesk, self-hosted with `next/font` |
| Testing | Jest, Testing Library |
| CI/CD | GitHub Actions, Dependabot |

## Getting started

Requirements: Node.js 20 or later, npm 10, and a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `NEXT_PUBLIC_SITE_URL` | Public site origin, used for canonical URLs, robots.txt and the sitemap |

The app needs no server-side secrets. Never place the Supabase `service_role` key in this project.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com/) and copy its URL and anon key into `.env.local`.
2. In the SQL editor, run [`supabase/setup.sql`](supabase/setup.sql). It creates the `time_entries` table,
   RLS policies, the status trigger and the first admin account. Edit the admin details in section 6 first.
3. Run [`supabase/admin-create-user.sql`](supabase/admin-create-user.sql) to enable in-app user registration.
4. Under **Authentication → Providers → Email**, turn **Allow new users to sign up** off. The app is invite-only.
5. Sign in as the admin and open the admin console.

[`supabase/schema.sql`](supabase/schema.sql) contains the same schema without the admin bootstrap.

## Project structure

```
src/
  app/                  Routes: sign-in, dashboard, insights, admin console, robots, sitemap
  components/           UI components (ZHLogo, TimerCard, AdminReviewTable, ...)
  context/              Auth session state
  lib/                  Supabase client, entries, awards, insights, JWT, validation
__tests__/              Unit, component and snapshot tests (mirrors src/)
supabase/               SQL schema, RLS policies and admin RPCs
public/                 Favicon, logo and Cloudflare security headers
.github/                CI/CD, security and Lighthouse workflows, Dependabot
logo/                   Logo pack: SVG, PDF and PNG
figma-design/           Figma-ready screens, design system and design tokens
wireframes/             Low-fidelity wireframes
reports/                Lighthouse, SEO and dependency reports
.audit/                 Cloudflare security-audit skill and its output
scripts/                SEO check script
```

## Design and branding

The visual language follows the [ZH portfolio](https://zubair-hussain-portfolio.detroonshah.workers.dev/):
black canvas, warm off-white text and a crimson accent. All tokens are CSS custom properties in
[`src/app/globals.css`](src/app/globals.css).

**Typography.** One sans-serif family throughout, in the style of Upwork. Upwork uses Neue Montreal,
a commercial typeface; Time Portal uses its closest open-source match, Hanken Grotesk. A locally installed,
licensed Neue Montreal is picked up automatically.

**Logo.** The portfolio's **ZH.** mark and red **Z** app icon, as outlined vectors:
[`logo.svg`](logo.svg), [`logo-mark.svg`](logo-mark.svg) and the full pack in [`logo/`](logo/).

**Design files.**

| Folder | Contents |
| --- | --- |
| [`figma-design/`](figma-design/) | Six screens (desktop and mobile), a design-system sheet and [`design-tokens.json`](figma-design/design-tokens.json). The SVGs import into Figma as editable layers. |
| [`wireframes/`](wireframes/) | Low-fidelity layouts of the same screens with annotations. |

<table>
  <tr>
    <td><img src="figma-design/png/01-sign-in.png" alt="Sign-in screen" /></td>
    <td><img src="figma-design/png/04-admin-console.png" alt="Admin console" /></td>
  </tr>
  <tr>
    <td align="center">Sign in</td>
    <td align="center">Admin console</td>
  </tr>
</table>

## Security

- **No public sign-up in the app.** Accounts are created by the `admin_create_user()` database function,
  which requires an admin JWT and validates input server-side.
- **Row Level Security.** Members can read and update only their own entries. Only admins can review or delete.
- **Roles from signed claims.** The database reads `app_metadata.role` from the verified JWT. Client-side
  role checks only control what the UI shows.
- **Edge headers.** Cloudflare applies a Content Security Policy, HSTS, `X-Frame-Options: DENY` and
  `noindex`/`no-store` on signed-in pages.
- **Open items.** The latest audit lists four items to verify, including tightening the entry insert and
  update policies. See [`AUDIT.md`](AUDIT.md).

## Testing

```bash
npm test                # all tests with coverage
npm run test:watch      # watch mode
npm run typecheck       # strict TypeScript
npm run lint            # ESLint
```

216 tests across 31 suites, with 17 snapshots. Coverage is 95% of statements and 87% of branches;
thresholds are enforced in [`jest.config.mjs`](jest.config.mjs). The HTML report is written to `coverage/`.

## Deployment

```bash
npm run deploy          # next build && wrangler deploy
npm run preview:cf      # serve the build on Cloudflare's local runtime (port 8787)
```

The static export in `out/` can also be hosted on any static host (Netlify, S3, GitHub Pages).
Set the `NEXT_PUBLIC_*` variables at build time.

## CI/CD

| Workflow | Runs on | Purpose |
| --- | --- | --- |
| [`ci.yml`](.github/workflows/ci.yml) | Push, pull request | Lint, typecheck, test and build; deploy to Cloudflare from `main` and check live security headers |
| [`security.yml`](.github/workflows/security.yml) | Push, pull request, weekly | npm audit, dependency review, CodeQL and gitleaks |
| [`lighthouse.yml`](.github/workflows/lighthouse.yml) | Push, pull request | SEO checks and Lighthouse budgets |
| [`dependabot.yml`](.github/dependabot.yml) | Weekly | Dependency and action updates |

All actions are pinned to commit SHAs and run with read-only tokens by default.

Required repository settings (**Settings → Secrets and variables → Actions**):

| Type | Name |
| --- | --- |
| Variable | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SITE_URL` |
| Secret | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |

## Audits

Summary in [`AUDIT.md`](AUDIT.md). Interactive report: **[view audit report](https://claude.ai/artifact/6DZ7tYQKrYS2aBYacgkqny)**.

| Audit | Result | Details |
| --- | --- | --- |
| Security review ([Cloudflare security-audit skill](https://github.com/cloudflare/security-audit-skill)) | 0 confirmed, 4 to verify | [Report](.audit/security-audit/run-1/REPORT.md) |
| Lighthouse (desktop) | Performance 99–100, Accessibility 100, Best Practices 100, SEO 100 | [`reports/lighthouse/`](reports/lighthouse/) |
| SEO checks | 27 of 27 passed | [`reports/seo/`](reports/seo/) |
| Dependencies (`npm audit`, production) | 0 vulnerabilities | [`reports/security/`](reports/security/) |

## Scripts

| Script | Description |
| --- | --- |
| `dev` | Development server |
| `build` | Static export to `out/` |
| `test`, `test:watch`, `test:coverage`, `test:ci` | Test runs |
| `lint`, `typecheck` | Code quality |
| `preview:cf`, `deploy` | Cloudflare preview and deployment |
| `audit:seo`, `audit:lighthouse`, `audit:security` | Audits |

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Supabase env vars missing" | Set the `NEXT_PUBLIC_SUPABASE_*` values in `.env.local` and restart the dev server. |
| Admin link not shown | The user's `app_metadata.role` must be `admin`. Sign out and back in to refresh the token. |
| Register user says "Setup missing" | Run `supabase/admin-create-user.sql` in the SQL editor. |
| A new user cannot sign in | Emails must be lowercase. Run the fix at the end of `admin-create-user.sql`. |
| Snapshot test fails after a UI change | Review the diff, then run `npx jest -u` if the change is intended. |

## License

[MIT](LICENSE) © Zubair Hussain
