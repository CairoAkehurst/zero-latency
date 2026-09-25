'use client';
import { useState } from 'react';
import { duplicateView, updateAccount, updateView, useAccountData, type PropertyDef, type PropertyOption, type PropertyType } from '@/lib/client/store';
import { ALL_HOVER_ACTIONS, BUILTIN_PROPS, INKS, uid, type HoverAction, type Ink, type View } from '@/lib/shared/views';
import { Glyph, Icon, StatusDot } from './icons';
import { IconButton, Toggle } from './ui';
import { useMail } from './mail-context';
import { GlyphPicker } from './NewViewMenu';
import { DeleteViewDialog } from './ViewMenu';
import { FilterMenu, describeRule } from './FilterMenu';
import { GroupByMenu } from './GroupByMenu';

type Step = 'root' | 'properties' | 'filters' | 'hover';

const BUILTIN_LABEL: Record<string, { label: string; icon: string }> = {
  from: { label: 'From', icon: 'person' }, subject: { label: 'Subject', icon: 'text' }, snippet: { label: 'Preview', icon: 'text' },
  labels: { label: 'Label', icon: 'tag' }, date: { label: 'Date', icon: 'cal' }, files: { label: 'Files', icon: 'clip' },
};

const TYPES: { type: PropertyType; label: string; desc: string; icon: string }[] = [
  { type: 'text', label: 'Text', desc: 'For summaries and notes', icon: 'text' },
  { type: 'number', label: 'Number', desc: 'For quantities and amounts', icon: 'hash' },
  { type: 'select', label: 'Select', desc: 'Choose one option', icon: 'select' },
  { type: 'multiSelect', label: 'Multi-select', desc: 'Choose one or more options', icon: 'tag' },
  { type: 'status', label: 'Status', desc: 'For tracking progress', icon: 'status' },
  { type: 'date', label: 'Date', desc: 'Accepts a date', icon: 'cal' },
  { type: 'checkbox', label: 'Checkbox', desc: 'Indicate true or false', icon: 'checkbox' },
  { type: 'url', label: 'URL', desc: 'Add links to your emails', icon: 'link' },
];

const HOVER_LABEL: Record<HoverAction, { label: string; icon: string }> = {
  archive: { label: 'Archive', icon: 'archive' }, trash: { label: 'Trash', icon: 'trash' }, read: { label: 'Read/unread', icon: 'read' },
  remind: { label: 'Remind', icon: 'clock' }, label: { label: 'Any label', icon: 'tag' }, star: { label: 'Star', icon: 'star' },
};

function defaultStatus(): { options: PropertyOption[]; defaultOptionId: string } {
  const ids = { todo: uid('o_'), progress: uid('o_'), done: uid('o_'), canceled: uid('o_') };
  return {
    options: [
      { id: ids.todo, name: 'Not started', ink: 'gray', state: 'todo' },
      { id: ids.progress, name: 'In progress', ink: 'blue', state: 'progress' },
      { id: ids.done, name: 'Done', ink: 'green', state: 'done' },
      { id: ids.canceled, name: 'Canceled', ink: 'red', state: 'canceled' },
    ],
    defaultOptionId: ids.todo,
  };
}

