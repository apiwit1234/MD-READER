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
    defaultFolder: null as string | null,
    onSetDefaultFolder: vi.fn(),
    ...overrides,
  };
  render(<SettingsModal {...props} />);
  return props;
}

describe('SettingsModal', () => {
  it('renders one card per theme', () => {
    setup();
    expect(screen.getAllByRole('button', { name: /^Select .* theme$/ })).toHaveLength(3);
  });

  it('marks the active theme card as pressed', () => {
    setup({ theme: 'cartoon' });
    expect(screen.getByRole('button', { name: /select cartoon theme/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelectTheme when a card is clicked', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /select cartoon theme/i }));
    expect(props.onSelectTheme).toHaveBeenCalledWith('cartoon');
  });

  it('updates favorite 1 and avoids duplicating favorite 2', async () => {
    const user = userEvent.setup();
    const props = setup({ favorites: ['light', 'dark'] });
    await user.selectOptions(screen.getByLabelText(/favorite 1/i), 'dark');
    expect(props.onSetFavorites).toHaveBeenCalledWith(['dark', 'light']);
  });

  it('shows the default folder and clears it', async () => {
    const user = userEvent.setup();
    const props = setup({ defaultFolder: 'C:\\notes' });
    expect(screen.getByText('C:\\notes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear default folder/i }));
    expect(props.onSetDefaultFolder).toHaveBeenCalledWith(null);
  });

  it('shows Not set when no default folder is configured', () => {
    setup();
    expect(screen.getByText(/not set/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    setup({ open: false });
    expect(screen.queryByText(/appearance/i)).not.toBeInTheDocument();
  });
});
