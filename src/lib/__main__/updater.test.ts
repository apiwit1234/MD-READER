import { describe, expect, it, vi } from 'vitest';
const { createUpdater, resolveUpdateUrl, DEFAULT_UPDATE_URL } = require('../../../electron/updater.cjs');

type FakeManager = ReturnType<typeof fakeVelopack>;

function fakeVelopack(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    checkForUpdatesAsync: vi.fn().mockResolvedValue({
      TargetFullRelease: { Version: '2.0.1', NotesMarkdown: 'notes' },
    }),
    downloadUpdateAsync: vi.fn().mockResolvedValue(undefined),
    waitExitThenApplyUpdate: vi.fn(),
    ...overrides,
  };
}

describe('resolveUpdateUrl', () => {
  it('prefers the env var', () => {
    expect(resolveUpdateUrl({ envUrl: 'C:\\feed', readOverride: () => 'D:\\other' })).toBe('C:\\feed');
  });

  it('falls back to the override file contents', () => {
    expect(resolveUpdateUrl({ envUrl: undefined, readOverride: () => 'C:\\temp\\paxfeed' })).toBe('C:\\temp\\paxfeed');
  });

  it('defaults to GitHub when neither is set', () => {
    expect(resolveUpdateUrl({ envUrl: undefined, readOverride: () => '' })).toBe(DEFAULT_UPDATE_URL);
  });

  it('survives an override read error', () => {
    expect(resolveUpdateUrl({ envUrl: undefined, readOverride: () => { throw new Error('ENOENT'); } })).toBe(DEFAULT_UPDATE_URL);
  });
});

describe('createUpdater', () => {
  it('is a no-op when not packaged', async () => {
    const u = createUpdater({ isPackaged: false, makeManager: () => fakeVelopack() });
    expect(await u.check()).toEqual({ ok: false, error: 'dev build — updates only work in the installed app' });
  });

  it('reports unavailable when the manager cannot be created (portable/non-velopack build)', async () => {
    const u = createUpdater({
      isPackaged: true,
      makeManager: () => { throw new Error('not installed'); },
    });
    expect(await u.check()).toEqual({ ok: false, error: 'updates unavailable — portable or unmanaged build' });
  });

  it('reports an available version with notes', async () => {
    const u = createUpdater({ isPackaged: true, makeManager: () => fakeVelopack() });
    expect(await u.check()).toEqual({ ok: true, version: '2.0.1', notes: 'notes' });
  });

  it('reports up to date when check returns null', async () => {
    const u = createUpdater({
      isPackaged: true,
      makeManager: () => fakeVelopack({ checkForUpdatesAsync: vi.fn().mockResolvedValue(null) }),
    });
    expect(await u.check()).toEqual({ ok: true, version: null });
  });

  it('downloads with progress and then allows applyAndRestart', async () => {
    const mgr = fakeVelopack({
      downloadUpdateAsync: vi.fn(
        (_info: unknown, progress: (p: number) => void) => { progress(50); return Promise.resolve(); },
      ),
    }) as FakeManager;
    const onProgress = vi.fn();
    const u = createUpdater({ isPackaged: true, makeManager: () => mgr, onProgress });
    await u.check();

    const r = await u.download();

    expect(r).toEqual({ ok: true, version: '2.0.1' });
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(u.applyAndRestart()).toBe(true);
    expect(mgr.waitExitThenApplyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ TargetFullRelease: expect.anything() }),
      true,
      true,
    );
  });

  it('refuses to download before a successful check', async () => {
    const u = createUpdater({ isPackaged: true, makeManager: () => fakeVelopack() });
    expect(await u.download()).toEqual({ ok: false, error: 'no update available — check first' });
  });

  it('refuses applyAndRestart before a download completes', async () => {
    const u = createUpdater({ isPackaged: true, makeManager: () => fakeVelopack() });
    await u.check();
    expect(u.applyAndRestart()).toBe(false);
  });

  it('returns the error message when a check fails', async () => {
    const u = createUpdater({
      isPackaged: true,
      makeManager: () => fakeVelopack({ checkForUpdatesAsync: vi.fn().mockRejectedValue(new Error('offline')) }),
    });
    expect(await u.check()).toEqual({ ok: false, error: 'offline' });
  });

  it('returns the error message when a download fails', async () => {
    const u = createUpdater({
      isPackaged: true,
      makeManager: () => fakeVelopack({ downloadUpdateAsync: vi.fn().mockRejectedValue(new Error('disk full')) }),
    });
    await u.check();
    expect(await u.download()).toEqual({ ok: false, error: 'disk full' });
  });
});
