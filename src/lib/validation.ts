import { validateEmailFormat } from '@/lib/emailCheck';

/** Pure input validation helpers used across auth + entry forms. */

/** Strict syntax check (see emailCheck.ts). Does not touch the network. */
export function isValidEmail(email: string): boolean {
  return validateEmailFormat(email).valid;
}

export interface PasswordCheck {
  valid: boolean;
  reasons: string[];
}

export function checkPassword(password: string): PasswordCheck {
  const reasons: string[] = [];
  if (typeof password !== 'string' || password.length < 8) reasons.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) reasons.push('One uppercase letter');
  if (!/[a-z]/.test(password)) reasons.push('One lowercase letter');
  if (!/[0-9]/.test(password)) reasons.push('One number');
  return { valid: reasons.length === 0, reasons };
}

/** Trim + cap a free-text note to keep payloads bounded. */
export function sanitizeNote(note: string, maxLen = 280): string {
  if (typeof note !== 'string') return '';
  return note.trim().slice(0, maxLen);
}
