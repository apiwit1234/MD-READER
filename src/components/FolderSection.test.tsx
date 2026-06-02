import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FolderSection } from './FolderSection';

const tree = vi.fn();

beforeEach(() => {
  tree.mockReset();
  window.mdreader = {
    fs: {
      tree,
      browse: vi.fn(),
      read: vi.fn(),
      pickDirectory: vi.fn(),
      homeDir: vi.fn(),
      watch: vi.fn().mockResolvedValue(true),
      unwatch: vi.fn().mockResolvedValue(undefined),
      onChanged: vi.fn(() => () => {}),
    },
    term: {
      spawn: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      onData: vi.fn(() => () => {}),
      onExit: vi.fn(() => () => {}),
    },
  } as never;
});

const folder = {
  id: 'f1',
  hostPath: 'C:\\damon',
  name: 'damon',
  color: '#2563eb',
  expanded: true,
};

describe('FolderSection', () => {
  it('renders folder name and color dot', () => {
    tree.mockResolvedValueOnce({ name: 'damon', type: 'dir', relativePath: '', children: [] });
    render(<FolderSection folder={folder} activeFile={null} onPickFile={() => {}} onClose={() => {}} />);
    expect(screen.getByText('damon')).toBeInTheDocument();
  });

  it('invokes onClose when × clicked', () => {
    tree.mockResolvedValueOnce({ name: 'damon', type: 'dir', relativePath: '', children: [] });
    let closed = 0;
    render(<FolderSection folder={folder} activeFile={null} onPickFile={() => {}} onClose={() => closed++} />);
    fireEvent.click(screen.getByRole('button', { name: /close folder damon/i }));
    expect(closed).toBe(1);
  });

  it('fetches and shows tree contents', async () => {
    tree.mockResolvedValueOnce({
      name: 'damon',
      type: 'dir',
      relativePath: '',
      children: [{ name: 'README.md', type: 'file', relativePath: 'README.md' }],
    });
    render(<FolderSection folder={folder} activeFile={null} onPickFile={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('README.md')).toBeInTheDocument());
  });
});
