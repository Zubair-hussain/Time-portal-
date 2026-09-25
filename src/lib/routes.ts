/**
 * Route constants.
 *
 * The admin console lives at an obscure, non-guessable path instead of /admin so it is
 * not found by casual URL guessing or scanners. This is only obscurity: it is NOT what
 * protects the page. Access control is enforced by RequireAuth (UI) and, for real, by
 * Postgres Row Level Security plus the admin-only admin_create_user() function.
 *
 * Paths are case-sensitive on most static hosts, so always link through these constants.
 * A trailing slash is required (next.config.mjs sets trailingSlash: true).
 */
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard/',
  insights: '/insights/',
  admin: '/time/Portal/admIn/',
  terms: '/terms/',
  privacy: '/privacy/',
} as const;

export type RouteKey = keyof typeof ROUTES;