export function EditViewPanel({ viewId, step, setStep, onClose }: { viewId: string; step: Step; setStep: (s: Step) => void; onClose: () => void }) {
  const data = useAccountData();
  const { labels, navigate } = useMail();
  const view = data.views.find((v) => v.id === viewId);
  const [glyphAnchor, setGlyphAnchor] = useState<HTMLElement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [groupAnchor, setGroupAnchor] = useState<HTMLElement | null>(null);
  const [propStep, setPropStep] = useState<{ kind: 'add' } | { kind: 'edit'; id: string } | null>(null);
  if (!view) return null;
  const props = data.properties[view.id] ?? [];
  const set = (fn: (v: View) => View) => updateView(view.id, fn);

  if (step === 'properties' && propStep?.kind === 'add') return <AddProperty view={view} onBack={() => setPropStep(null)} onClose={onClose} onCreated={(id) => setPropStep({ kind: 'edit', id })} />;
  if (step === 'properties' && propStep?.kind === 'edit') {
    const def = props.find((p) => p.id === propStep.id);
    if (def) return <EditProperty view={view} def={def} onBack={() => setPropStep(null)} onClose={onClose} />;
  }

  if (step === 'properties') {
    const all = [...BUILTIN_PROPS, ...props.map((p) => `prop:${p.id}`)];
    const shown = view.shown.filter((k) => all.includes(k));
    const hidden = all.filter((k) => !shown.includes(k));
    const meta = (k: string) => {
      if (k.startsWith('prop:')) { const p = props.find((x) => `prop:${x.id}` === k); return { label: p?.name ?? k, icon: TYPES.find((t) => t.type === p?.type)?.icon ?? 'text' }; }
      return BUILTIN_LABEL[k] ?? { label: k, icon: 'text' };
    };
    const move = (k: string, dir: -1 | 1) => set((v) => {
      const arr = [...v.shown]; const i = arr.indexOf(k); const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return v;
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
      return { ...v, shown: arr };
    });
    const row = (k: string, isShown: boolean, i: number) => {
      const m = meta(k);
      return (
        <div key={k} className="zl-panel-row zl-panel-row--prop">
          {isShown ? (
            <span style={{ display: 'grid', gap: 0 }}>
              <button className="zl-btn zl-btn--icon" style={{ height: 12, width: 16 }} aria-label={`Move ${m.label} up`} disabled={i === 0} onClick={() => move(k, -1)}><Icon name="chevUp" size={10} /></button>
              <button className="zl-btn zl-btn--icon" style={{ height: 12, width: 16 }} aria-label={`Move ${m.label} down`} disabled={i === shown.length - 1} onClick={() => move(k, 1)}><Icon name="chevDown" size={10} /></button>
            </span>
          ) : <span style={{ width: 16 }} />}
          <Icon name={m.icon} />
          <span className="zl-panel-row-text">{m.label}</span>
          <span className="zl-panel-row-end">
            <IconButton icon={isShown ? 'eye' : 'eyeOff'} label={isShown ? `Hide ${m.label}` : `Show ${m.label}`} size="sm"
              onClick={() => set((v) => ({ ...v, shown: isShown ? v.shown.filter((x) => x !== k) : [...v.shown, k] }))} />
            {k.startsWith('prop:') ? <IconButton icon="chevRight" label={`Edit ${m.label}`} size="sm" onClick={() => setPropStep({ kind: 'edit', id: k.slice(5) })} /> : null}
          </span>
        </div>
      );
    };
    return (
      <aside className="zl-panel" aria-label="Properties">
        <div className="zl-panel-head"><IconButton icon="back" label="Back" onClick={() => setStep('root')} /><h3>Properties</h3><IconButton icon="expand" label="Close panel" onClick={onClose} /></div>
        <div className="zl-panel-label">Shown in view</div>
        {shown.map((k, i) => row(k, true, i))}
        <div className="zl-panel-label">Hidden in view</div>
        {hidden.length ? hidden.map((k, i) => row(k, false, i)) : <div className="zl-field-hint" style={{ padding: '4px 8px' }}>Everything is shown.</div>}
        <button className="zl-btn zl-btn--secondary zl-btn--block" style={{ marginTop: 12 }} onClick={() => setPropStep({ kind: 'add' })}>Add property</button>
      </aside>
    );
  }

  if (step === 'hover') {
    return (
      <aside className="zl-panel" aria-label="Hover actions">
        <div className="zl-panel-head"><IconButton icon="back" label="Back" onClick={() => setStep('root')} /><h3>Hover actions</h3><IconButton icon="expand" label="Close panel" onClick={onClose} /></div>
        <p className="zl-field-hint" style={{ padding: '0 8px 8px', margin: 0 }}>Shown when you hover over a thread.</p>
        {ALL_HOVER_ACTIONS.map((a) => {
          const on = view.hoverActions.includes(a);
          return (
            <div key={a} className="zl-panel-row zl-panel-row--prop">
              <Icon name={HOVER_LABEL[a].icon} /><span className="zl-panel-row-text">{HOVER_LABEL[a].label}</span>
              <span className="zl-panel-row-end"><Toggle checked={on} label={HOVER_LABEL[a].label} onChange={(v) => set((x) => ({ ...x, hoverActions: v ? ALL_HOVER_ACTIONS.filter((h) => h === a || x.hoverActions.includes(h)) : x.hoverActions.filter((h) => h !== a) }))} /></span>
            </div>
          );
        })}
      </aside>
    );
  }

  const labelName = (id: string) => labels.find((l) => l.id === id || l.name === id)?.name ?? id;
  const shownNames = view.shown.map((k) => (k.startsWith('prop:') ? props.find((p) => `prop:${p.id}` === k)?.name : BUILTIN_LABEL[k]?.label)).filter(Boolean).join(', ');
  const groupLabel = view.groupBy.kind === 'property' ? props.find((p) => view.groupBy.kind === 'property' && p.id === view.groupBy.propertyId)?.name ?? 'Property'
    : view.groupBy.kind === 'keywords' ? `Keywords (${view.groupBy.keywords.length})` : view.groupBy.kind[0]!.toUpperCase() + view.groupBy.kind.slice(1);
  return (
    <aside className="zl-panel" aria-label="Edit view">
      <div className="zl-panel-head"><h3>Edit view</h3><IconButton icon="expand" label="Close panel" onClick={onClose} /></div>
      <div className="zl-panel-name">
        <button className="zl-icon-tile" style={{ border: 0, cursor: 'pointer' }} aria-label="Change icon" onClick={(e) => setGlyphAnchor(e.currentTarget)}><Glyph name={view.glyph} ink={view.ink} /></button>
        <input className="zl-input zl-input--lg" defaultValue={view.name} aria-label="View name" onBlur={(e) => { const n = e.target.value.trim(); if (n && n !== view.name) set((v) => ({ ...v, name: n })); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      </div>
      <div className="zl-panel-label">General</div>
      <button className="zl-panel-row" onClick={() => setStep('properties')}><Icon name="group" /><span className="zl-panel-row-text">Properties<small>{shownNames || 'None shown'}</small></span><span className="zl-panel-row-end"><Icon name="chevRight" /></span></button>
      <button className="zl-panel-row" onClick={(e) => setFilterAnchor(e.currentTarget)}><Icon name="filter" className="zl-ink-blue" /><span className="zl-panel-row-text">Filter<small>{view.filters.length ? `${view.filters.length} filter${view.filters.length > 1 ? 's' : ''} · ${view.filters.map((f) => describeRule(f, labelName)).join('; ')}` : 'All mail'}</small></span><span className="zl-panel-row-end"><Icon name="chevRight" /></span></button>
      <button className="zl-panel-row" onClick={(e) => setGroupAnchor(e.currentTarget)}><Icon name="list" /><span className="zl-panel-row-text">Group by<small>{groupLabel}</small></span><span className="zl-panel-row-end"><Icon name="chevRight" /></span></button>
      <button className="zl-panel-row" onClick={() => setStep('hover')}><Icon name="unread" /><span className="zl-panel-row-text">Hover actions<small>{view.hoverActions.map((h) => HOVER_LABEL[h].label).join(', ') || 'None'}</small></span><span className="zl-panel-row-end"><Icon name="chevRight" /></span></button>
      <div className="zl-panel-row zl-panel-row--prop"><Icon name="bell" /><span className="zl-panel-row-text">Notifications<small>Desktop alerts for new unread mail in this view</small></span><span className="zl-panel-row-end"><Toggle checked={view.notify} label="Notifications" onChange={(v) => set((x) => ({ ...x, notify: v }))} /></span></div>
      <div className="zl-panel-foot" style={{ gap: 8 }}>
        <button className="zl-btn zl-btn--ghost" onClick={() => {
          navigate({ kind: 'view', id: duplicateView(view) });
          onClose();
        }}><Icon name="plus" />Duplicate</button>
        <button className="zl-btn zl-btn--danger" onClick={() => setDeleting(true)}><Icon name="trash" />Delete view</button>
      </div>
      {deleting ? <DeleteViewDialog view={view} onClose={() => setDeleting(false)} onDeleted={onClose} /> : null}
      {glyphAnchor ? <GlyphPicker anchor={glyphAnchor} glyph={view.glyph} ink={view.ink} onPick={(g, i) => set((v) => ({ ...v, glyph: g, ink: i }))} onClose={() => setGlyphAnchor(null)} /> : null}
      {filterAnchor ? <FilterMenu anchor={filterAnchor} view={view} onClose={() => setFilterAnchor(null)} /> : null}
      {groupAnchor ? <GroupByMenu anchor={groupAnchor} view={view} onClose={() => setGroupAnchor(null)} /> : null}
    </aside>
  );
}

function AddProperty({ view, onBack, onClose, onCreated }: { view: View; onBack: () => void; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const create = (type: PropertyType) => {
    const label = TYPES.find((t) => t.type === type)!.label;
    const def: PropertyDef = { id: uid('p_'), name: name.trim() || label, type, options: [], ...(type === 'status' ? defaultStatus() : {}) };
    updateAccount((d) => ({ ...d, properties: { ...d.properties, [view.id]: [...(d.properties[view.id] ?? []), def] } }));
    updateView(view.id, (v) => ({ ...v, shown: [...v.shown, `prop:${def.id}`] }));
    onCreated(def.id);
  };
  return (
    <aside className="zl-panel" aria-label="Add property">
      <div className="zl-panel-head"><IconButton icon="back" label="Back" onClick={onBack} /><h3>Add property</h3><IconButton icon="x" label="Close" onClick={onClose} /></div>
      <input className="zl-input zl-input--lg" autoFocus placeholder="Add new property" value={name} onChange={(e) => setName(e.target.value)} aria-label="Property name" style={{ marginBottom: 12 }} />
      {TYPES.map((t) => (
        <button key={t.type} className="zl-panel-row zl-panel-row--prop" onClick={() => create(t.type)}>
          <span className="zl-type-tile"><Icon name={t.icon} /></span>
          <span className="zl-panel-row-text">{t.label}<small>{t.desc}</small></span>
          <span className="zl-panel-row-end"><Icon name="plus" /></span>
        </button>
      ))}
    </aside>
  );
}

function EditProperty({ view, def, onBack, onClose }: { view: View; def: PropertyDef; onBack: () => void; onClose: () => void }) {
  const [newOption, setNewOption] = useState('');
  const save = (fn: (p: PropertyDef) => PropertyDef) => updateAccount((d) => ({ ...d, properties: { ...d.properties, [view.id]: (d.properties[view.id] ?? []).map((p) => (p.id === def.id ? fn(p) : p)) } }));
  const hasOptions = def.type === 'select' || def.type === 'multiSelect' || def.type === 'status';
  const nextInk = (): Ink => INKS[(def.options.length + 3) % INKS.length]!;
  return (
    <aside className="zl-panel" aria-label="Edit property">
      <div className="zl-panel-head"><IconButton icon="back" label="Back" onClick={onBack} /><h3>Edit property</h3><IconButton icon="x" label="Close" onClick={onClose} /></div>
      <input className="zl-input zl-input--lg" defaultValue={def.name} aria-label="Property name" onBlur={(e) => { const n = e.target.value.trim(); if (n) save((p) => ({ ...p, name: n })); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      {hasOptions ? (
        <>
          <div className="zl-panel-label" style={{ marginTop: 8 }}>Options</div>
          {def.options.map((o) => (
            <div key={o.id} className="zl-panel-row zl-panel-row--prop">
              {def.type === 'status' && o.state
                ? <span className={`zl-status zl-status--${o.state}`}><StatusDot state={o.state} />{o.name}</span>
                : <span className={`zl-tag ${o.ink === 'gray' ? '' : `zl-tag--${o.ink}`}`}><span>{o.name}</span></span>}
              <span className="zl-panel-row-end">
                {o.id === def.defaultOptionId ? <span className="zl-caps">Default</span> : (def.type !== 'multiSelect' ? <button className="zl-btn zl-btn--text zl-btn--sm" onClick={() => save((p) => ({ ...p, defaultOptionId: o.id }))}>Make default</button> : null)}
                <IconButton icon="pen" label={`Rename ${o.name}`} size="sm" onClick={() => { const n = window.prompt('Option name', o.name)?.trim(); if (n) save((p) => ({ ...p, options: p.options.map((x) => (x.id === o.id ? { ...x, name: n } : x)) })); }} />
                {def.type !== 'status' ? <IconButton icon="x" label={`Delete ${o.name}`} size="sm" onClick={() => save((p) => ({ ...p, options: p.options.filter((x) => x.id !== o.id), defaultOptionId: p.defaultOptionId === o.id ? undefined : p.defaultOptionId }))} /> : null}
              </span>
            </div>
          ))}
          {def.type !== 'status' ? (
            <form style={{ display: 'flex', gap: 6, padding: '6px 8px' }} onSubmit={(e) => { e.preventDefault(); const n = newOption.trim(); if (!n) return; save((p) => ({ ...p, options: [...p.options, { id: uid('o_'), name: n, ink: nextInk() }] })); setNewOption(''); }}>
              <input className="zl-input" value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Add an option" aria-label="New option" />
              <button className="zl-btn zl-btn--secondary" type="submit">Add</button>
            </form>
          ) : null}
        </>
      ) : null}
      <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0 4px' }} />
      <button className="zl-panel-row zl-panel-row--prop" onClick={() => { updateView(view.id, (v) => ({ ...v, shown: v.shown.filter((k) => k !== `prop:${def.id}`) })); onBack(); }}><Icon name="eyeOff" /><span className="zl-panel-row-text">Hide property from {view.name}</span></button>
      <button className="zl-panel-row zl-panel-row--prop" onClick={() => {
        if (!window.confirm(`Delete the property “${def.name}” and its values?`)) return;
        updateAccount((d) => ({ ...d, properties: { ...d.properties, [view.id]: (d.properties[view.id] ?? []).filter((p) => p.id !== def.id) } }));
        updateView(view.id, (v) => ({ ...v, shown: v.shown.filter((k) => k !== `prop:${def.id}`), groupBy: v.groupBy.kind === 'property' && v.groupBy.propertyId === def.id ? { kind: 'date' } : v.groupBy }));
        onBack();
      }}><Icon name="trash" /><span className="zl-panel-row-text">Delete property from {view.name}</span></button>
    </aside>
  );
}
