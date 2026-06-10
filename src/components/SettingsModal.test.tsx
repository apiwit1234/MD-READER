import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
import type { AppSettings } from '@/lib/electron-api';

const SETTINGS: AppSettings = {
  autoUpdate: true,
  uiSize: 'medium',
  contentZoom: 100,
  contextMenuAutoHide: true,
  fontSource: 'default',
  fontSplit: false,
  fontEnglish: 'default',
  fontThai: 'default',
};

function setup(overrides = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    theme: 'light' as const,
    favorites: ['light', 'dark'] as ['light', 'dark'],
    onSelectTheme: vi.fn(),
    onSetFavorites: vi.fn(),
    settings: SETTINGS,
    onUpdateSettings: vi.fn(),
    customFonts: [],
    onCustomFontsChanged: vi.fn(),
    onResetDefaults: vi.fn(),
    ...overrides,
  };
  render(<SettingsModal {...props} />);
  return props;
}

describe('SettingsModal', () => {
  it('shows category nav and defaults to Appearance', () => {
    setup();
    for (const c of ['Appearance', 'Fonts', 'Behavior', 'Updates', 'Advanced']) {
      expect(screen.getByRole('button', { name: c })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button', { name: /^Select .* theme$/ })).toHaveLength(6);
  });

  it('marks the active theme card as pressed', () => {
    setup({ theme: 'dracula' });
    expect(screen.getByRole('button', { name: /select dracula theme/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelectTheme when a card is clicked', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /select aurora theme/i }));
    expect(props.onSelectTheme).toHaveBeenCalledWith('aurora');
  });

  it('updates favorite 1 and avoids duplicating favorite 2', async () => {
    const user = userEvent.setup();
    const props = setup({ favorites: ['light', 'dark'] });
    await user.selectOptions(screen.getByLabelText(/favorite 1/i), 'dark');
    expect(props.onSetFavorites).toHaveBeenCalledWith(['dark', 'light']);
  });

  it('UI size buttons dispatch updates', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Large' }));
    expect(props.onUpdateSettings).toHaveBeenCalledWith({ uiSize: 'large' });
  });

  it('switching category swaps the pane', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Behavior' }));
    expect(screen.getByLabelText('Auto-hide context menus')).toBeInTheDocument();
  });

  it('renders the Updates section with the automatic-updates toggle', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Updates' }));
    // No electron bridge in tests -> controls are disabled.
    expect(screen.getByRole('checkbox', { name: /automatic updates/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /check for updates/i })).toBeDisabled();
  });

  it('reset requires a confirm click', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(props.onResetDefaults).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm reset' }));
    expect(props.onResetDefaults).toHaveBeenCalledTimes(1);
  });

  it('font split toggle reveals separate selects', async () => {
    const user = userEvent.setup();
    setup({ settings: { ...SETTINGS, fontSplit: true } });
    await user.click(screen.getByRole('button', { name: 'Fonts' }));
    expect(screen.getByLabelText('English font')).toBeInTheDocument();
    expect(screen.getByLabelText('Thai font')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    setup({ open: false });
    expect(screen.queryByText(/settings/i)).not.toBeInTheDocument();
  });
});
