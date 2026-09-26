'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';
import { updateAccount, updateSettings, useAccountData, useSettings, type AutoAdvance, type FontSize, type Snippet, type Theme, type ThreadStyle } from '@/lib/client/store';
import { uid } from '@/lib/shared/views';
import type { GmailFilter } from '@/lib/shared/types';
import { Icon } from './icons';
import { Popover, Spinner, Toggle, useToast } from './ui';
import { REMINDER_LABEL, useMail } from './mail-context';
import { SHORTCUTS } from './shortcuts';

const SECTIONS: { id: string; label: string; icon: string; group: 'Account' | 'Workspace' }[] = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox', group: 'Account' },
  { id: 'ai', label: 'AI', icon: 'sparkle', group: 'Account' },
  { id: 'filters', label: 'Gmail filters', icon: 'filter', group: 'Account' },
  { id: 'snippets', label: 'Snippets', icon: 'brackets', group: 'Account' },
  { id: 'signature', label: 'Signature', icon: 'pen', group: 'Account' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', group: 'Account' },
  { id: 'account', label: 'Manage accounts', icon: 'person', group: 'Account' },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: 'keyboard', group: 'Workspace' },
];

function Choice<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <button className="zl-select-trigger" aria-haspopup="listbox" aria-expanded={!!anchor} aria-label={label} onClick={(e) => setAnchor(e.currentTarget)}>
        {options.find((o) => o.value === value)?.label}<Icon name="chevDown" />
      </button>
      {anchor ? (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} placement="bottom-end" label={label}>
          <div className="zl-menu" role="listbox" style={{ width: 200 }}>
            {options.map((o) => (
              <button key={o.value} className="zl-menu-item" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setAnchor(null); }}>
                {o.label}{o.value === value ? <Icon name="check" className="zl-menu-item-check" /> : null}
              </button>
            ))}
          </div>
        </Popover>
      ) : null}
    </>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return <div className="zl-setting"><span className="zl-setting-text"><strong>{title}</strong>{desc ? <small>{desc}</small> : null}</span>{children}</div>;
}

