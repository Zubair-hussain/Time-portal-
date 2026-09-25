import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/*
 * Time Portal is invite-only. The admin console is deliberately NOT listed here
 * (robots.txt is public and would reveal its path); a noindex meta tag keeps it out
 * of search results instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/insights/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
