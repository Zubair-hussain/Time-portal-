import {
  validateEmailFormat,
  normalizeEmail,
  domainOf,
  isDisposableDomain,
  editDistance,
  suggestEmail,
  checkDomainDeliverable,
  verifyEmail,
} from '@/lib/emailCheck';

type Doh = { Status?: number; Answer?: Array<{ type: number }> };

/** Build a fetch mock that answers by record type. */
function dohFetch(byType: { MX?: Doh; A?: Doh }) {
  return jest.fn(async (url: string) => {
    const type = new URL(url).searchParams.get('type') as 'MX' | 'A';
    return { ok: true, json: async () => byType[type] ?? { Status: 0 } };
  });
}

describe('validateEmailFormat', () => {
  it.each(['hr070203@gmail.com', 'first.last+tag@sub.example.co.uk', "o'brien@company.io"])('accepts %s', (e) => {
    expect(validateEmailFormat(e).valid).toBe(true);
  });

  it.each([
    ['', /required/i],
    ['plain', /exactly one @/i],
    ['a@@b.com', /exactly one @/i],
    ['a@b', /dot/i],
    ['a..b@x.com', /before @/i],
    ['.a@x.com', /before @/i],
    ['a b@x.com', /before @/i],
    ['a@-x.com', /domain/i],
    ['a@x.c', /ending/i],
    ['a@x.123', /ending/i],
  ])('rejects %p', (e, reason) => {
    const r = validateEmailFormat(e);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(reason);
  });

  it('rejects over-long addresses', () => {
    expect(validateEmailFormat(`${'a'.repeat(65)}@x.com`).valid).toBe(false);
    expect(validateEmailFormat(`a@${'b'.repeat(250)}.com`).valid).toBe(false);
  });

  it('normalises case and whitespace', () => {
    expect(validateEmailFormat('  Zh@Gmail.COM ').email).toBe('zh@gmail.com');
    expect(normalizeEmail(undefined as unknown as string)).toBe('');
  });
});

describe('helpers', () => {
  it('extracts the domain', () => {
    expect(domainOf('A@Example.com')).toBe('example.com');
  });
  it('flags disposable domains', () => {
    expect(isDisposableDomain('Mailinator.com')).toBe(true);
    expect(isDisposableDomain('gmail.com')).toBe(false);
  });
  it('computes edit distance', () => {
    expect(editDistance('gmail.com', 'gmail.com')).toBe(0);
    expect(editDistance('gmial.com', 'gmail.com')).toBe(2);
    expect(editDistance('', 'abc')).toBe(3);
  });
  it('suggests corrections for near-miss popular domains', () => {
    expect(suggestEmail('sam@gmial.com')).toBe('sam@gmail.com');
    expect(suggestEmail('sam@gmail.com')).toBeUndefined();
    expect(suggestEmail('sam@company.io')).toBeUndefined();
    expect(suggestEmail('nonsense')).toBeUndefined();
  });
});

describe('checkDomainDeliverable', () => {
  it('yes when the domain has MX records', async () => {
    const f = dohFetch({ MX: { Status: 0, Answer: [{ type: 15 }] } });
    await expect(checkDomainDeliverable('gmail.com', f)).resolves.toBe('yes');
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('falls back to an A record when there is no MX', async () => {
    const f = dohFetch({ MX: { Status: 0 }, A: { Status: 0, Answer: [{ type: 1 }] } });
    await expect(checkDomainDeliverable('a-only.com', f)).resolves.toBe('yes');
  });
  it('no when the domain does not exist', async () => {
    await expect(checkDomainDeliverable('nope.invalid', dohFetch({ MX: { Status: 3 } }))).resolves.toBe('no');
  });
  it('no when there is neither MX nor A', async () => {
    await expect(checkDomainDeliverable('empty.com', dohFetch({ MX: { Status: 0 }, A: { Status: 0 } }))).resolves.toBe('no');
    await expect(checkDomainDeliverable('gone.com', dohFetch({ MX: { Status: 0 }, A: { Status: 3 } }))).resolves.toBe('no');
  });
  it('unknown when the lookup fails or errors', async () => {
    const boom = jest.fn().mockRejectedValue(new Error('network'));
    await expect(checkDomainDeliverable('x.com', boom)).resolves.toBe('unknown');
    const bad = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(checkDomainDeliverable('x.com', bad)).resolves.toBe('unknown');
  });
});

describe('verifyEmail', () => {
  const mxOk = dohFetch({ MX: { Status: 0, Answer: [{ type: 15 }] } });

  it('valid for a deliverable address', async () => {
    await expect(verifyEmail('Zh@Gmail.com', { fetchFn: mxOk })).resolves.toEqual({
      status: 'valid',
      email: 'zh@gmail.com',
      suggestion: undefined,
    });
  });
  it('invalid (no network) for bad syntax', async () => {
    const f = jest.fn();
    const v = await verifyEmail('nope', { fetchFn: f });
    expect(v.status).toBe('invalid');
    expect(f).not.toHaveBeenCalled();
  });
  it('invalid for disposable domains', async () => {
    const v = await verifyEmail('x@mailinator.com', { fetchFn: mxOk });
    expect(v).toMatchObject({ status: 'invalid', reason: expect.stringMatching(/disposable/i) });
  });
  it('invalid when the domain cannot receive mail, with a typo suggestion', async () => {
    const v = await verifyEmail('sam@gmial.com', { fetchFn: dohFetch({ MX: { Status: 3 } }) });
    expect(v.status).toBe('invalid');
    expect(v.suggestion).toBe('sam@gmail.com');
  });
  it('unknown (not blocked) when DNS is unreachable', async () => {
    const v = await verifyEmail('a@example.com', { fetchFn: jest.fn().mockRejectedValue(new Error('x')) });
    expect(v.status).toBe('unknown');
  });
  it('offline mode skips the network', async () => {
    const f = jest.fn();
    const v = await verifyEmail('a@example.com', { fetchFn: f, offline: true });
    expect(v.status).toBe('unknown');
    expect(f).not.toHaveBeenCalled();
  });
});
