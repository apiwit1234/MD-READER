import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPanel } from './SearchPanel';
import type { OpenedFolder, SearchResponse } from '@/types';

const folders: OpenedFolder[] = [
  { id: 'f1', hostPath: 'C:\\damon', name: 'damon', color: '#2563eb', expanded: true },
];

const response: SearchResponse = {
  files: [
    {
      hostPath: 'C:\\damon\\docs\\setup.md',
      matches: [
        { line: 12, column: 0, lineText: '…run docker compose up to start…' },
        { line: 45, column: 4, lineText: '…the start script lives in package.json' },
      ],
    },
  ],
  totalMatches: 2,
  truncated: false,
  cancelled: false,
  scannedFiles: 5,
  elapsedMs: 42,
};

describe('SearchPanel', () => {
  it('renders the summary strip', () => {
    render(<SearchPanel query="start" response={response} folders={folders} onOpenResult={() => {}} onRerun={() => {}} onClear={() => {}} />);
    expect(screen.getByText(/"start"/)).toBeInTheDocument();
    expect(screen.getByText(/2 matches in 1 file/)).toBeInTheDocument();
  });

  it('renders one group per file with match rows', () => {
    render(<SearchPanel query="start" response={response} folders={folders} onOpenResult={() => {}} onRerun={() => {}} onClear={() => {}} />);
    expect(screen.getByText(/damon\/docs\/setup\.md/)).toBeInTheDocument();
    expect(screen.getByText(/run docker compose up to start/)).toBeInTheDocument();
    expect(screen.getByText(/the start script lives/)).toBeInTheDocument();
  });

  it('calls onOpenResult with folder id + relative path + line', async () => {
    const user = userEvent.setup();
    const onOpenResult = vi.fn();
    render(<SearchPanel query="start" response={response} folders={folders} onOpenResult={onOpenResult} onRerun={() => {}} onClear={() => {}} />);
    await user.click(screen.getByText(/run docker compose up to start/));
    expect(onOpenResult).toHaveBeenCalledWith({
      folderId: 'f1',
      relativePath: 'docs/setup.md',
      line: 12,
      matchOrdinal: 0,
      query: 'start',
      caseSensitive: false,
    });
  });

  it('shows a truncation banner when truncated is true', () => {
    const truncated = { ...response, truncated: true };
    render(<SearchPanel query="x" response={truncated} folders={folders} onOpenResult={() => {}} onRerun={() => {}} onClear={() => {}} />);
    expect(screen.getByText(/Showing first/i)).toBeInTheDocument();
  });

  it('shows a cancellation banner when cancelled is true', () => {
    const cancelled = { ...response, cancelled: true };
    render(<SearchPanel query="x" response={cancelled} folders={folders} onOpenResult={() => {}} onRerun={() => {}} onClear={() => {}} />);
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  });

  it('navigates rows with ArrowDown/ArrowUp and opens with Enter', async () => {
    const user = userEvent.setup();
    const onOpenResult = vi.fn();
    render(<SearchPanel query="start" response={response} folders={folders} onOpenResult={onOpenResult} onRerun={() => {}} onClear={() => {}} />);
    const container = screen.getByTestId('search-results-container');
    container.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onOpenResult).toHaveBeenCalledWith(expect.objectContaining({ line: 12 }));
  });
});
