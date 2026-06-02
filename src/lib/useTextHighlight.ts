import { useEffect, useRef, useState, type MutableRefObject } from 'react';

const HIT_CLASS = 'md-find-hit';
const ACTIVE_CLASS = 'md-find-hit--active';
const LINE_HIGHLIGHT_CLASS = 'md-find-line';

const BLOCK_TAGS = new Set([
  'P', 'LI', 'TD', 'TH', 'PRE', 'BLOCKQUOTE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'DT', 'DD', 'TR',
]);

export type TextHighlightApi = {
  total: number;
  currentIndex: number; // 0-based; -1 if total is 0
  next: () => void;
  prev: () => void;
  clear: () => void;
  /** Activate (highlight + scroll) the mark at the given 0-based index. No-op if out of range. */
  setIndex: (idx: number) => void;
};

/** If the node lives inside an <svg> (e.g. a rendered mermaid diagram), return the
 *  nearest <text>/<tspan> element to highlight. Returns null for non-SVG nodes. */
function svgTextOwner(node: Node): Element | null {
  let n: Node | null = node;
  let owner: Element | null = null;
  while (n) {
    if (n instanceof Element) {
      const tag = n.tagName.toLowerCase();
      if (!owner && (tag === 'text' || tag === 'tspan')) owner = n;
      if (tag === 'svg') return owner;
    }
    n = n.parentNode;
  }
  return null;
}

function collectTextNodes(root: Node): Text[] {
  const out: Text[] = [];
  function visit(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue) out.push(node as Text);
      return;
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      visit(node.childNodes[i]);
    }
  }
  for (let i = 0; i < root.childNodes.length; i++) {
    visit(root.childNodes[i]);
  }
  return out;
}

function findBlockAncestor(el: Element | null): Element | null {
  let n: Element | null = el;
  while (n) {
    if (BLOCK_TAGS.has(n.tagName)) return n;
    n = n.parentElement;
  }
  return null;
}

export type UseTextHighlightOptions = {
  /** Re-apply marks when this value changes (e.g. when markdown content changes). */
  contentKey?: unknown;
  /** Index of the mark to activate (and scroll to) when marks are first applied. Defaults to 0. */
  initialIndex?: number;
};

export function useTextHighlight(
  containerRef: MutableRefObject<HTMLElement | null>,
  query: string,
  caseSensitive = false,
  options: UseTextHighlightOptions = {},
): TextHighlightApi {
  const { contentKey, initialIndex } = options;
  const [total, setTotal] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const marksRef = useRef<Element[]>([]);
  const activeLineRef = useRef<Element | null>(null);

  function clearActiveLine() {
    const el = activeLineRef.current;
    if (el) {
      try { el.classList.remove(LINE_HIGHLIGHT_CLASS); } catch {}
    }
    activeLineRef.current = null;
  }

  function unwrapMarks() {
    clearActiveLine();
    const root = containerRef.current;
    for (const m of marksRef.current) {
      try {
        if (m.tagName === 'MARK') {
          const parent = m.parentNode;
          if (!parent || !parent.contains(m)) continue;
          while (m.firstChild) parent.insertBefore(m.firstChild, m);
          parent.removeChild(m);
        } else {
          // SVG <text>/<tspan> highlight — just drop the classes, never unwrap.
          m.classList.remove(HIT_CLASS, ACTIVE_CLASS);
        }
      } catch {
        // Mark was already detached (React reconciliation replaced its parent). Skip.
      }
    }
    marksRef.current = [];
    try {
      if (root && root.isConnected) root.normalize();
    } catch {
      // ignore
    }
  }

  function setActive(idx: number) {
    clearActiveLine();
    marksRef.current.forEach((m, i) => {
      try { m.classList.toggle(ACTIVE_CLASS, i === idx); } catch {}
    });
    const active = marksRef.current[idx];
    if (!active || !active.isConnected) return;
    const block = findBlockAncestor(active);
    if (block) {
      try { block.classList.add(LINE_HIGHLIGHT_CLASS); } catch {}
      activeLineRef.current = block;
    }
    if (typeof active.scrollIntoView === 'function') {
      try { active.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
    }
  }

  useEffect(() => {
    try {
      unwrapMarks();
      setTotal(0);
      setCurrentIndex(-1);
      const root = containerRef.current;
      if (!root || !query) return;

      const needle = caseSensitive ? query : query.toLowerCase();
      const nodes = collectTextNodes(root);
      const newMarks: Element[] = [];

      for (const textNode of nodes) {
        const text = textNode.nodeValue ?? '';
        const hay = caseSensitive ? text : text.toLowerCase();
        if (hay.indexOf(needle) < 0) continue;

        // Text inside a rendered mermaid SVG: highlight the owning element
        // (can't inject an HTML <mark> into SVG without breaking it).
        const svgOwner = svgTextOwner(textNode);
        if (svgOwner) {
          if (!newMarks.includes(svgOwner)) {
            try { svgOwner.classList.add(HIT_CLASS); } catch {}
            newMarks.push(svgOwner);
          }
          continue;
        }

        let cursor = 0;
        let lastEnd = 0;
        const frag = document.createDocumentFragment();
        let nodeHasMatch = false;
        while (cursor <= hay.length) {
          const idx = hay.indexOf(needle, cursor);
          if (idx < 0) break;
          nodeHasMatch = true;
          if (idx > lastEnd) frag.appendChild(document.createTextNode(text.slice(lastEnd, idx)));
          const mark = document.createElement('mark');
          mark.className = HIT_CLASS;
          mark.textContent = text.slice(idx, idx + query.length);
          frag.appendChild(mark);
          newMarks.push(mark);
          lastEnd = idx + query.length;
          cursor = lastEnd;
        }
        if (!nodeHasMatch) continue;
        if (lastEnd < text.length) frag.appendChild(document.createTextNode(text.slice(lastEnd)));
        const parent = textNode.parentNode;
        if (!parent || !parent.contains(textNode)) continue;
        try {
          parent.replaceChild(frag, textNode);
        } catch {
          // textNode was already removed by React reconciliation between collection and replace
        }
      }

      marksRef.current = newMarks;
      setTotal(newMarks.length);
      if (newMarks.length > 0) {
        const desired = typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < newMarks.length
          ? initialIndex
          : 0;
        setCurrentIndex(desired);
        setActive(desired);
      }
    } catch (err) {
      // Defensive: never let a DOM-mutation race crash the app
      // eslint-disable-next-line no-console
      console.warn('useTextHighlight: failed to apply highlights', err);
      marksRef.current = [];
      setTotal(0);
      setCurrentIndex(-1);
    }

    return () => {
      try { unwrapMarks(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, query, caseSensitive, contentKey]);

  return {
    total,
    currentIndex,
    next: () => {
      if (marksRef.current.length === 0) return;
      const next = (currentIndex + 1) % marksRef.current.length;
      setCurrentIndex(next);
      setActive(next);
    },
    prev: () => {
      if (marksRef.current.length === 0) return;
      const prev = (currentIndex - 1 + marksRef.current.length) % marksRef.current.length;
      setCurrentIndex(prev);
      setActive(prev);
    },
    clear: () => {
      unwrapMarks();
      setTotal(0);
      setCurrentIndex(-1);
    },
    setIndex: (idx: number) => {
      if (idx < 0 || idx >= marksRef.current.length) return;
      setCurrentIndex(idx);
      setActive(idx);
    },
  };
}
