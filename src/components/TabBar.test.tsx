import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabBar } from './TabBar';

const tabs = [
  { folderId: 'f1', relativePath: 'README.md', active: false, color: '#2563eb', filename: 'README.md' },
  { folderId: 'f1', relativePath: 'docs/setup.md', active: true, color: '#2563eb', filename: 'setup.md' },
];

describe('TabBar', () => {
  it('renders one entry per tab', () => {
    render(<TabBar tabs={tabs} onFocus={() => {}} onClose={() => {}} />);
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.getByText('setup.md')).toBeInTheDocument();
  });

  it('marks the active tab', () => {
    render(<TabBar tabs={tabs} onFocus={() => {}} onClose={() => {}} />);
    const setup = screen.getByText('setup.md').closest('div[role="tab"]')!;
    expect(setup.getAttribute('aria-selected')).toBe('true');
  });

  it('invokes onFocus when tab body clicked', async () => {
    const user = userEvent.setup();
    const focuses: string[] = [];
    render(<TabBar tabs={tabs} onFocus={(t) => focuses.push(t.relativePath)} onClose={() => {}} />);
    await user.click(screen.getByText('README.md'));
    expect(focuses).toEqual(['README.md']);
  });

  it('invokes onClose when × pressed', async () => {
    const user = userEvent.setup();
    const closes: string[] = [];
    render(<TabBar tabs={tabs} onFocus={() => {}} onClose={(t) => closes.push(t.relativePath)} />);
    await user.click(screen.getAllByLabelText(/close tab/i)[0]);
    expect(closes).toEqual(['README.md']);
  });

  it('shows an updating spinner on tabs refreshing from disk', () => {
    const updatingTabs = [
      { ...tabs[0], updating: true },
      tabs[1],
    ];
    render(<TabBar tabs={updatingTabs} onFocus={() => {}} onClose={() => {}} />);
    expect(screen.getAllByLabelText('updating')).toHaveLength(1);
  });
});
