// Icons: ZeroLatency's own line icons (24 grid, 1.5 stroke) and filled view glyphs. Generated from design-system/scripts/previews.mjs plus app additions.
import type { CSSProperties } from 'react';
import type { Glyph as GlyphName, Ink } from '@/lib/shared/views';

const LINE: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 20 20"/>',
  compose: '<path d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/><path d="M17.5 4.5l2 2L12 14l-2.8.8.8-2.8z"/>',
  chevDown: '<path d="M7 10l5 5 5-5"/>', chevRight: '<path d="M10 7l5 5-5 5"/>', chevUp: '<path d="M7 14l5-5 5 5"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', collapse: '<path d="M13 7l-5 5 5 5M19 7l-5 5 5 5"/>', expand: '<path d="M11 7l5 5-5 5M5 7l5 5-5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M7 7l10 10M17 7 7 17"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>', group: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>',
  refresh: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4.5V8h-3.5"/>',
  archive: '<rect x="4" y="5" width="16" height="4" rx="1"/><path d="M5.5 9v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9M10 13h4"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>', clock: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v4l2.5 1.5"/>',
  tag: '<path d="M4 12.5V5a1 1 0 0 1 1-1h7.5L20 11.5 12.5 19z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
  read: '<rect x="5" y="5" width="14" height="14" rx="2.5"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  unread: '<rect x="5" y="5" width="14" height="14" rx="2.5"/><circle cx="17.5" cy="6.5" r="2.5" fill="currentColor" stroke="none"/>',
  more: '<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="2.6"/>', clip: '<path d="M16.5 8.5 10 15a2 2 0 0 1-2.8-2.8L14 5.4a3.5 3.5 0 0 1 5 5L12 17.5a5 5 0 0 1-7-7L11.5 4"/>',
  eye: '<path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>',
  eyeOff: '<path d="M4 4l16 16M9.9 6.3A9 9 0 0 1 12 6c5.8 0 9 6 9 6a15 15 0 0 1-2.6 3.3M6.4 7.8A15 15 0 0 0 3 12s3.2 6 9 6a8.6 8.6 0 0 0 3.6-.8"/>',
  drag: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="2.4"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  send: '<path d="M20 4 10 14M20 4l-6 16-4-6-6-4z"/>', draft: '<circle cx="12" cy="12" r="7.5"/><path d="M9 15l1-3 4.5-4.5 2 2L12 14z"/>',
  spam: '<rect x="4.5" y="4.5" width="15" height="15" rx="3"/><path d="M12 8.5v4M12 15.5v.01"/>',
  help: '<circle cx="12" cy="12" r="8"/><path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.8c0 1.6-2.2 2-2.2 3.4M12 16.5v.01"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v3M15.5 3.5v3"/>',
  sliders: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
  text: '<path d="M4 18 8.5 6 13 18M5.8 14.5h5.4M15.5 12.5c.6-.7 1.4-1 2.3-1 1.4 0 2.2.8 2.2 2.2V18M20 15c-2.8 0-4.5.5-4.5 1.7 0 .9.7 1.4 1.7 1.4 1.5 0 2.8-1.1 2.8-2.6"/>',
  hash: '<path d="M9 4 7 20M17 4l-2 16M4.5 9h16M3.5 15h16"/>', select: '<circle cx="12" cy="12" r="8"/><path d="M9 11l3 3 3-3"/>',
  status: '<path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20M6.3 6.3l1.8 1.8M15.9 15.9l1.8 1.8M6.3 17.7l1.8-1.8M15.9 8.1l1.8-1.8"/>',
  person: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="10" r="2.8"/><path d="M7 17.5c1-2 2.8-3 5-3s4 1 5 3"/>',
  checkbox: '<rect x="5" y="5" width="14" height="14" rx="2.5"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  link: '<path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"/>',
  at: '<circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.3 6.7"/>',
  star: '<path d="M12 4.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 16.4l-4.6 2.4.9-5.2-3.8-3.6 5.2-.7z"/>',
  important: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5M12 15.5v.01"/>',
  external: '<path d="M9 6h9v9M18 6 7 17"/>', inbox: '<path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13h4.5l1 2h5l1-2H20"/>',
  wand: '<path d="M5 19 15 9M14 5v2M18 9h2M17 6l1.5-1.5M18.5 13.5 17 12M10 6 8.5 4.5"/>', user: '<circle cx="12" cy="9" r="3.2"/><path d="M5.5 19c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5"/>',
  map: '<path d="M4 6.5 9 4.5l6 2 5-2v13l-5 2-6-2-5 2z"/><path d="M9 4.5v13M15 6.5v13"/>', brackets: '<path d="M9 5H7.5A1.5 1.5 0 0 0 6 6.5v3L4.5 12 6 14.5v3A1.5 1.5 0 0 0 7.5 19H9M15 5h1.5A1.5 1.5 0 0 1 18 6.5v3l1.5 2.5-1.5 2.5v3a1.5 1.5 0 0 1-1.5 1.5H15"/>',
  pen: '<path d="M4 20l1.2-4.2L16 5l3 3L8.2 18.8z"/>', sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 5.5h1v2h-1zM4.5 11h1v2h-1zM4.5 16.5h1v2h-1z" fill="currentColor" stroke-width="0.6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  layers: '<path d="M12 4 3.5 8.5 12 13l8.5-4.5z"/><path d="M3.5 12.5 12 17l8.5-4.5"/><path d="M3.5 16.5 12 21l8.5-4.5"/>',
  reply: '<path d="M10 8 5 12.5l5 4.5"/><path d="M5.5 12.5H14a5 5 0 0 1 5 5V19"/>',
  replyAll: '<path d="M9 8 4 12.5 9 17"/><path d="M13 8l-5 4.5 5 4.5"/><path d="M8.5 12.5H15a5 5 0 0 1 5 5V19"/>',
  forward: '<path d="M14 8l5 4.5-5 4.5"/><path d="M18.5 12.5H10a5 5 0 0 0-5 5V19"/>',
  sparkle: '<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
  file: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4"/>',
  sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/>',
  logout: '<path d="M14 5h4.5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H14M10 8l-4 4 4 4M6 12h9"/>',
  bell: '<path d="M6.5 16V11a5.5 5.5 0 0 1 11 0v5l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/>',
  starFill: '<path d="M12 4.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 16.4l-4.6 2.4.9-5.2-3.8-3.6 5.2-.7z" fill="currentColor"/>',
  minus: '<path d="M6 12h12"/>',
  undo: '<path d="M9 7 5 11l4 4"/><path d="M5.5 11H15a4 4 0 0 1 0 8h-3"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  inboxIn: '<path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13h4.5l1 2h5l1-2H20M12 3.5v6M9.5 7.5 12 10l2.5-2.5"/>',
};

