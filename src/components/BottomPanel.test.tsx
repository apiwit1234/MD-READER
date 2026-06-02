import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomPanel } from './BottomPanel';

describe('BottomPanel', () => {
  it('renders both tab buttons', () => {
    render(<BottomPanel activeTab="terminal" onActiveTabChange={() => {}} onCollapse={() => {}} terminal={<div>TERM</div>} search={<div>SEARCH</div>} />);
    expect(screen.getByRole('button', { name: /terminal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });

  it('switches active tab on click', async () => {
    const user = userEvent.setup();
    const onActiveTabChange = vi.fn();
    render(<BottomPanel activeTab="terminal" onActiveTabChange={onActiveTabChange} onCollapse={() => {}} terminal={<div>TERM</div>} search={<div>SEARCH</div>} />);
    await user.click(screen.getByRole('button', { name: /^search$/i }));
    expect(onActiveTabChange).toHaveBeenCalledWith('search');
  });

  it('keeps both children mounted but hides the inactive one', () => {
    render(<BottomPanel activeTab="terminal" onActiveTabChange={() => {}} onCollapse={() => {}} terminal={<div data-testid="term">TERM</div>} search={<div data-testid="srch">SEARCH</div>} />);
    expect(screen.getByTestId('term')).toBeVisible();
    expect(screen.getByTestId('srch')).not.toBeVisible();
  });

  it('triggers onCollapse', async () => {
    const user = userEvent.setup();
    const onCollapse = vi.fn();
    render(<BottomPanel activeTab="terminal" onActiveTabChange={() => {}} onCollapse={onCollapse} terminal={<div>T</div>} search={<div>S</div>} />);
    await user.click(screen.getByLabelText(/collapse/i));
    expect(onCollapse).toHaveBeenCalled();
  });
});
