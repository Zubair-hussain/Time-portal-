import { inspectJwt, isAdminToken } from '@/lib/jwt';

/** Build an unsigned test JWT with the given payload. */
function makeToken(payload: Record<string, unknown>): string {
  const enc = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.sig`;
}

const NOW = 1_700_000_000;

describe('inspectJwt', () => {
  it('rejects missing tokens', () => {
    expect(inspectJwt(null).valid).toBe(false);
    expect(inspectJwt(undefined).reason).toBe('missing token');
  });

  it('rejects malformed tokens', () => {
    expect(inspectJwt('a.b').valid).toBe(false);
    expect(inspectJwt('a.b').reason).toBe('malformed token');
  });

  it('rejects expired tokens', () => {
    const token = makeToken({ sub: 'u1', exp: NOW - 10 });
    const info = inspectJwt(token, NOW);
    expect(info.valid).toBe(false);
    expect(info.reason).toBe('expired');
    expect(info.expiresAt).toBe(NOW - 10);
  });

  it('parses a valid member token', () => {
    const token = makeToken({ sub: 'u1', email: 'm@x.com', exp: NOW + 3600 });
    const info = inspectJwt(token, NOW);
    expect(info).toMatchObject({ valid: true, role: 'member', userId: 'u1', email: 'm@x.com' });
  });

  it('reads admin role from app_metadata', () => {
    const token = makeToken({ sub: 'a1', app_metadata: { role: 'admin' }, exp: NOW + 3600 });
    expect(inspectJwt(token, NOW).role).toBe('admin');
  });

  it('defaults unknown roles to member', () => {
    const token = makeToken({ sub: 'a1', app_metadata: { role: 'superuser' }, exp: NOW + 3600 });
    expect(inspectJwt(token, NOW).role).toBe('member');
  });

  it('handles unparseable payloads', () => {
    const bad = `${Buffer.from('{}').toString('base64url')}.%%%.sig`;
    expect(inspectJwt(bad, NOW).reason).toBe('unparseable payload');
  });
});

describe('isAdminToken', () => {
  it('is true only for valid admin tokens', () => {
    const admin = makeToken({ sub: 'a1', app_metadata: { role: 'admin' }, exp: NOW + 100 });
    const member = makeToken({ sub: 'm1', exp: NOW + 100 });
    expect(isAdminToken(admin, NOW)).toBe(true);
    expect(isAdminToken(member, NOW)).toBe(false);
    expect(isAdminToken(null, NOW)).toBe(false);
  });
});
