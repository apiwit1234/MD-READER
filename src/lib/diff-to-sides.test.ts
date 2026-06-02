import { describe, it, expect } from 'vitest';
import { diffToSides, type SideRow } from './diff-to-sides';

describe('diffToSides', () => {
  it('returns empty for empty input', () => {
    expect(diffToSides('')).toEqual([]);
  });

  it('aligns a single modified line as left/right on one row', () => {
    const diff = [
      'diff --git a/f.ts b/f.ts',
      'index 111..222 100644',
      '--- a/f.ts',
      '+++ b/f.ts',
      '@@ -1,3 +1,3 @@',
      ' const a = 1;',
      '-const b = 2;',
      '+const b = 3;',
      ' const c = 4;',
    ].join('\n');
    const rows = diffToSides(diff);
    expect(rows).toEqual<SideRow[]>([
      { leftNum: 1, leftText: 'const a = 1;', rightNum: 1, rightText: 'const a = 1;', kind: 'context' },
      { leftNum: 2, leftText: 'const b = 2;', rightNum: 2, rightText: 'const b = 3;', kind: 'modified' },
      { leftNum: 3, leftText: 'const c = 4;', rightNum: 3, rightText: 'const c = 4;', kind: 'context' },
    ]);
  });

  it('handles a pure addition (left blank)', () => {
    const diff = [
      '@@ -1,1 +1,2 @@',
      ' a',
      '+b',
    ].join('\n');
    const rows = diffToSides(diff);
    expect(rows[1]).toEqual({ leftNum: null, leftText: null, rightNum: 2, rightText: 'b', kind: 'added' });
  });

  it('handles a pure deletion (right blank)', () => {
    const diff = [
      '@@ -1,2 +1,1 @@',
      ' a',
      '-b',
    ].join('\n');
    const rows = diffToSides(diff);
    expect(rows[1]).toEqual({ leftNum: 2, leftText: 'b', rightNum: null, rightText: null, kind: 'removed' });
  });

  it('zips unequal add/del runs (2 del, 1 add)', () => {
    const diff = [
      '@@ -1,2 +1,1 @@',
      '-x',
      '-y',
      '+z',
    ].join('\n');
    const rows = diffToSides(diff);
    expect(rows).toEqual<SideRow[]>([
      { leftNum: 1, leftText: 'x', rightNum: 1, rightText: 'z', kind: 'modified' },
      { leftNum: 2, leftText: 'y', rightNum: null, rightText: null, kind: 'removed' },
    ]);
  });
});
