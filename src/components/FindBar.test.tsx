import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FindBar } from './FindBar';

describe('FindBar', () => {
  it('renders counter as 0/0 when no matches', () => {
    render(<FindBar query="" onQueryChange={() => {}} total={0} currentIndex={-1} onNext={() => {}} onPrev={() => {}} onClose={() => {}} />);
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('renders current/total when there are matches', () => {
    render(<FindBar query="x" onQueryChange={() => {}} total={5} currentIndex={2} onNext={() => {}} onPrev={() => {}} onClose={() => {}} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('Enter calls onNext, Shift+Enter calls onPrev', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onPrev = vi.fn();
    render(<FindBar query="x" onQueryChange={() => {}} total={3} currentIndex={0} onNext={onNext} onPrev={onPrev} onClose={() => {}} />);
    const input = screen.getByRole('textbox');
    input.focus();
    await user.keyboard('{Enter}');
    expect(onNext).toHaveBeenCalled();
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onPrev).toHaveBeenCalled();
  });

  it('Escape calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<FindBar query="x" onQueryChange={() => {}} total={3} currentIndex={0} onNext={() => {}} onPrev={() => {}} onClose={onClose} />);
    screen.getByRole('textbox').focus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