export function SettingsModal({ section, setSection, onClose }: { section: string; setSection: (s: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.zl-popover, .zl-dialog')) { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;
  return createPortal(
    <div className="zl-modal-host">
      <div className="zl-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="zl-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={ref}>
          <nav className="zl-modal-nav" aria-label="Settings">
            {(['Account', 'Workspace'] as const).map((g) => (
              <div key={g} style={{ display: 'contents' }}>
                <span className="zl-section-label">{g}</span>
                {SECTIONS.filter((s) => s.group === g).map((s) => (
                  <button key={s.id} className="zl-nav-item" aria-current={s.id === current.id ? 'page' : undefined} onClick={() => setSection(s.id)}><Icon name={s.icon} /><span>{s.label}</span></button>
                ))}
              </div>
            ))}
          </nav>
          <div className="zl-modal-main">
            <button className="zl-btn zl-btn--icon zl-modal-close" aria-label="Close settings" onClick={onClose}><Icon name="x" /></button>
            <h2 id="settings-title">{current.label}</h2>
            {current.id === 'inbox' ? <InboxSettings /> : null}
            {current.id === 'ai' ? <AISettings /> : null}
            {current.id === 'filters' ? <FilterSettings /> : null}
            {current.id === 'snippets' ? <SnippetSettings /> : null}
            {current.id === 'signature' ? <SignatureSettings /> : null}
            {current.id === 'notifications' ? <NotificationSettings /> : null}
            {current.id === 'account' ? <AccountSettings /> : null}
            {current.id === 'shortcuts' ? (
              <div>{SHORTCUTS.map((s) => <div key={s.label} className="zl-kbd-row"><span>{s.label}</span><span>{s.keys.map((k) => <kbd key={k}>{k}</kbd>)}</span></div>)}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InboxSettings() {
  const s = useSettings();
  return (
    <>
      <Row title="Theme mode" desc="Choose how ZeroLatency looks on this device">
        <Choice<Theme> label="Theme mode" value={s.theme} onChange={(theme) => updateSettings({ theme })} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Row>
      <Row title="Thread style" desc="Change how open threads are displayed">
        <Choice<ThreadStyle> label="Thread style" value={s.threadStyle} onChange={(threadStyle) => updateSettings({ threadStyle })} options={[{ value: 'side', label: 'Side peek' }, { value: 'center', label: 'Center peek' }, { value: 'full', label: 'Full page' }]} />
      </Row>
      <Row title="Auto-advance" desc="Choose where to go after archiving or deleting a thread">
        <Choice<AutoAdvance> label="Auto-advance" value={s.autoAdvance} onChange={(autoAdvance) => updateSettings({ autoAdvance })} options={[{ value: 'next', label: 'Go to next thread' }, { value: 'previous', label: 'Go to previous thread' }, { value: 'list', label: 'Back to the list' }]} />
      </Row>
      <Row title="Font size" desc="Choose the size of the font in the inbox">
        <Choice<FontSize> label="Font size" value={s.fontSize} onChange={(fontSize) => updateSettings({ fontSize })} options={[{ value: 'default', label: 'Default' }, { value: 'large', label: 'Large' }]} />
      </Row>
    </>
  );
}

function AISettings() {
  const { aiEnabled, openAutoLabel, labels } = useMail();
  const data = useAccountData();
  return (
    <>
      <Row title="AI features" desc={aiEnabled ? 'Write with AI, reply drafts, summaries and auto labels are on.' : 'Set OPENAI_API_KEY on the server to turn on AI features.'}>
        <span className={`zl-tag ${aiEnabled ? 'zl-tag--green' : ''}`}><span>{aiEnabled ? 'Connected' : 'Not configured'}</span></span>
      </Row>
      <Row title="Auto labels" desc="Describe a label in plain words. New mail that matches is labelled in Gmail automatically.">
        <button className="zl-btn zl-btn--secondary" disabled={!aiEnabled} onClick={() => openAutoLabel()}><Icon name="plus" />New auto label</button>
      </Row>
      <div className="zl-list-card">
        {data.autoLabels.length === 0 ? <p className="zl-field-hint" style={{ margin: 0 }}>No auto labels yet.</p> : null}
        {data.autoLabels.map((r) => {
          const missing = !labels.some((l) => l.id === r.labelId);
          return (
            <div key={r.id} className="zl-list-card-row">
              <span className="zl-setting-text"><strong>{r.name}{missing ? ' (Gmail label deleted)' : ''}</strong><small>{r.description}</small><small>{r.keepInInbox ? 'Keeps mail in the inbox' : 'Moves matching mail out of the inbox'}</small></span>
              <Toggle checked={r.enabled && !missing} disabled={missing} label={`Enable ${r.name}`} onChange={(v) => updateAccount((d) => ({ ...d, autoLabels: d.autoLabels.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)) }))} />
              <button className="zl-btn zl-btn--text zl-btn--sm" onClick={() => {
                const description = window.prompt('Describe which emails get this label', r.description)?.trim();
                if (description) updateAccount((d) => ({ ...d, autoLabels: d.autoLabels.map((x) => (x.id === r.id ? { ...x, description } : x)), autoLabelSeen: {} }));
              }}>Edit</button>
              <button className="zl-btn zl-btn--danger zl-btn--sm" onClick={() => { if (window.confirm(`Stop auto labelling “${r.name}”? The Gmail label and labelled mail stay.`)) updateAccount((d) => ({ ...d, autoLabels: d.autoLabels.filter((x) => x.id !== r.id) })); }}>Remove</button>
            </div>
          );
        })}
      </div>
      <p className="zl-field-hint">Auto labels run on new inbox mail while ZeroLatency is open. Email content is sent to OpenAI only to classify, draft or summarise, never to train models.</p>
    </>
  );
}

function FilterSettings() {
  const { userLabels, ensureLabel } = useMail();
  const { push } = useToast();
  const [filters, setFilters] = useState<GmailFilter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ from: '', subject: '', query: '', label: '', skipInbox: false, markRead: false });
  const [busy, setBusy] = useState(false);
  const load = () => api.filters().then((r) => setFilters(r.filters)).catch((e: Error) => setError(e.message));
  useEffect(() => { void load(); }, []);
  const labelName = (id: string) => userLabels.find((l) => l.id === id)?.name ?? ({ INBOX: 'Inbox', UNREAD: 'Unread', STARRED: 'Starred', IMPORTANT: 'Important', TRASH: 'Trash', SPAM: 'Spam' } as Record<string, string>)[id] ?? id;
  const describe = (f: GmailFilter) => {
    const c = [f.criteria.from && `from ${f.criteria.from}`, f.criteria.to && `to ${f.criteria.to}`, f.criteria.subject && `subject “${f.criteria.subject}”`, f.criteria.query && `matches ${f.criteria.query}`, f.criteria.hasAttachment && 'has attachment'].filter(Boolean).join(', ');
    const a = [
      ...(f.action.addLabelIds ?? []).map((l) => (l === 'STARRED' ? 'star it' : l === 'IMPORTANT' ? 'mark important' : `label ${labelName(l)}`)),
      ...(f.action.removeLabelIds ?? []).map((l) => (l === 'INBOX' ? 'skip the inbox' : l === 'UNREAD' ? 'mark as read' : `remove ${labelName(l)}`)),
      f.action.forward && `forward to ${f.action.forward}`,
    ].filter(Boolean).join(', ');
    return { c: c || 'Any mail', a: a || 'No action' };
  };
  const create = async () => {
    setBusy(true);
    try {
      const add: string[] = [];
      if (form.label.trim()) add.push((await ensureLabel(form.label.trim())).id);
      const remove = [...(form.skipInbox ? ['INBOX'] : []), ...(form.markRead ? ['UNREAD'] : [])];
      await api.createFilter({
        criteria: { ...(form.from.trim() ? { from: form.from.trim() } : {}), ...(form.subject.trim() ? { subject: form.subject.trim() } : {}), ...(form.query.trim() ? { query: form.query.trim() } : {}) },
        action: { ...(add.length ? { addLabelIds: add } : {}), ...(remove.length ? { removeLabelIds: remove } : {}) },
      });
      setForm({ from: '', subject: '', query: '', label: '', skipInbox: false, markRead: false });
      push({ message: 'Gmail filter created' });
      await load();
    } catch (e) { push({ message: (e as Error).message, tone: 'error' }); } finally { setBusy(false); }
  };
  return (
    <>
      <p className="zl-field-hint">These filters run in Gmail on every new message, even when ZeroLatency is closed.</p>
      {error ? <div className="zl-banner zl-banner--error">{error}</div> : null}
      {filters === null && !error ? <Spinner /> : null}
      <div className="zl-list-card">
        {filters?.length === 0 ? <p className="zl-field-hint" style={{ margin: 0 }}>No Gmail filters.</p> : null}
        {filters?.map((f) => {
          const d = describe(f);
          return (
            <div key={f.id} className="zl-list-card-row">
              <span className="zl-setting-text"><strong>{d.c}</strong><small>Then: {d.a}</small></span>
              <button className="zl-btn zl-btn--danger zl-btn--sm" onClick={async () => { if (!window.confirm('Delete this Gmail filter?')) return; await api.deleteFilter(f.id).catch((e: Error) => push({ message: e.message, tone: 'error' })); await load(); }}>Delete</button>
            </div>
          );
        })}
      </div>
      <h3 style={{ fontSize: 'var(--text-md)', margin: '8px 0' }}>New filter</h3>
      <div className="zl-form-grid">
        <div className="zl-field"><label className="zl-field-label" htmlFor="ff-from">From</label><input id="ff-from" className="zl-input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} placeholder="news@example.com" /></div>
        <div className="zl-field"><label className="zl-field-label" htmlFor="ff-subj">Subject contains</label><input id="ff-subj" className="zl-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
        <div className="zl-field"><label className="zl-field-label" htmlFor="ff-q">Has the words</label><input id="ff-q" className="zl-input" value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} placeholder="Gmail search, e.g. invoice OR receipt" /></div>
        <div className="zl-field"><label className="zl-field-label" htmlFor="ff-label">Apply label</label><input id="ff-label" className="zl-input" list="ff-labels" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="New or existing label" /><datalist id="ff-labels">{userLabels.filter((l) => l.name !== REMINDER_LABEL).map((l) => <option key={l.id} value={l.name} />)}</datalist></div>
        <Row title="Skip the inbox"><Toggle checked={form.skipInbox} onChange={(v) => setForm({ ...form, skipInbox: v })} label="Skip the inbox" /></Row>
        <Row title="Mark as read"><Toggle checked={form.markRead} onChange={(v) => setForm({ ...form, markRead: v })} label="Mark as read" /></Row>
        <div><button className="zl-btn zl-btn--primary" disabled={busy || !(form.from.trim() || form.subject.trim() || form.query.trim()) || !(form.label.trim() || form.skipInbox || form.markRead)} onClick={create}>{busy ? <Spinner /> : null}Create filter</button></div>
      </div>
    </>
  );
}

function SnippetSettings() {
  const data = useAccountData();
  const [editing, setEditing] = useState<Snippet | null>(null);
  const save = () => {
    if (!editing || !editing.name.trim() || !editing.body.trim()) return;
    updateAccount((d) => ({ ...d, snippets: d.snippets.some((s) => s.id === editing.id) ? d.snippets.map((s) => (s.id === editing.id ? editing : s)) : [...d.snippets, editing] }));
    setEditing(null);
  };
  return (
    <>
      <Row title="Snippets" desc="Reusable text. Type “/” in the composer and pick a snippet. Put {{availability}} in a snippet to insert open times from your calendar.">
        <button className="zl-btn zl-btn--secondary" onClick={() => setEditing({ id: uid('s_'), name: '', body: '' })}><Icon name="plus" />New snippet</button>
      </Row>
      {editing ? (
        <div className="zl-form-grid">
          <div className="zl-field"><label className="zl-field-label" htmlFor="sn-name">Name</label><input id="sn-name" className="zl-input" autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
          <div className="zl-field"><label className="zl-field-label" htmlFor="sn-body">Text</label><textarea id="sn-body" className="zl-input zl-textarea" rows={6} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 8 }}><button className="zl-btn zl-btn--primary" onClick={save} disabled={!editing.name.trim() || !editing.body.trim()}>Save snippet</button><button className="zl-btn zl-btn--ghost" onClick={() => setEditing(null)}>Cancel</button></div>
        </div>
      ) : null}
      <div className="zl-list-card">
        {data.snippets.length === 0 && !editing ? <p className="zl-field-hint" style={{ margin: 0 }}>No snippets yet.</p> : null}
        {data.snippets.map((s) => (
          <div key={s.id} className="zl-list-card-row">
            <span className="zl-setting-text"><strong>{s.name}</strong><small style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.body}</small></span>
            <button className="zl-btn zl-btn--text zl-btn--sm" onClick={() => setEditing(s)}>Edit</button>
            <button className="zl-btn zl-btn--danger zl-btn--sm" onClick={() => updateAccount((d) => ({ ...d, snippets: d.snippets.filter((x) => x.id !== s.id) }))}>Delete</button>
          </div>
        ))}
      </div>
    </>
  );
}

