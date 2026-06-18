'use client';
import { useEffect, useMemo } from 'react';
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
};

// Injected into the iframe; captures link clicks and forwards intent to the parent.
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
</script>`;

export function HtmlView({ html, relativePath, theme: _theme, onNavigate, canBack, canForward, onBack, onForward }: Props) {
  const srcDoc = useMemo(() => `${html}\n${NAV_BRIDGE}`, [html]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; href?: string } | null;
      if (!data || data.type !== 'pax-nav' || typeof data.href !== 'string') return;
      const link = classifyLink(data.href, relativePath);
      if (link.kind === 'external') {
        if (hasApi()) void getApi().app.openExternal(link.url);
      } else if (link.kind === 'internal') {
        onNavigate(link.relativePath);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [relativePath, onNavigate]);

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
        title="HTML preview"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
