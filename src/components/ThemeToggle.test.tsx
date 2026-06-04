import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('flips to the other favorite when the active theme is favorite[0]', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<ThemeToggle theme="cartoon" favorites={['cartoon', 'dark']} onChange={(t) => calls.push(t)} />);
    await user.click(screen.getByRole('button', { name: /switch to dark/i }));
    expect(calls).toEqual(['dark']);
  });

  it('flips to favorite[0] when the active theme is favorite[1]', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<ThemeToggle theme="dark" favorites={['cartoon', 'dark']} onChange={(t) => calls.push(t)} />);
    await user.click(screen.getByRole('button', { name: /switch to cartoon/i }));
    expect(calls).toEqual(['cartoon']);
  });

  it('targets favorite[0] when the active theme is in neither favorite slot', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<ThemeToggle theme="cartoon" favorites={['light', 'dark']} onChange={(t) => calls.push(t)} />);
    await user.click(screen.getByRole('button', { name: /switch to light/i }));
    expect(calls).toEqual(['light']);
  });

  it('renders the target theme icon', () => {
    render(<ThemeToggle theme="light" favorites={['light', 'dark']} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /switch to dark/i })).toHaveTextContent('🌙');
  });
});
