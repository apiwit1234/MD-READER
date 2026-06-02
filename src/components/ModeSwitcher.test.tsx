import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSwitcher } from './ModeSwitcher';

describe('ModeSwitcher', () => {
  it('renders three buttons and marks the active one', () => {
    render(<ModeSwitcher mode="code" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'MD' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Code' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Terminal' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked mode', async () => {
    const onChange = vi.fn();
    render(<ModeSwitcher mode="md" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Terminal' }));
    expect(onChange).toHaveBeenCalledWith('terminal');
  });
});
