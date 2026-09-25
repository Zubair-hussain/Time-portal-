import type { JwtInfo, UserRole } from '@/types';

/**
 * Lightweight JWT INSPECTION for the client.
 *
 * SECURITY NOTE: This does NOT verify the cryptographic signature — that is done
 * server-side by Supabase (which signs the token) and enforced by Postgres RLS on
 * every request. Client code must never trust these claims for authorization; they
 * are used only for UX (showing/hiding admin views, expiry countdowns). All real
 * access control lives in Supabase Row Level Security policies keyed on the verified
 * `auth.jwt()` claims.
 */

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  if (typeof atob === 'function') {
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
  }
  // Node fallback (tests / SSR).
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function coerceRole(value: unknown): UserRole {
  return value === 'admin' ? 'admin' : 'member';
}

/**
 * Decode and shallowly validate a Supabase JWT.
 * @param token the raw JWT string
 * @param nowSeconds current time in UNIX seconds (injectable for tests)
 */
export function inspectJwt(token: string | null | undefined, nowSeconds: number = Date.now() / 1000): JwtInfo {
  const invalid = (reason: string): JwtInfo => ({
    valid: false,
    role: 'member',
    userId: null,
    email: null,
    expiresAt: null,
    reason,
  });

  if (!token || typeof token !== 'string') return invalid('missing token');

  const parts = token.split('.');
  if (parts.length !== 3) return invalid('malformed token');

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1] ?? ''));
  } catch {
    return invalid('unparseable payload');
  }

  const exp = typeof payload.exp === 'number' ? payload.exp : null;
  if (exp !== null && exp <= nowSeconds) {
    return { ...invalid('expired'), expiresAt: exp };
  }

  const appMeta = (payload.app_metadata ?? {}) as Record<string, unknown>;
  const role = coerceRole(appMeta.role ?? payload.role);

  return {
    valid: true,
    role,
    userId: typeof payload.sub === 'string' ? payload.sub : null,
    email: typeof payload.email === 'string' ? payload.email : null,
    expiresAt: exp,
  };
}

/** Convenience: is this token an admin token (and valid)? */
export function isAdminToken(token: string | null | undefined, nowSeconds?: number): boolean {
  const info = inspectJwt(token, nowSeconds);
  return info.valid && info.role === 'admin';
}
