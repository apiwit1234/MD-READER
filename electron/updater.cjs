'use strict';

const DEFAULT_UPDATE_URL = 'https://github.com/apiwit1234/MD-READER/releases/latest/download/';

/**
 * Resolve the update feed without code changes:
 * 1. PAX_UPDATE_URL env var (dev shells)
 * 2. an override file's contents (e.g. %APPDATA%\md-reader\update-feed.txt
 *    containing C:\temp\paxfeed) — lets an INSTALLED build point at a local
 *    test feed; delete the file to go back to GitHub Releases
 * 3. the GitHub Releases default
 */
function resolveUpdateUrl({ envUrl, readOverride }) {
  if (envUrl) return envUrl;
  try {
    const t = readOverride();
    if (t) return t;
  } catch {
    // unreadable/missing override file — fall through to the default
  }
  return DEFAULT_UPDATE_URL;
}

/**
 * Velopack-backed updater behind a small testable facade.
 *
 * createUpdater({ isPackaged, makeManager, onProgress, log }) ->
 *   { check, download, applyAndRestart, hasPending }
 *
 * makeManager is injected so tests never touch real velopack; production
 * wiring passes () => new UpdateManager(UPDATE_URL). The UpdateManager
 * constructor throws when this copy of the app is not a Velopack install
 * (dev, portable exe, plain unpacked dir) — that surfaces as a friendly
 * "updates unavailable" instead of crashing.
 *
 * State machine: check() stores the UpdateInfo; download() requires it;
 * applyAndRestart() requires a completed download. Updates that were
 * downloaded but not applied via restart are auto-applied by VelopackApp on
 * the next launch (its default), which replaces the old install-on-quit.
 */
function createUpdater({ isPackaged, makeManager, onProgress, log = () => {} }) {
  let manager = null;
  let pendingInfo = null;
  let downloaded = false;

  function unavailableReason() {
    if (!isPackaged) return 'dev build — updates only work in the installed app';
    if (manager) return null;
    try {
      manager = makeManager();
      return null;
    } catch (err) {
      log(`updater init failed: ${(err && err.message) || err}`);
      return 'updates unavailable — portable or unmanaged build';
    }
  }

  async function check() {
    const reason = unavailableReason();
    if (reason) return { ok: false, error: reason };
    try {
      const info = await manager.checkForUpdatesAsync();
      pendingInfo = info || null;
      downloaded = false;
      if (!info) return { ok: true, version: null };
      return {
        ok: true,
        version: info.TargetFullRelease.Version,
        notes: info.TargetFullRelease.NotesMarkdown || undefined,
      };
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  }

  async function download() {
    const reason = unavailableReason();
    if (reason) return { ok: false, error: reason };
    if (!pendingInfo) return { ok: false, error: 'no update available — check first' };
    try {
      await manager.downloadUpdateAsync(pendingInfo, (perc) => { if (onProgress) onProgress(perc); });
      downloaded = true;
      return { ok: true, version: pendingInfo.TargetFullRelease.Version };
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  }

  /** Launches the Velopack updater (waits for our exit, applies silently,
   *  restarts the app). The CALLER must quit the app right after this
   *  returns true — the updater only waits 60 seconds. */
  function applyAndRestart() {
    if (!downloaded || !pendingInfo) return false;
    try {
      manager.waitExitThenApplyUpdate(pendingInfo, true, true);
      return true;
    } catch (err) {
      log(`apply failed: ${(err && err.stack) || err}`);
      return false;
    }
  }

  return { check, download, applyAndRestart, hasPending: () => downloaded };
}

module.exports = { createUpdater, resolveUpdateUrl, DEFAULT_UPDATE_URL };
