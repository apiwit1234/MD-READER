import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FolderPickerModal } from './FolderPickerModal';

const browse = vi.fn();
const homeDir = vi.fn();

beforeEach(() => {
  browse.mockReset();
  homeDir.mockReset().mockResolvedValue('C:\\Users\\me');
  window.mdreader = {
    fs: {
      browse,
      homeDir,
      tree: vi.fn(),
      read: vi.fn(),
      pickDirectory: vi.fn(),
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

function mockBrowse(currentPath: string, entryNames: string[]) {
  browse.mockResolvedValueOnce({
    currentPath,
    entries: entryNames.map((name) => ({ name, type: 'dir' })),
    breadcrumbs: currentPath.split(/[\\/]/).filter(Boolean).map((part, i, arr) => ({
      name: part,
      path: arr.slice(0, i + 1).join('\\'),
    })),
  });
}

describe('FolderPickerModal', () => {
  it('loads home on open and shows entries', async () => {
    mockBrowse('C:\\Users\\me', ['arceus', 'damon']);
    render(<FolderPickerModal isOpen onClose={() => {}} onPick={() => {}} recentFolders={[]} />);
    await waitFor(() => expect(screen.getByText('damon')).toBeInTheDocument());
    expect(screen.getByText('arceus')).toBeInTheDocument();
  });

  it('navigates into a subfolder when clicked', async () => {
    mockBrowse('C:\\Users\\me', ['damon']);
    mockBrowse('C:\\Users\\me\\damon', ['docs']);
    render(<FolderPickerModal isOpen onClose={() => {}} onPick={() => {}} recentFolders={[]} />);
    await waitFor(() => screen.getByText('damon'));
    fireEvent.click(screen.getByText('damon'));
    await waitFor(() => expect(screen.getByText('docs')).toBeInTheDocument());
  });

  it('invokes onPick with current path when Open clicked', async () => {
    mockBrowse('C:\\Users\\me', ['damon']);
    mockBrowse('C:\\Users\\me\\damon', []);
    const picks: string[] = [];
    render(<FolderPickerModal isOpen onClose={() => {}} onPick={(p) => picks.push(p)} recentFolders={[]} />);
    await waitFor(() => screen.getByText('damon'));
    fireEvent.click(screen.getByText('damon'));
    await waitFor(() => screen.getByText(/open this folder/i));
    fireEvent.click(screen.getByRole('button', { name: /open this folder/i }));
    expect(picks).toEqual(['C:\\Users\\me\\damon']);
  });

  it('renders recent folders section', async () => {
    mockBrowse('C:\\Users\\me', []);
    render(
      <FolderPickerModal
        isOpen
        onClose={() => {}}
        onPick={() => {}}
        recentFolders={[{ hostPath: 'C:\\Users\\me\\damon', lastOpenedAt: 1 }]}
      />,
    );
    await waitFor(() => screen.getByText(/recent/i));
    expect(screen.getByText('C:\\Users\\me\\damon')).toBeInTheDocument();
  });
});
