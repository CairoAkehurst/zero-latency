'use client';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { updateAccount } from '@/lib/client/store';
import { baseView, domainOf, primarySender, uid, VIEW_TEMPLATES, INKS, GLYPHS, type Glyph as GlyphName, type Ink, type View } from '@/lib/shared/views';
import { Glyph, Icon } from './icons';
import { Popover, useMenuKeys } from './ui';
import { useMail } from './mail-context';

function addView(v: View, navigate: (t: { kind: 'view'; id: string }) => void) {
  updateAccount((d) => ({ ...d, views: [...d.views, v] }));
  navigate({ kind: 'view', id: v.id });
}

export function NewViewMenu({ anchor, onClose }: { anchor: HTMLElement; onClose: () => void }) {
  const { navigate, openEditView, openAutoLabel, threads, me } = useMail();
  const [gallery, setGallery] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useMenuKeys(ref);

  // Suggest views for the most frequent senders and domains in the current list.
  const suggestions = useMemo(() => {
    const senders = new Map<string, { name: string; n: number }>();
    const domains = new Map<string, number>();
    for (const t of threads) {
      const s = primarySender(t, me);
      if (!s.email || s.email.toLowerCase() === me.toLowerCase()) continue;
      const k = s.email.toLowerCase();
      senders.set(k, { name: s.name || s.email, n: (senders.get(k)?.n ?? 0) + 1 });
      const d = domainOf(k);
      if (!/^(gmail|googlemail|outlook|hotmail|yahoo|icloud)\./.test(d)) domains.set(d, (domains.get(d) ?? 0) + 1);
    }
    const topSenders = [...senders.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 2).map(([email, v]) => ({ kind: 'from' as const, value: email, label: v.name }));
    const topDomains = [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => ({ kind: 'domain' as const, value: d, label: d }));
    return [...topSenders, ...topDomains];
  }, [threads, me]);

  const manual = () => {
    const v = baseView({ name: 'New view', glyph: 'alert', ink: 'orange', filters: [{ id: uid('f_'), field: 'mailbox', op: 'is', values: ['inbox'] }] });
    addView(v, navigate);
    openEditView(v.id, 'root');
    onClose();
  };

  if (gallery) return <TemplateGallery onClose={onClose} />;
  return (
    <Popover anchor={anchor} onClose={onClose} placement="bottom-start" label="New view">
      <div className="zl-menu" ref={ref} style={{ width: 260 }}>
        <div className="zl-menu-label">New view</div>
        <button className="zl-menu-item" onClick={() => { onClose(); openAutoLabel(); }}><Icon name="wand" />Create from an auto label</button>
        <button className="zl-menu-item" onClick={manual}><Icon name="filter" />Configure manually</button>
        <button className="zl-menu-item" onClick={() => setGallery(true)}><Icon name="group" />Use template</button>
        {suggestions.length ? <div className="zl-menu-label">Suggested views</div> : null}
        {suggestions.map((s) => (
          <button key={`${s.kind}:${s.value}`} className="zl-menu-item" onClick={() => {
            const v = baseView({
              name: s.label, glyph: s.kind === 'from' ? 'chat' : 'briefcase', ink: s.kind === 'from' ? 'blue' : 'brown',
              filters: [{ id: uid('f_'), field: 'from', op: 'contains', values: [s.kind === 'domain' ? `@${s.value}` : s.value] }],
            });
            addView(v, navigate);
            onClose();
          }}>
            <Icon name={s.kind === 'from' ? 'user' : 'at'} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.kind === 'from' ? 'From' : 'Domain'} <span style={{ color: 'var(--text-subtle)' }}>is</span> {s.label}</span>
          </button>
        ))}
      </div>
    </Popover>
  );
}

export function TemplateGallery({ onClose }: { onClose: () => void }) {
  const { navigate } = useMail();
  return createPortal(
    <div className="zl-dialog-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zl-gallery" role="dialog" aria-modal="true" aria-label="View templates">
        <button className="zl-btn zl-btn--icon" style={{ position: 'absolute', top: 16, right: 16 }} aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        <h2 style={{ margin: '0 0 20px', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Start from a template</h2>
        <div className="zl-templates">
          {VIEW_TEMPLATES.map((t) => (
            <button key={t.key} className="zl-template" onClick={() => { addView(t.make(), navigate); onClose(); }}>
              <span className="zl-template-art" style={{ background: `var(--tag-${t.ink}-bg)` }}>
                <span style={{ display: 'flex' }}><Glyph name={t.glyph} ink={t.ink} /></span>
                <span className="zl-bar" /><span className="zl-bar" style={{ width: '50%' }} />
              </span>
              <span className="zl-template-meta"><Glyph name={t.glyph} ink={t.ink} /><strong>{t.name}</strong><small>{t.description}</small></span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function GlyphPicker({ anchor, glyph, ink, onPick, onClose }: { anchor: HTMLElement; glyph: GlyphName; ink: Ink; onPick: (g: GlyphName, i: Ink) => void; onClose: () => void }) {
  return (
    <Popover anchor={anchor} onClose={onClose} label="Choose icon">
      <div className="zl-menu" style={{ width: 288 }}>
        <div className="zl-menu-label">Colour</div>
        <div style={{ display: 'flex', gap: 6, padding: '2px 6px 6px' }}>
          {INKS.map((i) => (
            <button key={i} type="button" aria-label={i} aria-pressed={i === ink} onClick={() => onPick(glyph, i)}
              style={{ width: 22, height: 22, borderRadius: 999, border: 0, cursor: 'pointer', background: `var(--icon-${i})`, boxShadow: i === ink ? '0 0 0 2px var(--bg), 0 0 0 4px var(--focus-ring)' : 'none' }} />
          ))}
        </div>
        <div className="zl-menu-label">Icon</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, padding: '0 4px 4px' }}>
          {GLYPHS.map((g) => (
            <button key={g} type="button" className="zl-btn zl-btn--icon" aria-label={g} aria-pressed={g === glyph} onClick={() => onPick(g, ink)} style={g === glyph ? { background: 'var(--surface-selected)' } : undefined}>
              <Glyph name={g} ink={ink} />
            </button>
          ))}
        </div>
      </div>
    </Popover>
  );
}
