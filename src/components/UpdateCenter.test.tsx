import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UpdateCenter } from './UpdateCenter';
import { getApi, hasApi } from '@/lib/electron-api';
import { UPDATE_RESTARTING_EVENT } from '@/lib/update-restart';

vi.mock('@/lib/electron-api', () => ({
  getApi: vi.fn(),
  hasApi: vi.fn().mockReturnValue(true),
}));

type Listener = (v: never) => void;

function stubApi(overrides: { download?: unknown } = {}) {
  const listeners: { available: Listener[]; progress: Listener[] } = { available: [], progress: [] };
  const api = {
    update: {
      download: vi.fn().mockResolvedValue(overrides.download ?? { ok: true, version: '2.2.0' }),
      install: vi.fn().mockResolvedValue(true),
      onUpdateAvailable: vi.fn((cb: Listener) => { listeners.available.push(cb); return () => {}; }),
      onProgress: vi.fn((cb: Listener) => { listeners.progress.push(cb); return () => {}; }),
    },
  };
  vi.mocked(getApi).mockReturnValue(api as never);
  return { api, emitAvailable: (v: string) => listeners.available.forEach((cb) => cb(v as never)), emitProgress: (p: number) => listeners.progress.forEach((cb) => cb(p as never)) };
}

beforeEach(() => {
  vi.mocked(hasApi).mockReturnValue(true);
  vi.useRealTimers();
});

describe('UpdateCenter', () => {
  it('is hidden until an update is announced', () => {
    stubApi();
    render(<UpdateCenter />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the available card with Update now and Close', () => {
    const { emitAvailable } = stubApi();
    render(<UpdateCenter />);
    act(() => emitAvailable('2.2.0'));
    expect(screen.getByText(/update v2\.2\.0 available/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('Close dismisses the card', () => {
    const { emitAvailable } = stubApi();
    render(<UpdateCenter />);
    act(() => emitAvailable('2.2.0'));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('Update now downloads with progress, then shows the do-not-shut-down notice', async () => {
    vi.useFakeTimers();
    const { api, emitAvailable, emitProgress } = stubApi();
    render(<UpdateCenter />);
    act(() => emitAvailable('2.2.0'));

    fireEvent.click(screen.getByRole('button', { name: /update now/i }));
    expect(screen.getByText(/downloading v2\.2\.0/i)).toBeInTheDocument();
    act(() => emitProgress(40));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');

    await act(async () => { await Promise.resolve(); }); // download resolves
    expect(api.update.download).toHaveBeenCalled();
    expect(screen.getByText(/don't shut down your computer/i)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(api.update.install).toHaveBeenCalled();
  });

  it('shows the error and returns to the offer when the download fails', async () => {
    const { emitAvailable } = stubApi({ download: { ok: false, error: 'disk full' } });
    render(<UpdateCenter />);
    act(() => emitAvailable('2.2.0'));
    fireEvent.click(screen.getByRole('button', { name: /update now/i }));
    expect(await screen.findByText(/disk full/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update now/i })).toBeInTheDocument();
  });

  it('shows the restart notice when Settings triggers a restart', () => {
    stubApi();
    render(<UpdateCenter />);
    act(() => {
      window.dispatchEvent(new CustomEvent(UPDATE_RESTARTING_EVENT, { detail: '2.2.0' }));
    });
    expect(screen.getByText(/don't shut down your computer/i)).toBeInTheDocument();
  });
});