function SignatureSettings() {
  const data = useAccountData();
  const { me } = useMail();
  const [sig, setSig] = useState<string | null>(null);
  useEffect(() => { api.sendAs().then((r) => setSig((r.sendAs.find((s) => s.email.toLowerCase() === me.toLowerCase()) ?? r.sendAs[0])?.signature ?? '')).catch(() => setSig('')); }, [me]);
  return (
    <>
      <Row title="Include on replies and forwards" desc="Show your Gmail signature in replies and forwards you send.">
        <Toggle checked={data.signatureOnReplies} label="Include on replies and forwards" onChange={(v) => updateAccount((d) => ({ ...d, signatureOnReplies: v }))} />
      </Row>
      <Row title="Default signature" desc="Add “Sent with ZeroLatency” to your emails.">
        <Toggle checked={data.signatureEnabled} label="Default signature" onChange={(v) => updateAccount((d) => ({ ...d, signatureEnabled: v }))} />
      </Row>
      <Row title="Edit signature in Gmail" desc="Create or edit a custom signature.">
        <a className="zl-btn zl-btn--secondary" href={`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(me)}#settings/general`} target="_blank" rel="noopener noreferrer">Open</a>
      </Row>
      <div className="zl-panel-label" style={{ padding: '12px 0 4px' }}>Current Gmail signature</div>
      {sig === null ? <Spinner /> : sig ? <div className="zl-ai-card" dangerouslySetInnerHTML={{ __html: sig }} /> : <p className="zl-field-hint">No signature set in Gmail.</p>}
    </>
  );
}

