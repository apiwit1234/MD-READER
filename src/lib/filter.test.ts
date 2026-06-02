import { describe, it, expect } from 'vitest';
import { filterTree, pruneToMarkdown } from './filter';
import type { FsNode } from '@/types';

const fixture: FsNode = {
  name: 'root',
  type: 'dir',
  relativePath: '',
  children: [
    {
      name: 'docs',
      type: 'dir',
      relativePath: 'docs',
      children: [
        { name: 'setup.md', type: 'file', relativePath: 'docs/setup.md' },
        { name: 'guide.md', type: 'file', relativePath: 'docs/guide.md' },
      ],
    },
    {
      name: 'empty',
      type: 'dir',
      relativePath: 'empty',
      children: [
        { name: 'other.md', type: 'file', relativePath: 'empty/other.md' },
      ],
    },
    { name: 'README.md', type: 'file', relativePath: 'README.md' },
  ],
};

describe('filterTree', () => {
  it('returns the tree unchanged when query is empty', () => {
    expect(filterTree(fixture, '')).toEqual(fixture);
  });

  it('keeps only files whose name matches (case-insensitive)', () => {
    const out = filterTree(fixture, 'SETUP');
    expect(out).not.toBeNull();
    expect(out?.children).toHaveLength(1);
    expect(out?.children?.[0].name).toBe('docs');
    expect(out?.children?.[0].children).toHaveLength(1);
    expect(out?.children?.[0].children?.[0].name).toBe('setup.md');
  });

  it('returns null when nothing matches anywhere', () => {
    expect(filterTree(fixture, 'nothing-here')).toBeNull();
  });

  it('prunes empty directories', () => {
    const out = filterTree(fixture, 'setup');
    expect(out?.children?.find((c) => c.name === 'empty')).toBeUndefined();
  });

  it('keeps a top-level file match', () => {
    const out = filterTree(fixture, 'readme');
    expect(out?.children?.map((c) => c.name)).toEqual(['README.md']);
  });
});

describe('pruneToMarkdown', () => {
  const mixed: FsNode = {
    name: 'root', type: 'dir', relativePath: '', children: [
      { name: 'src', type: 'dir', relativePath: 'src', children: [
        { name: 'a.ts', type: 'file', relativePath: 'src/a.ts' },
        { name: 'notes.md', type: 'file', relativePath: 'src/notes.md' },
      ] },
      { name: 'code', type: 'dir', relativePath: 'code', children: [
        { name: 'main.cs', type: 'file', relativePath: 'code/main.cs' },
      ] },
      { name: 'README.md', type: 'file', relativePath: 'README.md' },
      { name: 'Dockerfile', type: 'file', relativePath: 'Dockerfile' },
    ],
  };

  it('keeps only markdown files and drops markdown-free directories', () => {
    const out = pruneToMarkdown(mixed);
    const names = out?.children?.map((c) => c.name);
    expect(names).toContain('src');
    expect(names).toContain('README.md');
    expect(names).not.toContain('Dockerfile');
    expect(names).not.toContain('code'); // dir with only main.cs is dropped
    const src = out?.children?.find((c) => c.name === 'src');
    expect(src?.children?.map((c) => c.name)).toEqual(['notes.md']);
  });

  it('returns null when a directory has no markdown anywhere', () => {
    const noMd: FsNode = {
      name: 'root', type: 'dir', relativePath: '', children: [
        { name: 'a.ts', type: 'file', relativePath: 'a.ts' },
      ],
    };
    expect(pruneToMarkdown(noMd)).toBeNull();
  });
});
