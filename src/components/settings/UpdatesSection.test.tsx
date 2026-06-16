import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdatesSection } from './UpdatesSection';
import { getApi, hasApi, type AppSettings } from '@/lib/electron-api';

vi.mock('@/lib/electron-api', () => ({
  getApi: vi.fn(),
  hasApi: vi.fn().mockReturnValue(true),
}));

const DEFAULTS: AppSettings = {
  autoUpdate: true,
  uiSize: 'medium',
  contentZoom: 100,
  contextMenuAutoHide: true,
  fontSource: 'default',
  fontSplit: false,
  fontEnglish: 'default',
  fontThai: 'default',
};

function stubApi(overrides: { check?: unknown; download?: unknown } = {}) {
  const api = {
    update: {
      check: vi.fn().mockResolvedValue(overrides.check ?? { ok: true, version: '2.1.0' }),
      download: vi.fn().mockResolvedValue(overrides.download ?? { ok: true, version: '2.1.0' }),
      install: vi.fn().mockResolvedValue(true),
      onUpdateAvailable: vi.fn().mockReturnValue(() => {}),
      onProgress: vi.fn().mockReturnValue(() => {}),
    },
  };
  vi.mocked(getApi).mockReturnValue(api as never);
  return api;
}

beforeEach(() => {
  vi.mocked(hasApi).mockReturnValue(true);
  vi.useRealTimers();
});

describe('UpdatesSection', () => {
  it('walks the check → download → restart happy path', async () => {
    const api = stubApi();
    render(<UpdatesSection settings={DEFAULTS} onUpdateSettings={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /check for updates/i }));
    expect(await screen.findByText(/v2\.1\.0 available/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    const restart = await screen.findByRole('button', { name: /restart & update/i });

    vi.useFakeTimers();
    fireEvent.click(restart);
    // requestUpdateRestart shows the restart notice first, then installs.
    expect(api.update.install).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(api.update.install).toHaveBeenCalled();
  });

  it('reports up to date', async () => {
    stubApi({ check: { ok: true, version: null } });
    render(<UpdatesSection settings={DEFAULTS} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /check for updates/i }));
    expect(await screen.findByText(/up to date/i)).toBeInTheDocument();
  });

  it('shows the error from a failed check', async () => {
    stubApi({ check: { ok: false, error: 'offline' } });
    render(<UpdatesSection settings={DEFAULTS} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /check for updates/i }));
    expect(await screen.findByText(/offline/i)).toBeInTheDocument();
  });

  it('disables controls without the electron bridge', () => {
    vi.mocked(hasApi).mockReturnValue(false);
    render(<UpdatesSection settings={DEFAULTS} onUpdateSettings={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /check for updates at startup/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^check for updates$/i })).toBeDisabled();
  });
});
