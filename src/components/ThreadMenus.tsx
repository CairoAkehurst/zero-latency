'use client';
import { useMemo, useRef, useState } from 'react';
import { useAccountData } from '@/lib/client/store';
import { INKS, type Ink } from '@/lib/shared/views';
import type { Label } from '@/lib/shared/types';
import { Icon } from './icons';
import { Popover, useMenuKeys } from './ui';
import { useMail } from './mail-context';
import { tomorrowMorning } from './shortcuts';

/** Deterministic default ink for a label name. */
export function inkFor(label: Label, custom: Record<string, Ink>): Ink {
  if (custom[label.id]) return custom[label.id]!;
  let h = 0;
  for (const c of label.name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return INKS[h % INKS.length]!;
}

export function LabelChip({ label }: { label: Label }) {
  const data = useAccountData();
  const ink = inkFor(label, data.labelInks);
  const short = label.name.split('/').pop() ?? label.name;
  return <span className={`zl-tag ${ink === 'gray' ? '' : `zl-tag--${ink}`}`} title={label.name}><span>{short}</span></span>;
}

export function LabelMenu({ anchor, threadIds, current, onClose }: { anchor: HTMLElement; threadIds: string[]; current: string[][]; onClose: () => void }) {
  const { userLabels, act, ensureLabel } = useMail();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useMenuKeys(ref);
  const filtered = useMemo(() => userLabels.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase())), [userLabels, q]);
  const state = (id: string): 'all' | 'some' | 'none' => {
    const n = current.filter((ls) => ls.includes(id)).length;
    return n === 0 ? 'none' : n === current.length ? 'all' : 'some';
  };
  const exact = userLabels.some((l) => l.name.toLowerCase() === q.trim().toLowerCase());
  return (
    <Popover anchor={anchor} onClose={onClose} label="Label as">
      <div className="zl-menu" ref={ref} style={{ width: 280 }}>
        <input className="zl-input zl-menu-search" placeholder="Label as…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search labels"
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && q.trim() && !exact && !busy) {
              setBusy(true);
              try { const l = await ensureLabel(q.trim()); await act(threadIds, { kind: 'label', labelId: l.id }); onClose(); } finally { setBusy(false); }
            }
          }} />
        <div className="zl-menu-scroll">
          {filtered.map((l) => {
            const s = state(l.id);
            return (
              <button key={l.id} className="zl-menu-item" onClick={() => { void act(threadIds, s === 'all' ? { kind: 'unlabel', labelId: l.id } : { kind: 'label', labelId: l.id }); onClose(); }}>
                <LabelChip label={l} />
                {s !== 'none' ? <Icon name={s === 'all' ? 'check' : 'minus'} className="zl-menu-item-check" /> : null}
              </button>
            );
          })}
          {!filtered.length && !q ? <div className="zl-menu-empty">No labels yet. Type a name to create one.</div> : null}
        </div>
        {q.trim() && !exact ? (
          <button className="zl-menu-item" disabled={busy} onClick={async () => {
            setBusy(true);
            try { const l = await ensureLabel(q.trim()); await act(threadIds, { kind: 'label', labelId: l.id }); onClose(); } finally { setBusy(false); }
          }}><Icon name="plus" />Create label “{q.trim()}”</button>
        ) : null}
      </div>
    </Popover>
  );
}

export function remindPresets(now = new Date()): { label: string; hint: string; at: number }[] {
  const at = (d: Date) => d.getTime();
  const later = new Date(now.getTime() + 3 * 3_600_000); later.setMinutes(0, 0, 0);
  const sat = new Date(now); sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7)); sat.setHours(9, 0, 0, 0);
  const mon = new Date(now); mon.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7)); mon.setHours(9, 0, 0, 0);
  const fmt = (d: Date) => d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  const tm = new Date(tomorrowMorning(now));
  const out = [
    { label: 'Later today', hint: fmt(later), at: at(later) },
    { label: 'Tomorrow', hint: fmt(tm), at: at(tm) },
    { label: 'This weekend', hint: fmt(sat), at: at(sat) },
    { label: 'Next week', hint: fmt(mon), at: at(mon) },
  ];
  return later.getDate() !== now.getDate() ? out.slice(1) : out;
}

export function RemindMenu({ anchor, threadIds, onClose }: { anchor: HTMLElement; threadIds: string[]; onClose: () => void }) {
  const { act } = useMail();
  const [custom, setCustom] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useMenuKeys(ref);
  const presets = useMemo(() => remindPresets(), []);
  return (
    <Popover anchor={anchor} onClose={onClose} label="Remind me">
      <div className="zl-menu" ref={ref} style={{ width: 260 }}>
        <div className="zl-menu-label">Remind me</div>
        {presets.map((p) => (
          <button key={p.label} className="zl-menu-item" onClick={() => { void act(threadIds, { kind: 'remind', at: p.at }); onClose(); }}>
            {p.label}<span className="zl-menu-item-hint">{p.hint}</span>
          </button>
        ))}
        <div className="zl-menu-sep" />
        <div style={{ display: 'flex', gap: 6, padding: '4px 4px 2px' }}>
          <input className="zl-input" type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Pick a date and time" />
          <button className="zl-btn zl-btn--primary" disabled={!custom} onClick={() => {
            const at = new Date(custom).getTime();
            if (!Number.isFinite(at) || at <= Date.now()) { setCustom(''); return; }
            void act(threadIds, { kind: 'remind', at }); onClose();
          }}>Set</button>
        </div>
      </div>
    </Popover>
  );
}
