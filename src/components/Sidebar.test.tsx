import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import type { OpenedFolder } from '@/types';

beforeEach(() => {
  window.mdreader = {
    fs: {
      tree: vi.fn().mockResolvedValue({ name: 'x', type: 'dir', relativePath: '', children: [] }),
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

const folder: OpenedFolder = {
  id: 'f1',
  hostPath: 'C:\\damon',
  name: 'damon',
  color: '#2563eb',
  expanded: true,
};

describe('Sidebar', () => {
  it('shows open-folder button', () => {
    render(
      <Sidebar
        folders={[]}
        activeFile={null}
        onPickFile={() => {}}
        onCloseFolder={() => {}}
        onOpenFolderClick={() => {}}
        onDropFolder={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: '+ Open folder' })).toBeInTheDocument();
  });

  it('invokes onOpenFolderClick when CTA pressed', () => {
    let clicked = 0;
    render(
      <Sidebar
        folders={[]}
        activeFile={null}
        onPickFile={() => {}}
        onCloseFolder={() => {}}
        onOpenFolderClick={() => clicked++}
        onDropFolder={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '+ Open folder' }));
    expect(clicked).toBe(1);
  });

  it('shows the drag-and-drop hint', () => {
    render(
      <Sidebar
        folders={[]}
        activeFile={null}
        onPickFile={() => {}}
        onCloseFolder={() => {}}
        onOpenFolderClick={() => {}}
        onDropFolder={() => {}}
      />,
    );
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
  });

  it('renders one section per opened folder', () => {
    render(
      <Sidebar
        folders={[folder]}
        activeFile={null}
        onPickFile={() => {}}
        onCloseFolder={() => {}}
        onOpenFolderClick={() => {}}
        onDropFolder={() => {}}
      />,
    );
    expect(screen.getByText('damon')).toBeInTheDocument();
  });

  it('renders the filter input', () => {
    render(
      <Sidebar
        folders={[]}
        activeFile={null}
        onPickFile={() => {}}
        onCloseFolder={() => {}}
        onOpenFolderClick={() => {}}
        onDropFolder={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText(/filter files/i)).toBeInTheDocument();
  });
});