function NotificationSettings() {
  const s = useSettings();
  const data = useAccountData();
  const { push } = useToast();
  const permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  return (
    <>
      <Row title="Desktop notifications" desc={permission === 'denied' ? 'Blocked in your browser settings.' : permission === 'unsupported' ? 'Not supported in this browser.' : 'Get a notification for new mail in the views you choose, while ZeroLatency is open.'}>
        <Toggle checked={s.desktopNotifications && permission === 'granted'} disabled={permission === 'denied' || permission === 'unsupported'} label="Desktop notifications"
          onChange={async (v) => {
            if (v && Notification.permission !== 'granted') {
              const p = await Notification.requestPermission();
              if (p !== 'granted') { push({ message: 'Notifications were not allowed.' }); return; }
            }
            updateSettings({ desktopNotifications: v });
          }} />
      </Row>
      <div className="zl-panel-label" style={{ padding: '12px 0 4px' }}>Notify me for</div>
      {data.views.map((v) => (
        <Row key={v.id} title={v.name}>
          <Toggle checked={v.notify} label={`Notify for ${v.name}`} onChange={(n) => updateAccount((d) => ({ ...d, views: d.views.map((x) => (x.id === v.id ? { ...x, notify: n } : x)) }))} />
        </Row>
      ))}
    </>
  );
}

