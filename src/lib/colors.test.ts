import { describe, it, expect } from 'vitest';
import { FOLDER_COLORS, pickNextColor } from './colors';

describe('colors', () => {
  it('exposes six palette colors', () => {
    expect(FOLDER_COLORS).toHaveLength(6);
  });

  it('returns first color when none used', () => {
    expect(pickNextColor([])).toBe(FOLDER_COLORS[0]);
  });

  it('returns next unused color', () => {
    expect(pickNextColor([FOLDER_COLORS[0]])).toBe(FOLDER_COLORS[1]);
    expect(pickNextColor([FOLDER_COLORS[0], FOLDER_COLORS[1]])).toBe(FOLDER_COLORS[2]);
  });

  it('recycles when all colors used', () => {
    expect(pickNextColor([...FOLDER_COLORS])).toBe(FOLDER_COLORS[0]);
  });

  it('recycles starting from earliest reused', () => {
    const used = [...FOLDER_COLORS, FOLDER_COLORS[0]];
    expect(pickNextColor(used)).toBe(FOLDER_COLORS[1]);
  });
});
