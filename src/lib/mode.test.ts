import { describe, it, expect } from 'vitest';
import { MODES, isMode, nextMode, modeForKeydown } from './mode';

describe('mode core', () => {
  it('lists the three modes in order', () => {
    expect(MODES).toEqual(['md', 'code', 'terminal']);
  });

  it('isMode validates known values', () => {
    expect(isMode('md')).toBe(true);
    expect(isMode('code')).toBe(true);
    expect(isMode('terminal')).toBe(true);
    expect(isMode('nope')).toBe(false);
    expect(isMode(3)).toBe(false);
  });

  it('nextMode cycles md -> code -> terminal -> md', () => {
    expect(nextMode('md')).toBe('code');
    expect(nextMode('code')).toBe('terminal');
    expect(nextMode('terminal')).toBe('md');
  });

  it('modeForKeydown maps Ctrl+1/2/3 to modes', () => {
    expect(modeForKeydown({ ctrlKey: true, metaKey: false, key: '1' })).toBe('md');
    expect(modeForKeydown({ ctrlKey: true, metaKey: false, key: '2' })).toBe('code');
    expect(modeForKeydown({ ctrlKey: false, metaKey: true, key: '3' })).toBe('terminal');
  });

  it('modeForKeydown ignores keys without ctrl/meta or unknown digits', () => {
    expect(modeForKeydown({ ctrlKey: false, metaKey: false, key: '1' })).toBeNull();
    expect(modeForKeydown({ ctrlKey: true, metaKey: false, key: '4' })).toBeNull();
    expect(modeForKeydown({ ctrlKey: true, metaKey: false, key: 'a' })).toBeNull();
  });
});
