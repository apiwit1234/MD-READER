/** True when an element's text is clipped (scroll width exceeds the visible box). */
export function isTruncated(el: { scrollWidth: number; clientWidth: number } | null): boolean {
  if (!el) return false;
  return el.scrollWidth > el.clientWidth;
}
