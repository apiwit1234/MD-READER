import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileTree } from './FileTree';
import type { FsNode } from '@/types';

const tree: FsNode[] = [
  {
    name: 'docs',
    type: 'dir',
    relativePath: 'docs',
    children: [{ name: 'setup.md', type: 'file', relativePath: 'docs/setup.md' }],
  },
  { name: 'README.md', type: 'file', relativePath: 'README.md' },
];

describe('FileTree', () => {
  it('renders top-level entries', () => {
    render(<FileTree nodes={tree} activePath={null} onPickFile={() => {}} />);
    expect(screen.getByText('docs')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('does not show subfolder children until expanded', () => {
    render(<FileTree nodes={tree} activePath={null} onPickFile={() => {}} />);
    expect(screen.queryByText('setup.md')).not.toBeInTheDocument();
  });

  it('expands subfolder on click', async () => {
    const user = userEvent.setup();
    render(<FileTree nodes={tree} activePath={null} onPickFile={() => {}} />);
    await user.click(screen.getByText('docs'));
    expect(screen.getByText('setup.md')).toBeInTheDocument();
  });

  it('invokes onPickFile when md file clicked', async () => {
    const user = userEvent.setup();
    const picks: string[] = [];
    render(<FileTree nodes={tree} activePath={null} onPickFile={(p) => picks.push(p)} />);
    await user.click(screen.getByText('README.md'));
    expect(picks).toEqual(['README.md']);
  });

  it('highlights the active file', () => {
    render(<FileTree nodes={tree} activePath="README.md" onPickFile={() => {}} />);
    const item = screen.getByText('README.md').closest('button')!;
    expect(item.className).toMatch(/bg-accent-soft/);
  });

  it('makes non-markdown files clickable (Code mode opens any file)', async () => {
    const user = userEvent.setup();
    const picks: string[] = [];
    const treeWithCode: FsNode[] = [{ name: 'main.cs', type: 'file', relativePath: 'main.cs' }];
    render(<FileTree nodes={treeWithCode} activePath={null} onPickFile={(p) => picks.push(p)} />);
    await user.click(screen.getByText('main.cs'));
    expect(picks).toEqual(['main.cs']);
  });
});

const treeForForceExpanded: FsNode[] = [
  {
    name: 'docs',
    type: 'dir',
    relativePath: 'docs',
    children: [{ name: 'setup.md', type: 'file', relativePath: 'docs/setup.md' }],
  },
];

describe('FileTree forceExpanded', () => {
  it('hides children by default (folder closed)', () => {
    render(<FileTree nodes={treeForForceExpanded} activePath={null} onPickFile={() => {}} />);
    expect(screen.queryByText('setup.md')).toBeNull();
  });

  it('shows children when forceExpanded is true', () => {
    render(<FileTree nodes={treeForForceExpanded} activePath={null} onPickFile={() => {}} forceExpanded />);
    expect(screen.getByText('setup.md')).toBeInTheDocument();
  });
});
