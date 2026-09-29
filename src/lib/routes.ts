/**
 * Route constants.
 *
 * Access to the admin page is protected by RequireAuth in the UI and, authoritatively,
 * by Postgres Row Level Security plus the admin-only admin_create_user() function.
 *
 * Paths are case-sensitive on most static hosts, so always link through these constants.
 * A trailing slash is required (next.config.mjs sets trailingSlash: true).
 */
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard/',
  insights: '/insights/',
  admin: '/admin/',
  terms: '/terms/',
  privacy: '/privacy/',
} as const;

export type RouteKey = keyof typeof ROUTES;
