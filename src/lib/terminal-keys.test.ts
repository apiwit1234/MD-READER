import { describe, it, expect } from 'vitest';
import { isPlainCtrlC } from './terminal-keys';

function ev(overrides: Partial<Parameters<typeof isPlainCtrlC>[0]> = {}) {
  return { type: 'keydown', key: 'c', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, ...overrides };
}

describe('isPlainCtrlC', () => {
  it('matches Ctrl+C keydown (both cases)', () => {
    expect(isPlainCtrlC(ev())).toBe(true);
    expect(isPlainCtrlC(ev({ key: 'C' }))).toBe(true);
  });

  it('rejects modified combos and other keys', () => {
    expect(isPlainCtrlC(ev({ shiftKey: true }))).toBe(false);
    expect(isPlainCtrlC(ev({ altKey: true }))).toBe(false);
    expect(isPlainCtrlC(ev({ metaKey: true }))).toBe(false);
    expect(isPlainCtrlC(ev({ ctrlKey: false }))).toBe(false);
    expect(isPlainCtrlC(ev({ key: 'v' }))).toBe(false);
  });

  it('rejects keyup', () => {
    expect(isPlainCtrlC(ev({ type: 'keyup' }))).toBe(false);
  });
});
