/** Whole-number load percentage (0..100); 0 when total is unknown/zero. */
export function progressPercent(scanned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((scanned / total) * 100)));
}
