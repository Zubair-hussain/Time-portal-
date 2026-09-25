import { normalizeSeconds, durationBetween, formatClock, formatHuman, toHours } from '@/lib/time';

describe('time utilities', () => {
  describe('normalizeSeconds', () => {
    it('floors positive values', () => {
      expect(normalizeSeconds(59.9)).toBe(59);
    });
    it('clamps negatives and NaN to 0', () => {
      expect(normalizeSeconds(-5)).toBe(0);
      expect(normalizeSeconds(NaN)).toBe(0);
      expect(normalizeSeconds(Infinity)).toBe(0);
    });
  });

  describe('durationBetween', () => {
    it('computes seconds between ISO timestamps', () => {
      expect(durationBetween('2026-09-25T10:00:00Z', '2026-09-25T10:01:30Z')).toBe(90);
    });
    it('returns 0 for invalid input', () => {
      expect(durationBetween('nope', '2026-09-25T10:00:00Z')).toBe(0);
    });
    it('never returns negative for reversed times', () => {
      expect(durationBetween('2026-09-25T11:00:00Z', '2026-09-25T10:00:00Z')).toBe(0);
    });
  });

  describe('formatClock', () => {
    it('formats H:MM:SS', () => {
      expect(formatClock(3661)).toBe('1:01:01');
      expect(formatClock(59)).toBe('0:00:59');
    });
  });

  describe('formatHuman', () => {
    it.each([
      [30, '30s'],
      [90, '1m'],
      [3600, '1h'],
      [8100, '2h 15m'],
    ])('formats %i seconds as %s', (input, expected) => {
      expect(formatHuman(input)).toBe(expected);
    });
  });

  describe('toHours', () => {
    it('rounds to 2 decimals', () => {
      expect(toHours(5400)).toBe(1.5);
      expect(toHours(3660)).toBe(1.02);
    });
  });
});
