import { describe, it, expect } from 'vitest';
import { progressPercent } from './load-progress';

describe('progressPercent', () => {
  it('returns 0 when total is 0', () => {
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(5, 0)).toBe(0);
  });
  it('computes a clamped integer percentage', () => {
    expect(progressPercent(1, 4)).toBe(25);
    expect(progressPercent(4, 4)).toBe(100);
    expect(progressPercent(10, 4)).toBe(100);
  });
});
