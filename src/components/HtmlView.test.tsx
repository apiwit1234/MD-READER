import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HtmlView } from './HtmlView';

describe('HtmlView', () => {
  it('renders the html into a sandboxed iframe', () => {
    const { getByTitle } = render(
      <HtmlView html="<p>hi</p>" relativePath="a.html" theme="dark" onNavigate={() => {}} />,
    );
    const frame = getByTitle('HTML preview') as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame.srcdoc).toContain('<p>hi</p>');
  });

  it('opens external links in the system browser via the nav message', () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    (globalThis as unknown as { window: { mdreader: unknown } }).window.mdreader = { app: { openExternal } };
    const onNavigate = vi.fn();
    render(<HtmlView html="<a href='https://x.com'>x</a>" relativePath="a.html" theme="dark" onNavigate={onNavigate} />);
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'pax-nav', href: 'https://x.com' } }));
    expect(openExternal).toHaveBeenCalledWith('https://x.com');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('navigates internal .html links in-app', () => {
    (globalThis as unknown as { window: { mdreader: unknown } }).window.mdreader = { app: { openExternal: vi.fn() } };
    const onNavigate = vi.fn();
    render(<HtmlView html="<a href='b.html'>b</a>" relativePath="docs/a.html" theme="dark" onNavigate={onNavigate} />);
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'pax-nav', href: 'b.html' } }));
    expect(onNavigate).toHaveBeenCalledWith('docs/b.html');
  });
});
