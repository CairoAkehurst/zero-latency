'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, attachmentUrl } from '@/lib/client/api';
import { updateAccount, useAccountData, type PropertyDef, type PropertyValue } from '@/lib/client/store';
import { formatBytes, formatLongDate, formatAddressShort } from '@/lib/shared/compose';
import type { MessageDetail, ThreadDetail, ThreadSummary } from '@/lib/shared/types';
import { Icon, StatusDot } from './icons';
import { IconButton, Popover, Spinner, useToast } from './ui';
import { useMail, type ComposeInit } from './mail-context';
import { LabelChip, LabelMenu, RemindMenu } from './ThreadMenus';
import { EmailFrame, EmailText } from './EmailFrame';
import { Composer } from './Composer';

type Summary = { summary: string; keyPoints: string[]; actionItems: string[] };

export function ThreadView({ threadId, summary, mode, onClose, inlineCompose, onCloseInline }: {
  threadId: string;
  summary: ThreadSummary | null;
  mode: 'side' | 'center' | 'full';
  onClose: () => void;
  inlineCompose: (ComposeInit & { key: number }) | null;
  onCloseInline: () => void;
}) {
  const { account, me, act, threads, openThread, labels, compose, openAutoLabel, activeView, aiEnabled } = useMail();
  const { push } = useToast();
  const data = useAccountData();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [ai, setAi] = useState<{ loading: boolean; data: Summary | null; error: string | null }>({ loading: false, data: null, error: null });
  const [labelAnchor, setLabelAnchor] = useState<HTMLElement | null>(null);
  const [remindAnchor, setRemindAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const markedRead = useRef(false);

  const applyThread = useCallback((t: ThreadDetail) => {
    setThread(t);
    // Expand unread messages and the last one; collapse the rest.
    const real = t.messages.filter((m) => !m.labelIds.includes('DRAFT'));
    setExpanded(new Set([...real.filter((m) => m.labelIds.includes('UNREAD')).map((m) => m.id), real[real.length - 1]?.id ?? '']));
  }, []);
  const load = useCallback(() => api.thread(threadId).then(applyThread).catch((e: Error) => setError(e.message)), [threadId, applyThread]);
  useEffect(() => {
    let live = true;
    api.thread(threadId).then((t) => { if (live) applyThread(t); }).catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [threadId, applyThread]);

  useEffect(() => {
    if (!thread || markedRead.current) return;
    if (thread.labelIds.includes('UNREAD')) { markedRead.current = true; void act([threadId], { kind: 'read' }, { silent: true, keepRows: true }); }
  }, [thread, threadId, act]);

  const messages = thread?.messages.filter((m) => !m.labelIds.includes('DRAFT')) ?? [];
  const draft = thread?.messages.find((m) => m.labelIds.includes('DRAFT'));
  const last = messages[messages.length - 1];
  const idx = threads.findIndex((t) => t.id === threadId);

  const reply = (kind: 'reply' | 'replyAll' | 'forward', target?: MessageDetail) => {
    const src = target ?? last;
    if (!src) return;
    compose({ mode: kind, threadId, source: src, inline: true });
  };
  const replyRef = useRef(reply);
  useEffect(() => { replyRef.current = reply; });
  useEffect(() => {
    const onKey = (e: Event) => {
      const k = (e as CustomEvent<string>).detail;
      if (k === 'r') replyRef.current('reply'); else if (k === 'a') replyRef.current('replyAll'); else if (k === 'f') replyRef.current('forward');
    };
    window.addEventListener('zl:thread-key', onKey);
    return () => window.removeEventListener('zl:thread-key', onKey);
  }, []);

  const summarize = async () => {
    setAi({ loading: true, data: null, error: null });
    try { const r = await api.aiSummarize(threadId); setAi({ loading: false, data: r.summary, error: null }); }
    catch (e) { setAi({ loading: false, data: null, error: (e as Error).message }); }
  };

  const suggest = async () => {
    setSuggesting(true);
    try { const s = await api.aiSuggestLabel(threadId); openAutoLabel(s); }
    catch (e) { push({ message: (e as Error).message, tone: 'error' }); }
    finally { setSuggesting(false); }
  };

  const editDraft = async () => {
    try {
      const r = await api.draftForThread(threadId);
      if (!r.draft) { push({ message: 'Draft not found. It may have been sent or deleted.' }); return; }
      const m = r.draft.message;
      compose({ mode: 'draft', threadId, draftId: r.draft.draftId, to: m.to, cc: m.cc, bcc: m.bcc, subject: m.subject, bodyHtml: m.html ?? (m.text ?? '').replace(/\n/g, '<br>'), inline: true, source: last });
    } catch (e) { push({ message: (e as Error).message, tone: 'error' }); }
  };

  const labelIds = thread?.labelIds ?? summary?.labelIds ?? [];
  const userLabels = labels.filter((l) => l.type === 'user' && labelIds.includes(l.id) && !l.name.startsWith('ZeroLatency/'));
  const props = activeView ? data.properties[activeView.id] ?? [] : [];
  const starred = labelIds.includes('STARRED');
  const inTrash = labelIds.includes('TRASH');
  const inSpam = labelIds.includes('SPAM');
  const inInbox = labelIds.includes('INBOX');

  return (
    <section className="zl-peek" aria-label={thread?.subject || summary?.subject || 'Thread'} style={mode === 'full' ? { borderLeft: 0 } : undefined}>
      <div className="zl-peek-bar">
        <IconButton icon={mode === 'full' ? 'back' : 'expand'} label={mode === 'full' ? 'Back to list' : 'Close'} shortcut="Esc" onClick={onClose} />
        <IconButton icon="chevUp" label="Previous thread" shortcut="K" disabled={idx <= 0} onClick={() => idx > 0 && openThread(threads[idx - 1]!.id)} />
        <IconButton icon="chevDown" label="Next thread" shortcut="J" disabled={idx < 0 || idx >= threads.length - 1} onClick={() => idx >= 0 && idx < threads.length - 1 && openThread(threads[idx + 1]!.id)} />
        {aiEnabled ? <button className="zl-btn zl-btn--secondary" onClick={suggest} disabled={suggesting || !thread}>{suggesting ? <Spinner /> : <Icon name="wand" />}Auto label similar</button> : <span style={{ marginLeft: 'auto' }} />}
        <IconButton icon="clock" label="Remind me" shortcut="H" onClick={(e) => setRemindAnchor(e.currentTarget)} />
        <IconButton icon="unread" label="Mark as unread" shortcut="Shift U" onClick={() => { void act([threadId], { kind: 'unread' }); onClose(); }} />
        <IconButton icon="tag" label="Label" onClick={(e) => setLabelAnchor(e.currentTarget)} />
        {inInbox ? <IconButton icon="archive" label="Archive" shortcut="E" onClick={() => act([threadId], { kind: 'archive' }, { fromThreadView: true })} />
          : !inTrash && !inSpam ? <IconButton icon="inboxIn" label="Move to Inbox" onClick={() => act([threadId], { kind: 'inbox' })} /> : null}
        {inTrash ? <IconButton icon="undo" label="Restore from Trash" onClick={() => act([threadId], { kind: 'untrash' })} /> : <IconButton icon="trash" label="Move to Trash" shortcut="#" onClick={() => act([threadId], { kind: 'trash' }, { fromThreadView: true })} />}
        <IconButton icon="more" label="More" onClick={(e) => setMoreAnchor(e.currentTarget)} />
      </div>
      <div className="zl-peek-body">
        {error ? <div className="zl-banner zl-banner--error" role="alert">{error}</div> : null}
        <h2 className="zl-thread-title">{thread?.subject || summary?.subject || (thread ? '(no subject)' : '')}</h2>
        <div className="zl-thread-props">
          {userLabels.map((l) => <button key={l.id} className="zl-btn" style={{ padding: 0, height: 'auto' }} onClick={(e) => setLabelAnchor(e.currentTarget)} aria-label={`Label ${l.name}`}><LabelChip label={l} /></button>)}
          {starred ? <Icon name="starFill" className="zl-row-star" /> : null}
          {props.map((p) => <PropertyEditorChip key={p.id} def={p} threadId={threadId} value={data.values[threadId]?.[p.id]} />)}
          {!userLabels.length ? <button className="zl-btn zl-btn--text" onClick={(e) => setLabelAnchor(e.currentTarget)}>Add label</button> : null}
          {aiEnabled && messages.length ? <button className="zl-btn zl-btn--text" onClick={summarize} disabled={ai.loading}><Icon name="sparkle" />{ai.loading ? 'Summarising…' : 'Summarise'}</button> : null}
        </div>

        {ai.data || ai.error ? (
          <div className="zl-ai-card" role="region" aria-label="AI summary">
            <h4><Icon name="sparkle" size={14} />Summary<button className="zl-btn zl-btn--icon zl-btn--sm" style={{ marginLeft: 'auto' }} aria-label="Dismiss summary" onClick={() => setAi({ loading: false, data: null, error: null })}><Icon name="x" /></button></h4>
            {ai.error ? <p style={{ color: 'var(--danger-text)' }}>{ai.error}</p> : null}
            {ai.data ? (
              <>
                <p>{ai.data.summary}</p>
                {ai.data.keyPoints.length ? <ul>{ai.data.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul> : null}
                {ai.data.actionItems.length ? <><h4>For you</h4><ul>{ai.data.actionItems.map((k, i) => <li key={i}>{k}</li>)}</ul></> : null}
              </>
            ) : null}
          </div>
        ) : null}

        {!thread && !error ? <div className="zl-loadmore"><Spinner /></div> : null}
        {messages.map((m) => (
          <Message key={m.id} m={m} me={me} accountId={account.id} expanded={expanded.has(m.id)}
            onToggle={() => setExpanded((s) => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })}
            onReply={(kind) => reply(kind, m)} />
        ))}

        {draft && !inlineCompose ? (
          <div className="zl-banner" style={{ margin: '12px 0 0' }}>
            <span className="zl-row-draft">Draft</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.snippet}</span>
            <button className="zl-btn zl-btn--secondary zl-btn--sm" style={{ marginLeft: 'auto' }} onClick={editDraft}>Edit draft</button>
          </div>
        ) : null}

        {inlineCompose ? (
          <div style={{ marginTop: 16 }}>
            <Composer key={inlineCompose.key} init={inlineCompose} onClose={() => { onCloseInline(); void load(); }} />
          </div>
        ) : messages.length ? (
          <div className="zl-reply-actions">
            <button className="zl-btn zl-btn--secondary" onClick={() => reply('reply')}><Icon name="reply" />Reply</button>
            {last && (last.to.length + last.cc.length > 1) ? <button className="zl-btn zl-btn--secondary" onClick={() => reply('replyAll')}><Icon name="replyAll" />Reply all</button> : null}
            <button className="zl-btn zl-btn--secondary" onClick={() => reply('forward')}><Icon name="forward" />Forward</button>
          </div>
        ) : null}
      </div>
      {labelAnchor ? <LabelMenu anchor={labelAnchor} threadIds={[threadId]} current={[labelIds]} onClose={() => { setLabelAnchor(null); void load(); }} /> : null}
      {remindAnchor ? <RemindMenu anchor={remindAnchor} threadIds={[threadId]} onClose={() => setRemindAnchor(null)} /> : null}
      {moreAnchor ? (
        <Popover anchor={moreAnchor} onClose={() => setMoreAnchor(null)} placement="bottom-end" label="More actions">
          <div className="zl-menu" style={{ width: 240 }}>
            <button className="zl-menu-item" onClick={() => { void act([threadId], { kind: starred ? 'unstar' : 'star' }).then(load); setMoreAnchor(null); }}><Icon name={starred ? 'starFill' : 'star'} />{starred ? 'Unstar' : 'Star'}</button>
            {inSpam
              ? <button className="zl-menu-item" onClick={() => { void act([threadId], { kind: 'notSpam' }); setMoreAnchor(null); }}><Icon name="inboxIn" />Not spam</button>
              : <button className="zl-menu-item" onClick={() => { void act([threadId], { kind: 'spam' }, { fromThreadView: true }); setMoreAnchor(null); }}><Icon name="spam" />Report spam</button>}
            {last?.listUnsubscribe ? <UnsubscribeItem header={last.listUnsubscribe} /> : null}
            <a className="zl-menu-item" href={`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(me)}#all/${threadId}`} target="_blank" rel="noopener noreferrer"><Icon name="external" />Open in Gmail</a>
          </div>
        </Popover>
      ) : null}
    </section>
  );
}

function UnsubscribeItem({ header }: { header: string }) {
  const urls = [...header.matchAll(/<([^>]+)>/g)].map((m) => m[1]!);
  const web = urls.find((u) => /^https:\/\//i.test(u));
  const mail = urls.find((u) => /^mailto:/i.test(u));
  const href = web ?? mail;
  if (!href) return null;
  return <a className="zl-menu-item" href={href} target="_blank" rel="noopener noreferrer"><Icon name="minus" />Unsubscribe</a>;
}

function Message({ m, me, accountId, expanded, onToggle, onReply }: { m: MessageDetail; me: string; accountId: string; expanded: boolean; onToggle: () => void; onReply: (k: 'reply' | 'replyAll' | 'forward') => void }) {
  const files = m.attachments.filter((a) => !a.inline);
  const to = [...m.to, ...m.cc].map((a) => formatAddressShort(a, me)).join(', ');
  if (!expanded) {
    return (
      <article className="zl-message is-collapsed" onClick={onToggle} onKeyDown={(e) => { if (e.key === 'Enter') onToggle(); }} tabIndex={0} aria-label={`Message from ${m.from?.name || m.from?.email}, collapsed`}>
        <div className="zl-message-head"><strong>{formatAddressShort(m.from, me)}</strong><time dateTime={new Date(m.date).toISOString()}>{formatLongDate(m.date)}</time><small className="zl-message-snip">{m.snippet}</small></div>
      </article>
    );
  }
  return (
    <article className="zl-message">
      <div className="zl-message-head" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <strong>{m.from?.name || m.from?.email}{m.from?.name ? <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}> &lt;{m.from.email}&gt;</span> : null}</strong>
        <time dateTime={new Date(m.date).toISOString()} title={formatLongDate(m.date)}>{formatLongDate(m.date)}</time>
        <small>To {to || 'undisclosed recipients'}</small>
      </div>
      <div className="zl-message-body" style={{ maxWidth: 'none' }}>
        {m.html ? <EmailFrame message={m} accountId={accountId} /> : <EmailText text={m.text ?? m.snippet} />}
      </div>
      {files.length ? (
        <div className="zl-attachments">
          {files.map((a) => (
            <a key={a.attachmentId} className="zl-attachment" href={attachmentUrl(accountId, m.id, a)} download={a.filename}>
              <Icon name="file" /><span>{a.filename}</span><small>{formatBytes(a.size)}</small>
            </a>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
        <IconButton icon="reply" label="Reply to this message" size="sm" onClick={() => onReply('reply')} />
        <IconButton icon="forward" label="Forward this message" size="sm" onClick={() => onReply('forward')} />
      </div>
    </article>
  );
}

function PropertyEditorChip({ def, threadId, value }: { def: PropertyDef; threadId: string; value: PropertyValue | undefined }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const setValue = (v: PropertyValue) => updateAccount((d) => ({ ...d, values: { ...d.values, [threadId]: { ...d.values[threadId], [def.id]: v } } }));
  const current = value ?? ((def.type === 'status' || def.type === 'select') ? def.defaultOptionId ?? null : null);
  let display: React.ReactNode = <span style={{ color: 'var(--text-placeholder)' }}>{def.name}</span>;
  if (def.type === 'status' || def.type === 'select' || def.type === 'multiSelect') {
    const ids = Array.isArray(current) ? current : current ? [String(current)] : [];
    const opts = ids.map((id) => def.options.find((o) => o.id === id)).filter(Boolean);
    if (opts.length) display = opts.map((o) => def.type === 'status' && o!.state
      ? <span key={o!.id} className={`zl-status zl-status--${o!.state}`}><StatusDot state={o!.state} />{o!.name}</span>
      : <span key={o!.id} className={`zl-tag ${o!.ink === 'gray' ? '' : `zl-tag--${o!.ink}`}`}><span>{o!.name}</span></span>);
  } else if (def.type === 'checkbox') {
    display = <span className="zl-tag">{current ? '☑' : '☐'} {def.name}</span>;
  } else if (current !== null && current !== undefined && current !== '') {
    display = <span className="zl-tag"><span>{def.name}: {String(current)}</span></span>;
  }
  return (
    <>
      <button className="zl-btn" style={{ padding: 0, height: 'auto', fontWeight: 400 }} onClick={(e) => (def.type === 'checkbox' ? setValue(!current) : setAnchor(e.currentTarget))} aria-label={`Edit ${def.name}`}>{display}</button>
      {anchor ? (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} label={def.name}>
          <div className="zl-menu" style={{ width: 280 }}>
            {def.type === 'status' || def.type === 'select' || def.type === 'multiSelect' ? (
              <>
                <div className="zl-menu-label">Select an option</div>
                {def.options.map((o) => {
                  const selected = Array.isArray(current) ? current.includes(o.id) : current === o.id;
                  return (
                    <button key={o.id} className="zl-menu-item" onClick={() => {
                      if (def.type === 'multiSelect') {
                        const arr = Array.isArray(current) ? current : [];
                        setValue(selected ? arr.filter((x) => x !== o.id) : [...arr, o.id]);
                      } else { setValue(o.id); setAnchor(null); }
                    }}>
                      {def.type === 'status' && o.state ? <span className={`zl-status zl-status--${o.state}`}><StatusDot state={o.state} />{o.name}</span> : <span className={`zl-tag ${o.ink === 'gray' ? '' : `zl-tag--${o.ink}`}`}><span>{o.name}</span></span>}
                      {o.id === def.defaultOptionId ? <span className="zl-menu-item-hint zl-caps">Default</span> : null}
                      {selected ? <Icon name="check" className="zl-menu-item-check" /> : null}
                    </button>
                  );
                })}
                <div className="zl-menu-sep" />
                <button className="zl-menu-item" onClick={() => { setValue(null); setAnchor(null); }}><Icon name="x" />Clear</button>
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('v'); setValue(def.type === 'number' ? (v === '' ? null : Number(v)) : (String(v ?? '') || null)); setAnchor(null); }}>
                <input name="v" className="zl-input zl-menu-search" defaultValue={current === null || current === undefined ? '' : String(current)} type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : def.type === 'url' ? 'url' : 'text'} aria-label={def.name} placeholder={def.name} />
                <div className="zl-menu-footer"><button type="button" className="zl-btn zl-btn--text" onClick={() => { setValue(null); setAnchor(null); }}>Clear</button><button type="submit" className="zl-btn zl-btn--primary">Save</button></div>
              </form>
            )}
          </div>
        </Popover>
      ) : null}
    </>
  );
}
