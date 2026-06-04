import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// CommonJS module shared with the Electron main process (no electron imports inside).
import { createSettingsStore, normalizeSettings } from '../../electron/settings.cjs';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mdreader-settings-'));
  return () => rmSync(dir, { recursive: true, force: true });
});

describe('normalizeSettings', () => {
  it('fills defaults and drops unknown keys', () => {
    expect(normalizeSettings(undefined)).toEqual({ autoUpdate: true });
    expect(normalizeSettings({ autoUpdate: false, junk: 1 })).toEqual({ autoUpdate: false });
    expect(normalizeSettings({ autoUpdate: 'yes' })).toEqual({ autoUpdate: true });
  });
});

describe('createSettingsStore', () => {
  it('returns defaults when no file exists', () => {
    expect(createSettingsStore(dir).read()).toEqual({ autoUpdate: true });
  });

  it('write persists a patch and read round-trips it', () => {
    const store = createSettingsStore(dir);
    expect(store.write({ autoUpdate: false })).toEqual({ autoUpdate: false });
    expect(createSettingsStore(dir).read()).toEqual({ autoUpdate: false });
  });

  it('read survives a corrupted file', () => {
    const store = createSettingsStore(dir);
    writeFileSync(store.file, '{broken', 'utf-8');
    expect(store.read()).toEqual({ autoUpdate: true });
  });
});
