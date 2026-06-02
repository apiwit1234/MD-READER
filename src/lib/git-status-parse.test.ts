import { describe, it, expect } from 'vitest';
import { parseStatus } from './git-status-parse';

const NUL = '\0';

describe('parseStatus', () => {
  it('parses branch header with ahead/behind', () => {
    const raw = `## main...origin/main [ahead 2, behind 1]${NUL}`;
    const s = parseStatus(raw);
    expect(s.branch).toBe('main');
    expect(s.upstream).toBe('origin/main');
    expect(s.ahead).toBe(2);
    expect(s.behind).toBe(1);
    expect(s.files).toEqual([]);
  });

  it('parses a branch with no upstream', () => {
    const s = parseStatus(`## feature/x${NUL}`);
    expect(s.branch).toBe('feature/x');
    expect(s.upstream).toBeNull();
    expect(s.ahead).toBe(0);
    expect(s.behind).toBe(0);
  });

  it('parses modified, staged, and untracked files', () => {
    const raw = [
      '## main...origin/main',
      ' M src/a.ts',   // unstaged modified
      'M  src/b.ts',   // staged modified
      '?? new.txt',    // untracked
    ].join(NUL) + NUL;
    const s = parseStatus(raw);
    expect(s.files).toHaveLength(3);
    expect(s.files[0]).toMatchObject({ path: 'src/a.ts', index: ' ', workingTree: 'M', conflicted: false });
    expect(s.files[1]).toMatchObject({ path: 'src/b.ts', index: 'M', workingTree: ' ', conflicted: false });
    expect(s.files[2]).toMatchObject({ path: 'new.txt', index: '?', workingTree: '?', conflicted: false });
  });

  it('parses a rename entry consuming the original path token', () => {
    const raw = `## main${NUL}R  new.ts${NUL}old.ts${NUL}`;
    const s = parseStatus(raw);
    expect(s.files).toHaveLength(1);
    expect(s.files[0]).toMatchObject({ path: 'new.ts', origPath: 'old.ts', index: 'R' });
  });

  it('flags conflicted files (UU, AA)', () => {
    const raw = `## main${NUL}UU both.ts${NUL}AA add.ts${NUL}`;
    const s = parseStatus(raw);
    expect(s.files[0]).toMatchObject({ path: 'both.ts', conflicted: true });
    expect(s.files[1]).toMatchObject({ path: 'add.ts', conflicted: true });
  });

  it('handles "No commits yet"', () => {
    const s = parseStatus(`## No commits yet on main${NUL}`);
    expect(s.branch).toBe('main');
    expect(s.upstream).toBeNull();
  });
});
