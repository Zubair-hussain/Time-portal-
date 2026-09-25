#!/usr/bin/env node
// SEO checks on the static export (run after `npm run build`). Exits 1 on any failure.
// Usage: node scripts/seo-check.mjs [outDir] [--json report.json]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const jsonIdx = args.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const OUT = args.find((a, i) => !a.startsWith('--') && i !== jsonIdx + 1) || 'out';

const results = [];
const check = (area, name, ok, detail = '') => results.push({ area, name, ok: Boolean(ok), detail });
const read = (p) => (existsSync(join(OUT, p)) ? readFileSync(join(OUT, p), 'utf8') : null);
const meta = (html, attr, key) =>
  html.match(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${key}"`, 'i'))?.[1] ??
  null;

// ---- Public page: sign-in -------------------------------------------------
const home = read('index.html');
if (!home) {
  console.error(`No ${OUT}/index.html — run "npm run build" first.`);
  process.exit(1);
}
const title = home.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
const desc = meta(home, 'name', 'description') ?? '';
check('home', 'html lang attribute', /<html[^>]*\blang="[a-z-]+"/i.test(home));
check('home', 'title present, 10–60 chars', title.length >= 10 && title.length <= 60, `"${title}" (${title.length})`);
check('home', 'meta description 50–160 chars', desc.length >= 50 && desc.length <= 160, `${desc.length} chars`);
check('home', 'viewport meta', /<meta[^>]*name="viewport"/i.test(home));
check('home', 'canonical link', /<link[^>]*rel="canonical"[^>]*href="https?:\/\//i.test(home));
check('home', 'theme-color meta', meta(home, 'name', 'theme-color') !== null);
check('home', 'favicon link', /<link[^>]*rel="(shortcut )?icon"[^>]*href="\/favicon\.svg"/i.test(home));
check('home', 'Open Graph title/description', meta(home, 'property', 'og:title') && meta(home, 'property', 'og:description'));
check('home', 'indexable (no noindex)', !/<meta[^>]*name="robots"[^>]*noindex/i.test(home));
check('home', 'exactly one <h1>', (home.match(/<h1[\s>]/gi) || []).length === 1);
const imgs = home.match(/<img\b[^>]*>/gi) || [];
check('home', 'all <img> have alt', imgs.every((t) => /\balt="/i.test(t)), `${imgs.length} images`);

// ---- Private pages must not be indexed -------------------------------------
for (const p of ['dashboard/index.html', 'insights/index.html', 'time/Portal/admIn/index.html']) {
  const html = read(p);
  check('private', `${p} exists`, html !== null);
  if (html) check('private', `${p} has noindex`, /<meta[^>]*name="robots"[^>]*noindex/i.test(html));
}

// ---- robots.txt / sitemap.xml ----------------------------------------------
const robots = read('robots.txt') ?? '';
check('crawl', 'robots.txt exists', robots.length > 0);
check('crawl', 'robots.txt references sitemap', /^Sitemap:\s*https?:\/\/\S+\/sitemap\.xml$/im.test(robots));
check('crawl', 'robots.txt disallows private pages', /Disallow:\s*\/dashboard\//i.test(robots) && /Disallow:\s*\/insights\//i.test(robots));
check('crawl', 'robots.txt does not reveal admin path', !/admIn/i.test(robots));
const sitemap = read('sitemap.xml') ?? '';
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check('crawl', 'sitemap.xml has absolute <loc> URLs', locs.length > 0 && locs.every((u) => /^https?:\/\//.test(u)), locs.join(', '));
check('crawl', 'sitemap lists no private pages', !locs.some((u) => /dashboard|insights|admIn/i.test(u)));

// ---- Assets ----------------------------------------------------------------
check('assets', 'favicon.svg shipped', existsSync(join(OUT, 'favicon.svg')));
check('assets', 'logo.svg shipped', existsSync(join(OUT, 'logo.svg')));
check('assets', '404 page shipped', existsSync(join(OUT, '404.html')));
check('assets', 'Cloudflare _headers shipped', existsSync(join(OUT, '_headers')));

// ---- Report ----------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  [${r.area}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} SEO checks passed`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ outDir: OUT, passed: results.length - failed.length, total: results.length, results }, null, 2) + '\n');
process.exit(failed.length ? 1 : 0);
