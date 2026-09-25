/**
 * Public origin of the deployed site, used for canonical URLs, the sitemap and robots.txt.
 * Set NEXT_PUBLIC_SITE_URL at build time (CI does this); the fallback is the default
 * Workers URL that `wrangler deploy` gives this project.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://time-portal.detroonshah.workers.dev'
).replace(/\/+$/, '');
