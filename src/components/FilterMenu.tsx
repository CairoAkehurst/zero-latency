'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { updateView } from '@/lib/client/store';
import { uid, type FilterField, type FilterRule, type GmailCategory, type MailboxKey, type View } from '@/lib/shared/views';
import type { Address } from '@/lib/shared/types';
import { Icon } from './icons';
import { Popover, useMenuKeys } from './ui';
import { useMail } from './mail-context';

interface FieldDef { field: FilterField; label: string; icon: string; hint?: string }

const FIELDS: FieldDef[] = [
  { field: 'mailbox', label: 'Mailbox', icon: 'inbox' },
  { field: 'read', label: 'Unread / read', icon: 'unread' },
  { field: 'attachment', label: 'Attachment', icon: 'clip' },
  { field: 'calendar', label: 'Calendar event', icon: 'cal' },
  { field: 'starred', label: 'Starred', icon: 'star' },
  { field: 'important', label: 'Important', icon: 'important' },
  { field: 'label', label: 'Label', icon: 'tag' },
  { field: 'from', label: 'From', icon: 'person' },
  { field: 'to', label: 'To', icon: 'person' },
  { field: 'cc', label: 'CC', icon: 'person' },
  { field: 'bcc', label: 'BCC', icon: 'person' },
  { field: 'subject', label: 'Subject', icon: 'text' },
  { field: 'date', label: 'Date', icon: 'cal' },
  { field: 'category', label: 'Category', icon: 'layers', hint: 'Gmail' },
  { field: 'query', label: 'Gmail search', icon: 'search', hint: 'Advanced' },
];

const MAILBOXES: { key: MailboxKey; label: string }[] = [
  { key: 'inbox', label: 'Inbox' }, { key: 'sent', label: 'Sent' }, { key: 'drafts', label: 'Drafts' }, { key: 'starred', label: 'Starred' },
  { key: 'spam', label: 'Spam' }, { key: 'trash', label: 'Trash' }, { key: 'snoozed', label: 'Snoozed (Gmail)' },
];
const CATEGORIES: { key: GmailCategory; label: string }[] = [
  { key: 'primary', label: 'Primary' }, { key: 'social', label: 'Social' }, { key: 'promotions', label: 'Promotions' }, { key: 'updates', label: 'Updates' }, { key: 'forums', label: 'Forums' },
];

export function describeRule(r: FilterRule, labelName: (id: string) => string): string {
  const list = (vs: string[]) => { const s = vs.join(', '); return s.length > 28 ? `${s.slice(0, 27)}…` : s; };
  switch (r.field) {
    case 'mailbox': return `${r.op === 'is' ? 'is' : 'is not'} ${list(r.values.map((v) => MAILBOXES.find((m) => m.key === v)?.label ?? v))}`;
    case 'read': return `is ${r.value}`;
    case 'attachment': return 'has attachment';
    case 'calendar': return 'has invitation';
    case 'starred': return 'is starred';
    case 'important': return 'is important';
    case 'label': return `${r.op === 'is' ? 'is' : 'is not'} ${list(r.values.map(labelName))}`;
    case 'category': return `${r.op === 'is' ? 'is' : 'is not'} ${list(r.values)}`;
    case 'date': return `${{ newerThan: 'newer than', olderThan: 'older than', after: 'after', before: 'before' }[r.op]} ${r.value}`;
    case 'query': return r.value.length > 28 ? `${r.value.slice(0, 27)}…` : r.value;
    default: return `${r.op === 'contains' ? 'contains' : 'does not contain'} “${list(r.values)}”`;
  }
}

function newRule(field: FilterField): FilterRule {
  const id = uid('f_');
  switch (field) {
    case 'mailbox': return { id, field, op: 'is', values: ['inbox'] };
    case 'read': return { id, field, value: 'unread' };
    case 'attachment': case 'calendar': case 'starred': case 'important': return { id, field } as FilterRule;
    case 'label': return { id, field, op: 'is', values: [] };
    case 'category': return { id, field, op: 'is', values: [] };
    case 'date': return { id, field, op: 'newerThan', value: '7d' };
    case 'query': return { id, field, value: '' };
    default: return { id, field, op: 'contains', values: [] };
  }
}

const needsValue = (r: FilterRule) => !['attachment', 'calendar', 'starred', 'important'].includes(r.field);
const isEmpty = (r: FilterRule) => ('values' in r && r.values.length === 0) || (r.field === 'query' && !r.value.trim());

