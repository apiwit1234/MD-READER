'use client';
import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Theme } from '@/types';
import { classifyLink } from '@/lib/html-links';
import { getApi, hasApi } from '@/lib/electron-api';

type Props = {
  /** Raw HTML of the current page. */
  html: string;
  /** Relative path of the current page (for resolving links + the toolbar). */
  relativePath: string;
  theme: Theme;
  /** Called with the resolved relative path when an internal .html link is clicked. */
  onNavigate: (relativePath: string) => void;
  /** Optional history controls (wired by the page). */
  canBack?: boolean;
  canForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  /** Ctrl+wheel inside the iframe forwards a zoom step (+1 in / -1 out). */
  onZoom?: (direction: 1 | -1) => void;
};

// Injected into the iframe; forwards link clicks and Ctrl+wheel zoom to the parent
// (a sandboxed iframe is a separate document, so the app's own listeners can't see them).
const NAV_BRIDGE = `
<script>
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a') : null;
  if (!a) return;
  var href = a.getAttribute('href');
  if (href == null) return;
  e.preventDefault();
  parent.postMessage({ type: 'pax-nav', href: href }, '*');
}, true);
document.addEventListener('wheel', function (e) {
  if (!e.ctrlKey) return;
  e.preventDefault();
  parent.postMessage({ type: 'pax-zoom', delta: e.deltaY < 0 ? 1 : -1 }, '*');
}, { passive: false });
</script>`;

export function HtmlView({ html, relativePath, theme: _theme, onNavigate, canBack, canForward, onBack, onForward, onZoom }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => `${html}\n${NAV_BRIDGE}`, [html]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only accept intents from our own rendered preview iframe.
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { type?: string; href?: string; delta?: number } | null;
      if (!data) return;
      if (data.type === 'pax-zoom' && (data.delta === 1 || data.delta === -1)) {
        onZoom?.(data.delta);
        return;
      }
      if (data.type !== 'pax-nav' || typeof data.href !== 'string') return;
      const link = classifyLink(data.href, relativePath);
      if (link.kind === 'external') {
        if (hasApi()) void getApi().app.openExternal(link.url);
      } else if (link.kind === 'internal') {
        onNavigate(link.relativePath);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [relativePath, onNavigate, onZoom]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border bg-surface px-2 py-1 text-xs">
        <button type="button" aria-label="Back" disabled={!canBack} onClick={onBack}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" aria-label="Forward" disabled={!canForward} onClick={onForward}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="ml-1 truncate font-mono text-muted">{relativePath}</span>
      </div>
      <iframe
        ref={iframeRef}
        title="HTML preview"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        className="min-h-0 w-full flex-1 border-0 bg-white"
        // Mirror the app's content zoom (Ctrl+=/-/0, Settings, Ctrl+wheel) into the
        // iframe — CSS vars don't cross the document boundary, but `zoom` on the
        // element scales its rendered content.
        style={{ zoom: 'var(--content-zoom, 1)' }}
      />
    </div>
  );
}
