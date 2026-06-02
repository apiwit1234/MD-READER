import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows headline copy', () => {
    render(<EmptyState onOpenFolder={() => {}} />);
    expect(screen.getByText(/open a folder to get started/i)).toBeInTheDocument();
  });

  it('invokes onOpenFolder when CTA clicked', async () => {
    const user = userEvent.setup();
    let clicked = 0;
    render(<EmptyState onOpenFolder={() => clicked++} />);
    await user.click(screen.getByRole('button', { name: /open folder/i }));
    expect(clicked).toBe(1);
  });
});
