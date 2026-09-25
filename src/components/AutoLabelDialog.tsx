'use client';
import { useState } from 'react';
import { api } from '@/lib/client/api';
import { updateAccount, accountStore } from '@/lib/client/store';
import { baseView, uid, type Ink } from '@/lib/shared/views';
import { Dialog, Spinner, Toggle, useToast } from './ui';
import { useMail } from './mail-context';

const SUGGESTIONS = [
  { name: 'Needs reply', description: 'Emails from real people that ask me a question or need a response from me.' },
  { name: 'Receipts', description: 'Receipts, invoices, order confirmations and payment notifications.' },
  { name: 'Newsletters', description: 'Newsletters and digests I subscribed to.' },
  { name: 'Travel', description: 'Flight, hotel, train and rental bookings, itineraries and check-in reminders.' },
  { name: 'Recruiting', description: 'Messages from candidates, recruiters or hiring platforms about roles.' },
];

const INK_CYCLE: Ink[] = ['blue', 'green', 'purple', 'orange', 'pink', 'yellow', 'brown', 'red'];

export function AutoLabelDialog({ seed, onClose }: { seed: { name?: string; description?: string }; onClose: () => void }) {
  const { aiEnabled, ensureLabel, navigate, refreshList, refreshCounts } = useMail();
  const { push } = useToast();
  const [name, setName] = useState(seed.name ?? '');
  const [description, setDescription] = useState(seed.description ?? '');
  const [keepInInbox, setKeepInInbox] = useState(true);
  const [makeView, setMakeView] = useState(true);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const label = await ensureLabel(name.trim());
      const rule = { id: uid('al_'), name: name.trim(), description: description.trim(), labelId: label.id, enabled: true, keepInInbox, createdAt: Date.now() };
      const view = makeView ? baseView({
        name: name.trim(), glyph: 'tag', ink: INK_CYCLE[accountStore.get().views.length % INK_CYCLE.length]!,
        filters: [{ id: uid('f_'), field: 'label', op: 'is', values: [label.name] }], autoLabelId: rule.id,
      }) : null;
      updateAccount((d) => ({ ...d, autoLabels: [...d.autoLabels, rule], views: view ? [...d.views, view] : d.views, labelInks: view ? { ...d.labelInks, [label.id]: view.ink } : d.labelInks }));

      // Label recent inbox mail right away.
      const toastId = push({ message: `Labelling recent mail as “${rule.name}”…`, busy: true });
      const recent = await api.threads('in:inbox newer_than:14d', undefined, 50);
      let hits = 0;
      for (let i = 0; i < recent.threads.length; i += 25) {
        const batch = recent.threads.slice(i, i + 25);
        const res = await api.aiAutoLabel([{ id: rule.id, name: rule.name, description: rule.description, labelId: label.id }], batch.map((t) => ({ id: t.id, subject: t.subject, snippet: t.snippet, participants: t.participants })));
        const matched = Object.entries(res.assignments).filter(([, r]) => r.length).map(([id]) => id);
        hits += matched.length;
        if (!keepInInbox && matched.length) await api.modify(matched, [], ['INBOX']);
      }
      void toastId;
      push({ message: `“${rule.name}” applied to ${hits} recent thread${hits === 1 ? '' : 's'}` });
      if (view) navigate({ kind: 'view', id: view.id });
      refreshList(); refreshCounts();
      onClose();
    } catch (e) {
      push({ message: (e as Error).message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="New auto label" onClose={onClose} wide actions={
      <>
        <button className="zl-btn zl-btn--ghost" onClick={onClose}>Cancel</button>
        <button className="zl-btn zl-btn--primary" disabled={!aiEnabled || busy || !name.trim() || description.trim().length < 8} onClick={create}>{busy ? <Spinner /> : null}Create auto label</button>
      </>
    }>
      <p>Describe which emails belong under this label. ZeroLatency reads new mail and applies the Gmail label when it fits.</p>
      {!aiEnabled ? <div className="zl-banner zl-banner--error">AI is not configured on the server (OPENAI_API_KEY).</div> : null}
      <div className="zl-field"><label className="zl-field-label" htmlFor="al-name">Label name</label><input id="al-name" className="zl-input zl-input--lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="Needs reply" maxLength={60} /></div>
      <div className="zl-field"><label className="zl-field-label" htmlFor="al-desc">Which emails?</label><textarea id="al-desc" className="zl-input zl-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Emails from customers asking for help or reporting a problem" /></div>
      {!seed.name ? (
        <div>
          <div className="zl-menu-label" style={{ padding: '0 0 6px' }}>Suggested</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map((s) => <button key={s.name} className="zl-btn zl-btn--secondary zl-btn--sm" onClick={() => { setName(s.name); setDescription(s.description); }}>{s.name}</button>)}
          </div>
        </div>
      ) : null}
      <div className="zl-setting"><span className="zl-setting-text"><strong>Keep in inbox</strong><small>Off: labelled mail moves out of the inbox into its own view.</small></span><Toggle checked={keepInInbox} onChange={setKeepInInbox} label="Keep in inbox" /></div>
      <div className="zl-setting"><span className="zl-setting-text"><strong>Create a view</strong><small>Add a sidebar view that shows this label.</small></span><Toggle checked={makeView} onChange={setMakeView} label="Create a view" /></div>
    </Dialog>
  );
}
