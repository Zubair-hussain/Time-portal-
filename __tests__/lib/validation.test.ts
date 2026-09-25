import { isValidEmail, checkPassword, sanitizeNote } from '@/lib/validation';

describe('validation', () => {
  describe('isValidEmail', () => {
    it('accepts well-formed addresses', () => {
      expect(isValidEmail('hr070203@gmail.com')).toBe(true);
    });
    it('rejects malformed addresses', () => {
      expect(isValidEmail('nope')).toBe(false);
      expect(isValidEmail('a@b')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('checkPassword', () => {
    it('accepts a strong password', () => {
      expect(checkPassword('Abcdef12').valid).toBe(true);
    });
    it('lists all missing requirements', () => {
      const res = checkPassword('abc');
      expect(res.valid).toBe(false);
      expect(res.reasons).toEqual(
        expect.arrayContaining(['At least 8 characters', 'One uppercase letter', 'One number']),
      );
    });
  });

  describe('sanitizeNote', () => {
    it('trims and caps length', () => {
      expect(sanitizeNote('  hi  ')).toBe('hi');
      expect(sanitizeNote('x'.repeat(500)).length).toBe(280);
    });
    it('handles non-strings defensively', () => {
      // @ts-expect-error testing runtime guard
      expect(sanitizeNote(null)).toBe('');
    });
  });
});
