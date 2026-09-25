'use client';
import { useMemo, useRef, useState } from 'react';
import { updateView, useAccountData } from '@/lib/client/store';
import { domainOf, primarySender, type GroupBy, type View } from '@/lib/shared/views';
import { Icon } from './icons';
import { Popover, useMenuKeys } from './ui';
import { useMail } from './mail-context';

const OPTIONS: { kind: GroupBy['kind']; label: string; desc: string; icon: string; sub?: boolean }[] = [
  { kind: 'date', label: 'Date', desc: 'Group by date', icon: 'cal' },
  { kind: 'starred', label: 'Starred', desc: 'Group by starred emails', icon: 'star' },
  { kind: 'important', label: 'Important', desc: 'Group by Gmail’s Important marker', icon: 'important' },
  { kind: 'sender', label: 'Sender', desc: 'Group by person', icon: 'person' },
  { kind: 'domain', label: 'Domain', desc: 'Group by company domain', icon: 'at' },
  { kind: 'keywords', label: 'Email or domain', desc: 'Pick people and companies to group by', icon: 'at', sub: true },
  { kind: 'label', label: 'Label', desc: 'Group by Gmail label', icon: 'tag' },
  { kind: 'unread', label: 'Unread', desc: 'Split into unread and read', icon: 'unread' },
  { kind: 'none', label: 'None', desc: 'One continuous list', icon: 'minus' },
];

export function GroupByMenu({ anchor, view, onClose }: { anchor: HTMLElement; view: View; onClose: () => void }) {
  const data = useAccountData();
  const [q, setQ] = useState('');
  const [keywordMode, setKeywordMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useMenuKeys(ref);
  const set = (g: GroupBy) => updateView(view.id, (v) => ({ ...v, groupBy: g }));
  const props = (data.properties[view.id] ?? []).filter((p) => p.type === 'select' || p.type === 'status');

  if (keywordMode) return <KeywordMenu anchor={anchor} view={view} onBack={() => setKeywordMode(false)} onClose={onClose} />;
  const needle = q.trim().toLowerCase();
  return (
    <Popover anchor={anchor} onClose={onClose} placement="bottom-end" label="Group by">
      <div className="zl-menu" ref={ref}>
        <div className="zl-menu-title">Group by</div>
        <input className="zl-input zl-menu-search" placeholder="Search grouping options…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search grouping options" />
        <div className="zl-menu-scroll" style={{ maxHeight: 420 }}>
          {OPTIONS.filter((o) => o.label.toLowerCase().includes(needle)).map((o) => (
            <button key={o.kind} className="zl-menu-item zl-menu-item--2line" onClick={() => { if (o.sub) setKeywordMode(true); else { set({ kind: o.kind } as GroupBy); onClose(); } }}>
              <Icon name={o.icon} />
              <span className="zl-menu-item-text">{o.label}<small>{o.desc}</small></span>
              {o.sub ? <span className="zl-menu-item-hint"><Icon name="chevRight" /></span> : view.groupBy.kind === o.kind ? <Icon name="check" className="zl-menu-item-check" /> : null}
            </button>
          ))}
          {props.filter((p) => p.name.toLowerCase().includes(needle)).map((p) => (
            <button key={p.id} className="zl-menu-item zl-menu-item--2line" onClick={() => { set({ kind: 'property', propertyId: p.id }); onClose(); }}>
              <Icon name={p.type === 'status' ? 'status' : 'select'} />
              <span className="zl-menu-item-text">{p.name}<small>Group by the {p.name} property</small></span>
              {view.groupBy.kind === 'property' && view.groupBy.propertyId === p.id ? <Icon name="check" className="zl-menu-item-check" /> : null}
            </button>
          ))}
        </div>
      </div>
    </Popover>
  );
}

function KeywordMenu({ anchor, view, onBack, onClose }: { anchor: HTMLElement; view: View; onBack: () => void; onClose: () => void }) {
  const { threads, me } = useMail();
  const [q, setQ] = useState('');
  const keywords = useMemo(() => (view.groupBy.kind === 'keywords' ? view.groupBy.keywords : []), [view.groupBy]);
  const setKeywords = (k: string[]) => updateView(view.id, (v) => ({ ...v, groupBy: k.length ? { kind: 'keywords', keywords: k } : { kind: 'date' } }));
  const suggestions = useMemo(() => {
    const out = new Map<string, string>();
    for (const t of threads) {
      const s = primarySender(t, me);
      if (!s.email || s.email.toLowerCase() === me.toLowerCase()) continue;
      out.set(s.email.toLowerCase(), s.name || s.email);
      out.set(domainOf(s.email), domainOf(s.email));
    }
    const needle = q.trim().toLowerCase();
    return [...out.entries()].filter(([k, n]) => !keywords.includes(k) && (!needle || k.includes(needle) || n.toLowerCase().includes(needle))).slice(0, 8);
  }, [threads, me, q, keywords]);
  return (
    <Popover anchor={anchor} onClose={onClose} placement="bottom-end" label="Group by keyword">
      <div className="zl-menu">
        <div className="zl-menu-title"><button className="zl-btn zl-btn--icon zl-btn--sm" aria-label="Back" onClick={onBack}><Icon name="back" /></button>Group by keyword</div>
        <input className="zl-input zl-menu-search" placeholder="Search keyword…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search keyword"
          onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) { setKeywords([...keywords, q.trim().toLowerCase()]); setQ(''); } }} />
        {keywords.length ? <div className="zl-menu-label">Shown in view</div> : null}
        {keywords.map((k) => (
          <div key={k} className="zl-menu-item">
            <span className="zl-monogram">{k[0]?.toUpperCase()}</span>{k}
            <button className="zl-btn zl-btn--icon zl-btn--sm" style={{ marginLeft: 'auto' }} aria-label={`Remove ${k}`} onClick={() => setKeywords(keywords.filter((x) => x !== k))}><Icon name="x" /></button>
          </div>
        ))}
        {suggestions.length ? <div className="zl-menu-label">Suggested</div> : null}
        {suggestions.map(([k, n]) => (
          <button key={k} className="zl-menu-item zl-menu-item--2line" onClick={() => setKeywords([...keywords, k])}>
            <span className="zl-monogram">{n[0]?.toUpperCase()}</span>
            <span className="zl-menu-item-text">{n}{n !== k ? <small>{k}</small> : null}</span>
            <span className="zl-menu-item-hint"><Icon name="plus" /></span>
          </button>
        ))}
        {!suggestions.length && q.trim() ? <div className="zl-menu-empty">Press Enter to add “{q.trim()}”.</div> : null}
        <div className="zl-menu-footer"><button className="zl-btn zl-btn--text" onClick={() => { setKeywords([]); onClose(); }}><Icon name="trash" />Remove grouping</button><span /></div>
      </div>
    </Popover>
  );
}