const GLYPH: Record<string, string> = {
  inbox: '<path d="M6 4h12l3 8.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6.5zm-.6 8.5h4.3l1 2h2.6l1-2h4.3L16.6 6H7.4z"/>',
  tag: '<path d="M3 11.6V4a1 1 0 0 1 1-1h7.6l9.7 9.7a1 1 0 0 1 0 1.4l-7.2 7.2a1 1 0 0 1-1.4 0zM7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>',
  bolt: '<path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.8z"/>',
  book: '<path d="M5 4a2 2 0 0 1 2-2h12v16H7a1 1 0 0 0 0 2h12v2H7a3 3 0 0 1-3-3V4zm4 2v2h7V6z"/>',
  archive: '<path d="M3 4h18v5H3zm1.5 6.5h15V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1zm5 2v2h5v-2z"/>',
  cal: '<path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2zm-2 7v10h14V9z"/>',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 3.2V8l8 5 8-5v-.8l-8 5z"/>',
  alert: '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1.3 5 .4 7h1.8l.4-7zm1.3 8.7a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"/>',
  layers: '<path d="M12 2 2 7.5 12 13l10-5.5zM4.3 11.2 2 12.5 12 18l10-5.5-2.3-1.3L12 15.4zm0 5L2 17.5 12 23l10-5.5-2.3-1.3L12 20.4z"/>',
  bell: '<path d="M12 2a6 6 0 0 1 6 6v5l2 3v1H4v-1l2-3V8a6 6 0 0 1 6-6zm-2.5 17h5a2.5 2.5 0 0 1-5 0z"/>',
  chat: '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z"/>',
  basket: '<path d="M9.2 3.5 6.4 9H3v2l1.8 8.2A1 1 0 0 0 5.8 20h12.4a1 1 0 0 0 1-.8L21 11V9h-3.4l-2.8-5.5-1.8.9L15.4 9H8.6l2.4-4.6z"/>',
  bolt2: '<path d="M12 2l2.9 6.9L22 9.7l-5.3 4.8L18.2 22 12 18.3 5.8 22l1.5-7.5L2 9.7l7.1-.8z"/>',
  list: '<path d="M4 5h3v3H4zm5 0h11v3H9zM4 10.5h3v3H4zm5 0h11v3H9zM4 16h3v3H4zm5 0h11v3H9z"/>',
  cart: '<path d="M2 3h3l2.6 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.7L21 7H6.5M9 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>',
  plane: '<path d="M21 3 3 10.5l6.5 2.5L12 20z"/>',
  phone: '<path d="M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm4 17v1h2v-1z"/>',
  star: '<path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.8L12 17.6 6 21l1.3-6.8-5-4.7 6.8-.8z"/>',
  flag: '<path d="M5 2h2v1h11.5l-2.5 5 2.5 5H7v9H5z"/>',
  heart: '<path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z"/>',
  briefcase: '<path d="M9 3h6a1 1 0 0 1 1 1v2h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4V4a1 1 0 0 1 1-1zm1 2v1h4V5zM3 12h18v1.5H3z"/>',
};

