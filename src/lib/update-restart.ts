import { getApi } from './electron-api';

/** DOM event announcing that an update restart is imminent — UpdateCenter
 *  listens and shows the "don't shut down your computer" notice. */
export const UPDATE_RESTARTING_EVENT = 'pax:update-restarting';

/**
 * Single restart path for every "apply update" button: announce the restart
 * (so the notice paints), give it a moment to be seen, then hand off to the
 * Velopack updater (which waits for this process to exit, applies the patch
 * and relaunches the app).
 */
export function requestUpdateRestart(version: string): void {
  window.dispatchEvent(new CustomEvent(UPDATE_RESTARTING_EVENT, { detail: version }));
  setTimeout(() => { void getApi().update.install(); }, 1500);
}