export function FilterMenu({ anchor, view, onClose }: { anchor: HTMLElement; view: View; onClose: () => void }) {
  const { labels } = useMail();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<FilterRule | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useMenuKeys(ref);
  const labelName = (id: string) => labels.find((l) => l.id === id || l.name === id)?.name ?? id;
  const save = (filters: FilterRule[]) => updateView(view.id, (v) => ({ ...v, filters }));

  if (editing) {
    return (
      <Popover anchor={anchor} onClose={onClose} placement="bottom-end" label="Edit filter">
        <RuleEditor
          rule={editing}
          onBack={() => setEditing(null)}
          onDelete={() => { save(view.filters.filter((f) => f.id !== editing.id)); setEditing(null); }}
          onSave={(r) => {
            const exists = view.filters.some((f) => f.id === r.id);
            if (isEmpty(r)) save(view.filters.filter((f) => f.id !== r.id));
            else save(exists ? view.filters.map((f) => (f.id === r.id ? r : f)) : [...view.filters, r]);
            setEditing(null);
          }}
        />
      </Popover>
    );
  }

  const fields = FIELDS.filter((f) => f.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Popover anchor={anchor} onClose={onClose} placement="bottom-end" label="Filter">
      <div className="zl-menu zl-menu--wide" ref={ref}>
        <input className="zl-input zl-menu-search" placeholder="Filter by…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter by" />
        {view.filters.length ? <div className="zl-menu-label">Applied</div> : null}
        {view.filters.map((r) => {
          const def = FIELDS.find((f) => f.field === r.field)!;
          return (
            <button key={r.id} className="zl-menu-item" onClick={() => (needsValue(r) ? setEditing(r) : save(view.filters.filter((f) => f.id !== r.id)))}>
              <Icon name={def.icon} />{def.label}
              <span className="zl-menu-item-hint">{describeRule(r, labelName)}{needsValue(r) ? <Icon name="chevRight" /> : <Icon name="x" />}</span>
            </button>
          );
        })}
        {view.filters.length ? <div className="zl-menu-sep" /> : null}
        <div className="zl-menu-scroll">
          {fields.map((f) => (
            <button key={f.field} className="zl-menu-item" onClick={() => {
              const r = newRule(f.field);
              if (needsValue(r)) setEditing(r); else save([...view.filters, r]);
            }}>
              <Icon name={f.icon} />{f.label}{f.hint ? <span className="zl-menu-item-muted">({f.hint})</span> : null}
            </button>
          ))}
        </div>
        {view.filters.length ? (
          <div className="zl-menu-footer"><button className="zl-btn zl-btn--text" onClick={() => save([])}>Reset</button><span /></div>
        ) : null}
      </div>
    </Popover>
  );
}

function RuleEditor({ rule, onBack, onSave, onDelete }: { rule: FilterRule; onBack: () => void; onSave: (r: FilterRule) => void; onDelete: () => void }) {
  const [r, setR] = useState<FilterRule>(rule);
  const def = FIELDS.find((f) => f.field === r.field)!;
  const ref = useRef<HTMLDivElement>(null);
  useMenuKeys(ref);
  const opLabel = 'op' in r ? ({ is: 'is', isNot: 'is not', contains: 'contains', notContains: 'does not contain', newerThan: 'newer than', olderThan: 'older than', after: 'after', before: 'before' } as Record<string, string>)[r.op] : r.field === 'read' ? 'is' : '';
  const cycleOp = () => {
    setR((x) => {
      if (!('op' in x)) return x;
      if (x.field === 'date') {
        const order = ['newerThan', 'olderThan', 'after', 'before'] as const;
        const next = order[(order.indexOf(x.op) + 1) % order.length]!;
        const value = next === 'after' || next === 'before' ? new Date().toISOString().slice(0, 10) : '7d';
        return { ...x, op: next, value };
      }
      if (x.op === 'is' || x.op === 'isNot') return { ...x, op: x.op === 'is' ? 'isNot' : 'is' } as FilterRule;
      return { ...x, op: x.op === 'contains' ? 'notContains' : 'contains' } as FilterRule;
    });
  };
  return (
    <div className="zl-menu zl-menu--wide" ref={ref}>
      <div className="zl-menu-title">
        <button className="zl-btn zl-btn--icon zl-btn--sm" aria-label="Back" onClick={onBack}><Icon name="back" /></button>
        <span>{def.label}</span>
        {opLabel ? <button className="zl-btn zl-btn--text zl-btn--sm" onClick={cycleOp} aria-label="Change condition">{opLabel}<Icon name="chevDown" size={12} /></button> : null}
        <button className="zl-btn zl-btn--icon zl-btn--sm" aria-label="Delete filter" onClick={onDelete}><Icon name="trash" /></button>
      </div>
      <RuleBody r={r} setR={setR} />
      <div className="zl-menu-footer">
        <button className="zl-btn zl-btn--text" onClick={() => setR(newRule(r.field) as FilterRule & { id: string })}>Reset</button>
        <button className="zl-btn zl-btn--primary" onClick={() => onSave({ ...r, id: rule.id })}>Save</button>
      </div>
    </div>
  );
}

function CheckItem({ label, checked, onToggle }: { label: React.ReactNode; checked: boolean; onToggle: () => void }) {
  return (
    <button className="zl-menu-item" role="menuitemcheckbox" aria-checked={checked} onClick={onToggle}>
      {label}{checked ? <Icon name="check" className="zl-menu-item-check" /> : null}
    </button>
  );
}