function AccountSettings() {
  const { session, account } = useMail();
  const router = useRouter();
  return (
    <>
      {session.accounts.map((a) => (
        <Row key={a.id} title={a.name} desc={`${a.email}${a.id === account.id ? ' · current' : ''}${a.canReadFreeBusy ? '' : ' · calendar access not granted'}`}>
          {!session.demo ? (
            <>
              {!a.canReadFreeBusy ? <a className="zl-btn zl-btn--text zl-btn--sm" href={`/api/auth/login?hint=${encodeURIComponent(a.email)}`}>Reconnect</a> : null}
              <button className="zl-btn zl-btn--danger zl-btn--sm" onClick={async () => {
                if (!window.confirm(`Remove ${a.email} from ZeroLatency and revoke its Google access?`)) return;
                const r = await api.logout({ accountId: a.id, revoke: true });
                if (r.remaining) window.location.reload(); else router.replace('/login');
              }}>Remove</button>
            </>
          ) : null}
        </Row>
      ))}
      {!session.demo ? (
        <Row title="Add another account" desc="Connect up to four Google accounts and switch between them.">
          <a className="zl-btn zl-btn--secondary" href="/api/auth/login"><Icon name="plus" />Add account</a>
        </Row>
      ) : <p className="zl-field-hint">Demo mode: connect Google by running without ZL_DEMO.</p>}
      <Row title="Sign out" desc="Sign out of every account on this device.">
        <button className="zl-btn zl-btn--ghost" disabled={session.demo} onClick={async () => { await api.logout({ all: true }); router.replace('/login'); }}><Icon name="logout" />Sign out</button>
      </Row>
    </>
  );
}
