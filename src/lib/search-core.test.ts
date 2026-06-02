import { describe, it, expect } from 'vitest';
import { scanFiles } from './search-core';

const files = [
  { hostPath: '/a/setup.md',  content: 'Line 1\nrun docker compose up to start\nLine 3' },
  { hostPath: '/a/guide.md',  content: 'no matches here\njust filler' },
  { hostPath: '/a/readme.md', content: 'Start at top\nthen Start again\nfinish' },
];

describe('scanFiles', () => {
  it('returns line+column for each match, 1-based lines and 0-based columns', () => {
    const r = scanFiles({ files, query: 'start', caseSensitive: false, maxMatches: 1000 });
    const setup = r.files.find((f) => f.hostPath === '/a/setup.md')!;
    expect(setup.matches).toEqual([{ line: 2, column: 25, lineText: 'run docker compose up to start' }]);
    const readme = r.files.find((f) => f.hostPath === '/a/readme.md')!;
    expect(readme.matches.map((m) => m.line)).toEqual([1, 2]);
  });

  it('omits files with zero matches', () => {
    const r = scanFiles({ files, query: 'start', caseSensitive: false, maxMatches: 1000 });
    expect(r.files.find((f) => f.hostPath === '/a/guide.md')).toBeUndefined();
  });

  it('respects case sensitivity', () => {
    const r = scanFiles({ files, query: 'Start', caseSensitive: true, maxMatches: 1000 });
    const readme = r.files.find((f) => f.hostPath === '/a/readme.md')!;
    expect(readme.matches.map((m) => m.line)).toEqual([1, 2]);
    expect(r.files.find((f) => f.hostPath === '/a/setup.md')).toBeUndefined();
  });

  it('caps at maxMatches and sets truncated', () => {
    const r = scanFiles({ files, query: 'start', caseSensitive: false, maxMatches: 2 });
    expect(r.totalMatches).toBe(2);
    expect(r.truncated).toBe(true);
  });

  it('orders files by hostPath ascending', () => {
    const r = scanFiles({ files, query: 'start', caseSensitive: false, maxMatches: 1000 });
    const paths = r.files.map((f) => f.hostPath);
    expect(paths).toEqual([...paths].sort());
  });

  it('truncates long lines around the match with ellipses', () => {
    const long = 'x'.repeat(300) + ' MATCH ' + 'y'.repeat(300);
    const r = scanFiles({
      files: [{ hostPath: '/x.md', content: long }],
      query: 'MATCH',
      caseSensitive: false,
      maxMatches: 10,
    });
    const snippet = r.files[0].matches[0].lineText;
    expect(snippet.length).toBeLessThanOrEqual(202);
    expect(snippet).toContain('MATCH');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('handles multi-byte characters without splitting glyphs', () => {
    const content = 'aaa🌟MATCH🌟bbb';
    const r = scanFiles({
      files: [{ hostPath: '/x.md', content }],
      query: 'MATCH',
      caseSensitive: false,
      maxMatches: 10,
    });
    expect(r.files[0].matches[0].lineText).toContain('🌟MATCH🌟');
  });
});