function RuleBody({ r, setR }: { r: FilterRule; setR: React.Dispatch<React.SetStateAction<FilterRule>> }) {
  const { userLabels, threads, me } = useMail();
  const [entry, setEntry] = useState('');
  const [contacts, setContacts] = useState<Address[]>([]);
  const isAddr = ['from', 'to', 'cc', 'bcc'].includes(r.field);
  useEffect(() => {
    if (!isAddr) return;
    api.contacts().then((c) => setContacts(c.contacts)).catch(() => undefined);
  }, [isAddr]);
  const suggestions = useMemo(() => {
    if (!isAddr) return [];
    const pool = new Map<string, Address>();
    threads.forEach((t) => t.participants.forEach((p) => { if (p.email.toLowerCase() !== me.toLowerCase()) pool.set(p.email.toLowerCase(), p); }));
    contacts.forEach((c) => pool.set(c.email.toLowerCase(), c));
    const needle = entry.trim().toLowerCase();
    return [...pool.values()].filter((a) => !needle || a.email.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [isAddr, threads, contacts, entry, me]);

  const toggleValue = (v: string) => setR((x) => ('values' in x ? { ...x, values: (x.values as string[]).includes(v) ? (x.values as string[]).filter((y) => y !== v) : [...(x.values as string[]), v] } as FilterRule : x));

  switch (r.field) {
    case 'mailbox':
      return <>{MAILBOXES.map((m) => <CheckItem key={m.key} label={m.label} checked={r.values.includes(m.key)} onToggle={() => toggleValue(m.key)} />)}</>;
    case 'category':
      return <>{CATEGORIES.map((c) => <CheckItem key={c.key} label={c.label} checked={r.values.includes(c.key)} onToggle={() => toggleValue(c.key)} />)}</>;
    case 'label':
      return (
        <div className="zl-menu-scroll">
          {userLabels.length ? userLabels.map((l) => <CheckItem key={l.id} label={l.name} checked={r.values.includes(l.name)} onToggle={() => toggleValue(l.name)} />) : <div className="zl-menu-empty">No Gmail labels yet.</div>}
        </div>
      );
    case 'read':
      return (
        <>
          <CheckItem label="Unread" checked={r.value === 'unread'} onToggle={() => setR({ ...r, value: 'unread' })} />
          <CheckItem label="Read" checked={r.value === 'read'} onToggle={() => setR({ ...r, value: 'read' })} />
        </>
      );
    case 'date':
      return r.op === 'after' || r.op === 'before'
        ? <input className="zl-input zl-menu-search" type="date" value={r.value} onChange={(e) => setR({ ...r, value: e.target.value })} aria-label="Date" />
        : (
          <>
            {['1d', '7d', '14d', '30d', '3m', '1y'].map((v) => <CheckItem key={v} label={{ '1d': '1 day', '7d': '7 days', '14d': '14 days', '30d': '30 days', '3m': '3 months', '1y': '1 year' }[v]} checked={r.value === v} onToggle={() => setR({ ...r, value: v })} />)}
          </>
        );
    case 'query':
      return (
        <>
          <input className="zl-input zl-menu-search" value={r.value} onChange={(e) => setR({ ...r, value: e.target.value })} placeholder="e.g. has:attachment larger:5M" aria-label="Gmail search" />
          <div className="zl-menu-empty">Uses Gmail search syntax.</div>
        </>
      );
    case 'from': case 'to': case 'cc': case 'bcc': case 'subject': {
      const add = (v: string) => { const t = v.trim(); if (t && !r.values.includes(t)) setR({ ...r, values: [...r.values, t] }); setEntry(''); };
      return (
        <>
          <input className="zl-input zl-menu-search" placeholder={isAddr ? 'Add an address, name or @domain' : 'Add new entry'} value={entry} onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(entry); } }} aria-label="Add new entry" />
          {r.values.map((v) => <CheckItem key={v} label={<><span className="zl-monogram">{v[0]?.toUpperCase()}</span>{v}</>} checked onToggle={() => toggleValue(v)} />)}
          {entry.trim() && !isAddr ? <button className="zl-menu-item" onClick={() => add(entry)}><Icon name="plus" />“{entry.trim()}”</button> : null}
          {isAddr ? suggestions.filter((s) => !r.values.includes(s.email)).map((s) => (
            <button key={s.email} className="zl-menu-item zl-menu-item--2line" onClick={() => add(s.email)}>
              <span className="zl-monogram">{(s.name || s.email)[0]?.toUpperCase()}</span>
              <span className="zl-menu-item-text">{s.name || s.email}{s.name ? <small>{s.email}</small> : null}</span>
            </button>
          )) : null}
          {isAddr && entry.trim() ? <button className="zl-menu-item" onClick={() => add(entry)}><Icon name="at" />“{entry.trim()}”</button> : null}
        </>
      );
    }
    default:
      return null;
  }
}
