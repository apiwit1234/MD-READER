import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';

function setup(overrides = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    theme: 'light' as const,
    favorites: ['light', 'dark'] as ['light', 'dark'],
    onSelectTheme: vi.fn(),
    onSetFavorites: vi.fn(),
    ...overrides,
  };
  render(<SettingsModal {...props} />);
  return props;
}

describe('SettingsModal', () => {
  it('renders one card per theme', () => {
    setup();
    expect(screen.getAllByRole('button', { name: /^Select .* theme$/ })).toHaveLength(5);
  });

  it('marks the active theme card as pressed', () => {
    setup({ theme: 'space' });
    expect(screen.getByRole('button', { name: /select space & stars theme/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelectTheme when a card is clicked', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /select moneh theme/i }));
    expect(props.onSelectTheme).toHaveBeenCalledWith('moneh');
  });

  it('updates favorite 1 and avoids duplicating favorite 2', async () => {
    const user = userEvent.setup();
    const props = setup({ favorites: ['light', 'dark'] });
    await user.selectOptions(screen.getByLabelText(/favorite 1/i), 'dark');
    expect(props.onSetFavorites).toHaveBeenCalledWith(['dark', 'light']);
  });

  it('does not render when closed', () => {
    setup({ open: false });
    expect(screen.queryByText(/appearance/i)).not.toBeInTheDocument();
  });
});
