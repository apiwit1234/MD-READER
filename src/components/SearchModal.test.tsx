import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchModal } from './SearchModal';
import type { OpenedFolder } from '@/types';

const folders: OpenedFolder[] = [
  { id: 'f1', hostPath: 'C:\\damon', name: 'damon', color: '#2563eb', expanded: true },
  { id: 'f2', hostPath: 'C:\\gefjon', name: 'gefjon', color: '#16a34a', expanded: true },
];

describe('SearchModal', () => {
  beforeEach(() => localStorage.clear());

  it('renders inputs and dropdowns', () => {
    render(<SearchModal open folders={folders} onClose={() => {}} onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/search query/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
  });

  it('enables the Search button when query is non-empty', async () => {
    const user = userEvent.setup();
    render(<SearchModal open folders={folders} onClose={() => {}} onSearch={() => {}} />);
    await user.type(screen.getByPlaceholderText(/search query/i), 'start');
    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
  });

  it('calls onSearch with the right payload', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchModal open folders={folders} onClose={() => {}} onSearch={onSearch} />);
    await user.type(screen.getByPlaceholderText(/search query/i), 'start');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({
      query: 'start',
      caseSensitive: false,
      scope: 'all',
    }));
  });

  it('Esc closes the modal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SearchModal open folders={folders} onClose={onClose} onSearch={() => {}} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
