export const FOLDER_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#a855f7', // purple
  '#ea580c', // orange
  '#db2777', // pink
  '#0d9488', // teal
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number];

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
