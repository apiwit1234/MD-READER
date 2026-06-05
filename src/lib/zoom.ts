export const ZOOM_MIN = 50;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 10;

/** Next zoom percentage after one step up (+1) or down (-1).
 *  Snaps to the 10% grid and clamps to [50, 200]. */
export function applyZoomStep(current: number, direction: 1 | -1): number {
  const base = Number.isFinite(current) ? current : 100;
  const next = Math.round(base / ZOOM_STEP) * ZOOM_STEP + direction * ZOOM_STEP;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
}
