import { describe, it, expect } from 'vitest';
import { isTruncated } from './dom-truncation';

describe('isTruncated', () => {
  it('is true when content overflows its box', () => {
    expect(isTruncated({ scrollWidth: 200, clientWidth: 120 })).toBe(true);
  });
  it('is false when content fits', () => {
    expect(isTruncated({ scrollWidth: 100, clientWidth: 120 })).toBe(false);
    expect(isTruncated({ scrollWidth: 120, clientWidth: 120 })).toBe(false);
  });
  it('is false for null', () => {
    expect(isTruncated(null)).toBe(false);
  });
});
