'use client';
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import svgPanZoom from 'svg-pan-zoom';
import type { Theme } from '@/types';
import { themeMode } from '@/lib/themes';
import { normalizeMermaidEntities } from '@/lib/mermaid-entities';

type Props = {
  source: string;
  theme: Theme;
  onOpenInNewTab?: (source: string) => void;
  /** Fired after the diagram SVG mounts, so in-page find can re-scan SVG labels. */
  onRendered?: () => void;
};

const idCounter = { n: 0 };

/**
 * Safely tear down a svg-pan-zoom instance. Its destroy() calls SVGMatrix.inverse(),
 * which throws "matrix is not invertible" when the SVG has a zero-size bounding box
 * (e.g. the diagram is in a display:none container, as happens when switching work
 * modes). Destroying must never crash the app, so we swallow that error.
 */
/** True when the SVG's screen matrix can be inverted. svg-pan-zoom's pan/zoom math
 *  calls SVGMatrix.inverse(), which throws on a zero-size/degenerate matrix (e.g.
 *  the diagram is briefly unsized or in a collapsed container). */
function ctmInvertible(svg: SVGSVGElement): boolean {
  const m = svg.getScreenCTM();
  if (!m) return false;
  return Math.abs(m.a * m.d - m.b * m.c) > 1e-12;
}

/** Capture-phase wheel guard: if the SVG matrix isn't invertible, stop the event
 *  before svg-pan-zoom's wheel handler runs (which would throw). Returns a cleanup. */
function installWheelGuard(container: HTMLElement, svg: SVGSVGElement): () => void {
  const guard = (ev: WheelEvent) => {
    if (!ctmInvertible(svg)) { ev.stopImmediatePropagation(); ev.preventDefault(); }
  };
  container.addEventListener('wheel', guard, { capture: true, passive: false });
  return () => container.removeEventListener('wheel', guard, true);
}

function destroyPanZoom(ref: { current: ReturnType<typeof svgPanZoom> | null }): void {
  try {
    ref.current?.destroy();
  } catch {
    // SVG hidden / not measurable — nothing meaningful to clean up.
  }
  ref.current = null;
}

function parseSvg(markup: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const el = doc.documentElement;
  if (!el || el.nodeName.toLowerCase() !== 'svg') return null;
  return el as unknown as SVGSVGElement;
}

function mountSvg(host: HTMLElement, markup: string): SVGSVGElement | null {
  const svg = parseSvg(markup);
  if (!svg) return null;
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  host.replaceChildren(svg);
  return svg;
}

export function MermaidBlock({ source, theme, onOpenInNewTab, onRendered }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const panZoomRef = useRef<ReturnType<typeof svgPanZoom> | null>(null);
  const overlayPanZoomRef = useRef<ReturnType<typeof svgPanZoom> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: themeMode(theme) === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
    });
    let cancelled = false;
    const id = `mmd-${++idCounter.n}`;
    setError(null);
    mermaid
      .render(id, source)
      .then(({ svg }) => { if (!cancelled) setSvgMarkup(svg); })
      .catch((e) => {
        // Entities like '&lt;' break mermaid's parser (their ';' ends the
        // statement). Retry once with them rewritten to mermaid '#N;' escapes;
        // sources without entities are unchanged, so no retry happens.
        const normalized = normalizeMermaidEntities(source);
        const originalError = (e as Error).message || 'render error';
        if (cancelled || normalized === source) {
          if (!cancelled) setError(originalError);
          return;
        }
        mermaid
          .render(`${id}-retry`, normalized)
          .then(({ svg }) => { if (!cancelled) setSvgMarkup(svg); })
          .catch(() => { if (!cancelled) setError(originalError); });
      });
    return () => { cancelled = true; };
  }, [source, theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!svgMarkup || !container) return;
    const svg = mountSvg(container, svgMarkup);
    if (!svg) return;
    destroyPanZoom(panZoomRef);
    panZoomRef.current = svgPanZoom(svg, {
      zoomEnabled: true,
      panEnabled: true,
      controlIconsEnabled: false,
      mouseWheelZoomEnabled: true,
      dblClickZoomEnabled: false,
      preventMouseEventsDefault: true,
      fit: true,
      center: true,
    });
    const removeWheelGuard = installWheelGuard(container, svg);

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };
    svg.addEventListener('mousedown', onMouseDown);
    onRendered?.();
    return () => {
      removeWheelGuard();
      svg.removeEventListener('mousedown', onMouseDown);
      destroyPanZoom(panZoomRef);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgMarkup]);

  useEffect(() => {
    const container = overlayContainerRef.current;
    if (!isFullscreen || !svgMarkup || !container) return;
    const svg = mountSvg(container, svgMarkup);
    if (!svg) return;
    destroyPanZoom(overlayPanZoomRef);
    overlayPanZoomRef.current = svgPanZoom(svg, {
      zoomEnabled: true, panEnabled: true, controlIconsEnabled: false,
      mouseWheelZoomEnabled: true, dblClickZoomEnabled: false,
      preventMouseEventsDefault: true, fit: true, center: true,
    });
    const removeWheelGuard = installWheelGuard(container, svg);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      removeWheelGuard();
      window.removeEventListener('keydown', onKey);
      destroyPanZoom(overlayPanZoomRef);
    };
  }, [isFullscreen, svgMarkup]);

  if (error) {
    return (
      <div className="my-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Diagram failed to render</div>
          <button
            type="button"
            onClick={() => { void navigator.clipboard?.writeText(source); }}
            className="rounded border border-red-300 px-2 py-0.5 text-xs hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900"
            aria-label="Copy diagram source"
          >
            📋 Copy source
          </button>
        </div>
        <div className="mt-1 font-mono text-xs">{error}</div>
        <pre className="mt-2 overflow-x-auto rounded bg-surface-2 p-2 text-xs text-fg">{source}</pre>
      </div>
    );
  }

  return (
    <>
      <div className="my-3 rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-2 py-1 text-xs text-muted">
          <span>Mermaid — scroll to zoom, middle-click to pan</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => panZoomRef.current?.reset()}
              className="rounded px-2 py-0.5 hover:bg-surface-2"
              aria-label="Reset diagram view"
            >
              ⟳
            </button>
            {onOpenInNewTab && (
              <button
                type="button"
                onClick={() => onOpenInNewTab(source)}
                className="rounded px-2 py-0.5 hover:bg-surface-2"
                aria-label="Open diagram in new tab"
                title="Open in new tab"
              >
                ↗
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="rounded px-2 py-0.5 hover:bg-surface-2"
              aria-label="Open fullscreen diagram"
            >
              ⛶
            </button>
          </div>
        </div>
        <div ref={containerRef} className="h-[400px] overflow-hidden" />
      </div>

      {isFullscreen && (
        <div
          role="dialog"
          aria-label="Diagram fullscreen"
          className="fixed inset-0 z-50 flex flex-col bg-bg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
            <span>Diagram — press Esc to close</span>
            <div className="flex gap-2">
              <button
                onClick={() => overlayPanZoomRef.current?.reset()}
                className="rounded px-2 py-1 hover:bg-surface-2"
                aria-label="Reset diagram view"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="rounded px-2 py-1 hover:bg-surface-2"
                aria-label="Close fullscreen"
              >
                ✕
              </button>
            </div>
          </div>
          <div ref={overlayContainerRef} className="flex-1" />
        </div>
      )}
    </>
  );
}
