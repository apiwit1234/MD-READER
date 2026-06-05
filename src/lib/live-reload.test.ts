import { describe, it, expect } from 'vitest';
import { reloadAction, isUnderRoot } from './live-reload';

describe('reloadAction', () => {
  it('ignores when disk matches known content (own-save echo)', () => {
    expect(reloadAction('same', 'same', 'none')).toBe('ignore');
    expect(reloadAction('same', 'same', 'clean')).toBe('ignore');
    expect(reloadAction('same', 'same', 'dirty')).toBe('ignore');
  });

  it('refreshes when content differs and buffer is clean or absent', () => {
    expect(reloadAction('new', 'old', 'none')).toBe('refresh');
    expect(reloadAction('new', 'old', 'clean')).toBe('refresh');
    expect(reloadAction('new', undefined, 'none')).toBe('refresh');
  });

  it('keeps edits when content differs and buffer is dirty', () => {
    expect(reloadAction('new', 'old', 'dirty')).toBe('keep-edits');
  });
});

describe('isUnderRoot', () => {
  it('matches the root itself and children, case-insensitively', () => {
    expect(isUnderRoot('C:\\Docs\\a.md', 'C:\\Docs')).toBe(true);
    expect(isUnderRoot('c:\\docs\\sub\\a.md', 'C:\\DOCS')).toBe(true);
    expect(isUnderRoot('C:\\Docs', 'C:\\Docs')).toBe(true);
  });

  it('does not match sibling prefixes', () => {
    expect(isUnderRoot('C:\\Docs2\\a.md', 'C:\\Docs')).toBe(false);
    expect(isUnderRoot('C:\\ab', 'C:\\a')).toBe(false);
  });

  it('handles mixed separators and trailing slashes', () => {
    expect(isUnderRoot('C:/Docs/a.md', 'C:\\Docs\\')).toBe(true);
  });
});
