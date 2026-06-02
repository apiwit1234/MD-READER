import { describe, it, expect } from 'vitest';
import { isPathUnderRoots } from './safe-write';

describe('isPathUnderRoots', () => {
  it('accepts a file directly under a root', () => {
    expect(isPathUnderRoots('C:\\proj\\a.ts', ['C:\\proj'])).toBe(true);
  });
  it('accepts a nested file', () => {
    expect(isPathUnderRoots('C:\\proj\\src\\a.ts', ['C:\\proj'])).toBe(true);
  });
  it('rejects a sibling-prefix trick', () => {
    expect(isPathUnderRoots('C:\\project-evil\\a.ts', ['C:\\proj'])).toBe(false);
  });
  it('rejects a path outside all roots', () => {
    expect(isPathUnderRoots('C:\\other\\a.ts', ['C:\\proj'])).toBe(false);
  });
  it('works with posix separators', () => {
    expect(isPathUnderRoots('/home/u/proj/a.ts', ['/home/u/proj'])).toBe(true);
    expect(isPathUnderRoots('/home/u/evil/a.ts', ['/home/u/proj'])).toBe(false);
  });

  it('rejects ".." traversal that escapes the root', () => {
    expect(isPathUnderRoots('/home/u/proj/../etc/passwd', ['/home/u/proj'])).toBe(false);
    expect(isPathUnderRoots('C:\\proj\\..\\evil\\x', ['C:\\proj'])).toBe(false);
  });

  it('allows ".." that stays within the root', () => {
    expect(isPathUnderRoots('/home/u/proj/sub/../a.ts', ['/home/u/proj'])).toBe(true);
  });
});
