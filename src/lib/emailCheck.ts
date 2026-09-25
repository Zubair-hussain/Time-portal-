/**
 * Email verification helpers.
 *
 * Layers (cheapest first):
 *  1. Format      — strict syntax check, no network.
 *  2. Disposable  — rejects throw-away inbox domains.
 *  3. Typo hint   — suggests "gmail.com" for "gmial.com" (non-blocking).
 *  4. Deliverable — DNS lookup (via DNS-over-HTTPS) confirms the DOMAIN can receive mail.
 *
 * Only the domain part is ever sent over the network, never the full address.
 * This cannot prove a specific mailbox exists or that the person owns it; that
 * needs a confirmation email, which this app does not send.
 */

export type EmailStatus = 'valid' | 'invalid' | 'unknown';

export interface EmailVerdict {
  status: EmailStatus;
  /** Normalised (trimmed, lowercased) address. */
  email: string;
  reason?: string;
  /** A likely-intended address when the domain looks like a typo. */
  suggestion?: string;
}

const LOCAL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'live.com',
  'aol.com',
];

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'throwawaymail.com',
]);

export function normalizeEmail(email: string): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/** Strict syntax check. Returns a human reason when invalid. */
export function validateEmailFormat(input: string): { valid: boolean; email: string; reason?: string } {
  const email = normalizeEmail(input);
  const fail = (reason: string) => ({ valid: false, email, reason });

  if (!email) return fail('Email is required.');
  if (email.length > 254) return fail('Email is too long.');

  const at = email.lastIndexOf('@');
  if (at < 1 || email.indexOf('@') !== at) return fail('Email must contain exactly one @.');

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length > 64) return fail('The part before @ is too long.');
  if (!LOCAL_RE.test(local)) return fail('The part before @ has invalid characters or dots.');

  const labels = domain.split('.');
  if (labels.length < 2) return fail('Domain must include a dot, like example.com.');
  if (!labels.every((l) => LABEL_RE.test(l))) return fail('The domain contains invalid characters.');
  const tld = labels[labels.length - 1] ?? '';
  if (!/^[a-z]{2,63}$/i.test(tld)) return fail('The domain ending (like .com) is not valid.');

  return { valid: true, email };
}

export function domainOf(email: string): string {
  return normalizeEmail(email).split('@')[1] ?? '';
}

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

/** Levenshtein distance (small strings only). */
export function editDistance(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = dp[0] ?? 0;
    dp[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = dp[j] ?? 0;
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j] ?? 0, dp[j - 1] ?? 0);
      prev = tmp;
    }
  }
  return dp[b.length] ?? 0;
}

/** Suggest a corrected address when the domain is one typo away from a popular one. */
export function suggestEmail(input: string): string | undefined {
  const email = normalizeEmail(input);
  const domain = domainOf(email);
  if (!domain || COMMON_DOMAINS.includes(domain)) return undefined;
  const best = COMMON_DOMAINS.find((d) => editDistance(domain, d) <= 2);
  return best ? `${email.split('@')[0]}@${best}` : undefined;
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

interface DohResponse {
  Status?: number;
  Answer?: Array<{ type: number }>;
}

async function dohQuery(domain: string, type: 'MX' | 'A', fetchFn: FetchLike, signal?: AbortSignal): Promise<DohResponse> {
  const res = await fetchFn(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, { signal });
  if (!res.ok) throw new Error(`DNS lookup failed (${type})`);
  return (await res.json()) as DohResponse;
}

/**
 * Can this domain receive mail? 'yes' = has MX (or an A record fallback),
 * 'no' = the domain does not exist / accepts no mail, 'unknown' = lookup failed.
 */
export async function checkDomainDeliverable(
  domain: string,
  fetchFn: FetchLike = (u, i) => fetch(u, i) as ReturnType<FetchLike>,
  timeoutMs = 4000,
): Promise<'yes' | 'no' | 'unknown'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const mx = await dohQuery(domain, 'MX', fetchFn, controller.signal);
    if (mx.Status === 3) return 'no'; // NXDOMAIN
    if (mx.Answer?.some((a) => a.type === 15)) return 'yes';
    // No MX: RFC 5321 lets mail fall back to the domain's A record.
    const a = await dohQuery(domain, 'A', fetchFn, controller.signal);
    if (a.Status === 3) return 'no';
    return a.Answer?.some((r) => r.type === 1) ? 'yes' : 'no';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}

export interface VerifyOptions {
  fetchFn?: FetchLike;
  /** Skip the network step (format + disposable checks only). */
  offline?: boolean;
}

/** Full verification pipeline. Never throws. */
export async function verifyEmail(input: string, opts: VerifyOptions = {}): Promise<EmailVerdict> {
  const format = validateEmailFormat(input);
  if (!format.valid) return { status: 'invalid', email: format.email, reason: format.reason };

  const email = format.email;
  const domain = domainOf(email);
  const suggestion = suggestEmail(email);

  if (isDisposableDomain(domain)) {
    return { status: 'invalid', email, reason: 'Disposable email addresses are not allowed.', suggestion };
  }

  if (opts.offline) return { status: 'unknown', email, reason: 'Domain not checked (offline).', suggestion };

  const deliverable = await checkDomainDeliverable(domain, opts.fetchFn);
  if (deliverable === 'no') {
    return { status: 'invalid', email, reason: `${domain} cannot receive email. Check the spelling.`, suggestion };
  }
  if (deliverable === 'unknown') {
    return { status: 'unknown', email, reason: 'Could not check the domain right now.', suggestion };
  }
  return { status: 'valid', email, suggestion };
}
