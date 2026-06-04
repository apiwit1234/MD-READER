import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchMenu } from './BranchMenu';
import type { GitBranches } from '@/types';

const branches: GitBranches = {
  current: 'main',
  local: ['main', 'feat/login', 'feat/terminal', 'fix/crash'],
  remote: ['origin/main', 'origin/feat/login', 'origin/HEAD'],
};

function setup(overrides: Partial<Parameters<typeof BranchMenu>[0]> = {}) {
  const props = {
    branches,
    ahead: 0,
    behind: 0,
    onCheckout: vi.fn(),
    onCreate: vi.fn(),
    onMerge: vi.fn(),
    ...overrides,
  };
  render(<BranchMenu {...props} />);
  return props;
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /main/i }));
}

describe('BranchMenu', () => {
  it('filters the branch list via the search box', async () => {
    const user = userEvent.setup();
    setup();
    await openMenu(user);

    expect(screen.getByRole('button', { name: /feat\/login/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fix\/crash/ })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/search branches/i), 'feat');

    expect(screen.getByRole('button', { name: /feat\/login/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /feat\/terminal/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fix\/crash/ })).toBeNull();
  });

  it('creates a branch via the inline input (no window.prompt)', async () => {
    const user = userEvent.setup();
    const { onCreate } = setup();
    await openMenu(user);

    await user.click(screen.getByRole('button', { name: /create branch/i }));
    const input = screen.getByPlaceholderText(/new branch name/i);
    await user.type(input, 'feat/new-thing');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(onCreate).toHaveBeenCalledWith('feat/new-thing');
  });

  it('submits a new branch on Enter and trims whitespace', async () => {
    const user = userEvent.setup();
    const { onCreate } = setup();
    await openMenu(user);

    await user.click(screen.getByRole('button', { name: /create branch/i }));
    await user.type(screen.getByPlaceholderText(/new branch name/i), '  spaced  {Enter}');

    expect(onCreate).toHaveBeenCalledWith('spaced');
  });

  it('checks out a branch when clicked', async () => {
    const user = userEvent.setup();
    const { onCheckout } = setup();
    await openMenu(user);

    await user.click(screen.getByRole('button', { name: /feat\/login/ }));

    expect(onCheckout).toHaveBeenCalledWith('feat/login');
  });
});
