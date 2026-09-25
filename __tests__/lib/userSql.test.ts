import { buildCreateUserSql, sqlEscape, generateTempPassword } from '@/lib/userSql';

describe('sqlEscape', () => {
  it('doubles single quotes', () => {
    expect(sqlEscape("O'Brien")).toBe("O''Brien");
  });
});

describe('buildCreateUserSql', () => {
  const base = { email: 'new@company.com', displayName: 'New Person', role: 'member' as const, password: 'Temp123abc' };

  it('embeds email, name, password and role', () => {
    const sql = buildCreateUserSql(base);
    expect(sql).toContain("u_email text := 'new@company.com'");
    expect(sql).toContain("u_name  text := 'New Person'");
    expect(sql).toContain("u_pass  text := 'Temp123abc'");
    expect(sql).toContain("u_role  text := 'member'");
  });

  it('hashes the password with crypt and creates an identity', () => {
    const sql = buildCreateUserSql(base);
    expect(sql).toContain("crypt(u_pass, gen_salt('bf'))");
    expect(sql).toContain('insert into auth.identities');
    expect(sql).toContain("'role',u_role");
  });

  it('sets token columns to empty strings (GoTrue-safe)', () => {
    const sql = buildCreateUserSql(base);
    expect(sql).toContain('confirmation_token');
    expect(sql).toContain("'', '', '', '', '', '', '', ''");
  });

  it('coerces unknown roles to member', () => {
    // @ts-expect-error testing runtime guard
    const sql = buildCreateUserSql({ ...base, role: 'superuser' });
    expect(sql).toContain("u_role  text := 'member'");
  });

  it('escapes injection attempts in inputs', () => {
    const sql = buildCreateUserSql({ ...base, displayName: "x'; drop table auth.users; --" });
    expect(sql).toContain("x''; drop table auth.users; --");
    expect(sql).not.toContain("'x'; drop");
  });
});

describe('generateTempPassword', () => {
  it('has the requested length and mixed characters', () => {
    const pw = generateTempPassword(12);
    expect(pw).toHaveLength(12);
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/[0-9]/);
  });
});