export function Icon({ name, size, className = '', style, title }: { name: string; size?: number; className?: string; style?: CSSProperties; title?: string }) {
  const d = LINE[name] ?? LINE.more!;
  return (
    <svg className={`zl-icon ${className}`} viewBox="0 0 24 24" width={size} height={size} style={size ? { width: size, height: size, ...style } : style} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + d }} />
  );
}

export function Glyph({ name, ink, size, className = '' }: { name: GlyphName | string; ink: Ink | 'text'; size?: number; className?: string }) {
  const d = GLYPH[name] ?? GLYPH.inbox!;
  return <svg className={`zl-glyph zl-ink-${ink} ${className}`} viewBox="0 0 24 24" style={size ? { width: size, height: size } : undefined} aria-hidden dangerouslySetInnerHTML={{ __html: d }} />;
}

export const GLYPH_NAMES = Object.keys(GLYPH);

const STATUS_PATHS = {
  todo: '<circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.6"/>',
  progress: '<circle cx="7" cy="7" r="6.5" fill="currentColor"/><path d="M5.6 4.4 9.6 7l-4 2.6z" fill="#fff"/>',
  done: '<circle cx="7" cy="7" r="6.5" fill="currentColor"/><path d="M4.3 7.2 6.2 9l3.6-3.8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  canceled: '<circle cx="7" cy="7" r="6.5" fill="currentColor"/><path d="M4.9 4.9l4.2 4.2M9.1 4.9 4.9 9.1" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
} as const;

export function StatusDot({ state }: { state: keyof typeof STATUS_PATHS }) {
  return <svg className="zl-status-dot" viewBox="0 0 14 14" aria-hidden dangerouslySetInnerHTML={{ __html: STATUS_PATHS[state] }} />;
}

export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M13.5 9.5A7 7 0 1 0 20.5 16.5M13.5 9.5H24.5" fill="none" stroke="var(--accent-fg)" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
