export const FOLDER_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#a855f7', // purple
  '#ea580c', // orange
  '#db2777', // pink
  '#0d9488', // teal
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number];

/** Converts a theme CSS variable triplet like "248 250 252" to "#f8fafc".
 *  Returns null when the input is not a triplet of 0-255 integers. */
export function rgbTripletToHex(triplet: string): string | null {
  const m = triplet.trim().match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/);
  if (!m) return null;
  const to2 = (s: string) => Math.min(255, parseInt(s, 10)).toString(16).padStart(2, '0');
  return `#${to2(m[1])}${to2(m[2])}${to2(m[3])}`;
}

export function pickNextColor(usedColors: string[]): FolderColor {
  const counts = new Map<string, number>();
  for (const c of FOLDER_COLORS) counts.set(c, 0);
  for (const c of usedColors) {
    if (counts.has(c)) counts.set(c, counts.get(c)! + 1);
  }
  let best: FolderColor = FOLDER_COLORS[0];
  let bestCount = counts.get(best)!;
  for (const c of FOLDER_COLORS) {
    const n = counts.get(c)!;
    if (n < bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}
