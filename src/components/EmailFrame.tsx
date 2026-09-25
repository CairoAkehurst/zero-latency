'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { attachmentUrl } from '@/lib/client/api';
import { invertedToken, tokenColor, useResolvedTheme } from '@/lib/client/theme';
import { escapeHtml, linkify } from '@/lib/shared/compose';
import type { MessageDetail } from '@/lib/shared/types';

const QUOTE_SELECTORS = ['.gmail_quote', 'blockquote[type="cite"]', '.zl_quote', '.yahoo_quoted', '#divRplyFwdMsg', '#appendonsend', '.moz-cite-prefix'];

/** Renders an HTML email in a sandboxed iframe: no scripts, no forms, links open in a new tab. */
export function EmailFrame({ message, accountId }: { message: MessageDetail; accountId: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(60);
  const [showQuoted, setShowQuoted] = useState(false);
  const theme = useResolvedTheme();

  const { doc, hasQuote } = useMemo(() => {
    let html = message.html ?? '';
    // Inline images referenced by Content-ID.
    for (const a of message.attachments) {
      if (!a.contentId) continue;
      const url = attachmentUrl(accountId, message.id, a, true);
      html = html.split(`cid:${a.contentId}`).join(url);
    }
    const hasQuote = typeof DOMParser !== 'undefined' && !!new DOMParser().parseFromString(html, 'text/html').querySelector(QUOTE_SELECTORS.join(','));
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const csp = `default-src 'none'; img-src https: http: data: ${origin}; style-src 'unsafe-inline' https:; font-src https: data:; media-src https:`;
    const hide = showQuoted ? '' : `${QUOTE_SELECTORS.join(',')}{display:none!important}`;
    // Dark theme: render the email as usual on the inverse of the app's colours, then invert the whole body.
    // Plain emails end up in exactly the app's background and text colours; designed emails keep their hues
    // (hue-rotate) with lightness flipped; images and videos are inverted back so they look unchanged.
    const dark = theme === 'dark' && typeof document !== 'undefined';
    const bg = dark ? invertedToken('--bg', '#e6e6e6') : 'transparent';
    // The root needs its own (real) background, otherwise the browser paints the body background onto the canvas,
    // outside the reach of the body's filter.
    const rootBg = dark ? tokenColor('--bg', '#191919') : 'transparent';
    const fg = dark ? invertedToken('--text', '#1a1a1a') : '#191918';
    const darkCss = dark
      ? `body{filter:invert(1) hue-rotate(180deg)}img,video,picture,canvas,svg image,[background],[style*="background-image"],[style*="background:url"],[style*="background: url"]{filter:invert(1) hue-rotate(180deg)}a{color:#1a64bd}`
      : '';
    const doc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank">
<style>:root{color-scheme:light}html{margin:0;padding:0;background:${rootBg}}body{margin:0;background:${bg};color:${fg};font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;overflow-wrap:anywhere;padding:4px 2px}img{max-width:100%;height:auto}table{max-width:100%}pre{white-space:pre-wrap}a{color:#1a64bd}${darkCss}${hide}</style></head><body>${html}</body></html>`;
    return { doc, hasQuote };
  }, [message, accountId, showQuoted, theme]);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let ro: ResizeObserver | null = null;
    const measure = () => {
      const body = frame.contentDocument?.body;
      if (body) setHeight(Math.min(Math.max(body.scrollHeight + 8, 40), 20000));
    };
    const onLoad = () => {
      measure();
      const body = frame.contentDocument?.body;
      if (body && 'ResizeObserver' in window) { ro = new ResizeObserver(measure); ro.observe(body); }
      frame.contentDocument?.querySelectorAll('img').forEach((img) => img.addEventListener('load', measure));
    };
    frame.addEventListener('load', onLoad);
    return () => { frame.removeEventListener('load', onLoad); ro?.disconnect(); };
  }, [doc]);

  return (
    <>
      <iframe
        ref={ref}
        className="zl-mail-frame"
        title={`Message from ${message.from?.name || message.from?.email || 'sender'}`}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={doc}
        // Match the document's scheme so the browser keeps the frame transparent instead of painting it white.
        style={{ height, colorScheme: 'light' }}
      />
      {hasQuote ? <button className="zl-btn zl-btn--text zl-btn--sm" onClick={() => setShowQuoted((s) => !s)} aria-expanded={showQuoted}>{showQuoted ? 'Hide quoted text' : '•••'}</button> : null}
    </>
  );
}

export function EmailText({ text }: { text: string }) {
  const [showQuoted, setShowQuoted] = useState(false);
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cut = lines.findIndex((l, i) => /^On .+wrote:\s*$/.test(l.trim()) || (l.startsWith('>') && lines.slice(i).every((x) => x.startsWith('>') || !x.trim())));
  const main = cut > 0 && !showQuoted ? lines.slice(0, cut).join('\n') : text;
  return (
    <>
      <div className="zl-mail-text" dangerouslySetInnerHTML={{ __html: linkify(escapeHtml(main.trimEnd())) }} />
      {cut > 0 ? <button className="zl-btn zl-btn--text zl-btn--sm" onClick={() => setShowQuoted((s) => !s)}>{showQuoted ? 'Hide quoted text' : '•••'}</button> : null}
    </>
  );
}
