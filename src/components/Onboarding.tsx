'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { updateAccount } from '@/lib/client/store';
import { compileView, defaultViews, ONBOARDING_CATEGORIES, type OnboardingKey } from '@/lib/shared/views';
import { formatListDate, participantLabel } from '@/lib/shared/compose';
import type { ThreadSummary } from '@/lib/shared/types';
import { Glyph, Mark } from './icons';
import { Spinner } from './ui';
import { useMail } from './mail-context';

export function Onboarding() {
  const { me, account } = useMail();
  const [included, setIncluded] = useState<OnboardingKey[]>(['calendar', 'notifications', 'lists']);
  const [result, setResult] = useState<{ q: string; threads: ThreadSummary[] | null; error: string | null }>({ q: '', threads: null, error: null });
  const inboxQuery = compileView(defaultViews(included)[0]!.filters);

  useEffect(() => {
    let live = true;
    api.threads(inboxQuery, undefined, 25)
      .then((p) => { if (live) setResult({ q: inboxQuery, threads: p.threads, error: null }); })
      .catch((e: Error) => { if (live) setResult({ q: inboxQuery, threads: null, error: e.message }); });
    return () => { live = false; };
  }, [inboxQuery]);
  const current = result.q === inboxQuery;
  const preview = current ? result.threads : null;
  const error = current ? result.error : null;

  const finish = () => updateAccount((d) => ({ ...d, onboarded: true, views: d.views.length ? d.views : defaultViews(included) }));

  return (
    <div className="zl-onboard">
      <div className="zl-onboard-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mark size={28} /><strong>ZeroLatency</strong></div>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 'var(--text-md)', fontWeight: 600 }}>Let’s start fresh. What would you like in your primary inbox?</h1>
          <p className="zl-field-hint" style={{ margin: 0 }}>Excluded mail is kept out of your Inbox view. You can still find it in its own views. Nothing is moved or deleted in Gmail.</p>
        </div>
        <div className="zl-options" role="group" aria-label="Inbox categories">
          {ONBOARDING_CATEGORIES.map((c) => {
            const on = included.includes(c.key);
            return (
              <button key={c.key} className="zl-option" aria-pressed={on} onClick={() => setIncluded((cur) => (on ? cur.filter((k) => k !== c.key) : [...cur, c.key]))}>
                <Glyph name={c.glyph} ink={c.ink} />{c.name}
                <span className={`zl-tag ${on ? 'zl-tag--accent' : ''}`}>{on ? 'Included' : 'Excluded'}</span>
              </button>
            );
          })}
        </div>
        <button className="zl-btn zl-btn--primary zl-btn--block" onClick={finish}>Continue</button>
        <p className="zl-auth-note" style={{ textAlign: 'left' }}>Signed in as {account.email}. You can change views at any time.</p>
      </div>
      <div className="zl-onboard-right" aria-label="Inbox preview">
        <header className="zl-viewbar"><h2 className="zl-viewbar-title" style={{ margin: 0, fontSize: 'inherit' }}><Glyph name="inbox" ink="red" /><span>Inbox</span></h2></header>
        <div className="zl-scroll">
          {error ? <div className="zl-banner zl-banner--error">{error}</div> : null}
          {!preview && !error ? <div className="zl-loadmore"><Spinner /></div> : null}
          <ul className="zl-list">
            {preview?.map((t) => (
              <li key={t.id} className={`zl-row ${t.unread ? 'zl-row--unread' : ''}`} style={{ cursor: 'default' }}>
                <span />
                <span className="zl-row-dot" />
                <span className="zl-row-from">{participantLabel(t.participants, me, t.messageCount).names}</span>
                <span className="zl-row-subject">{t.subject || '(no subject)'}</span>
                <span className="zl-row-meta" />
                <span className="zl-row-time">{formatListDate(t.lastDate)}</span>
              </li>
            ))}
          </ul>
          {preview && !preview.length ? <div className="zl-empty"><span>Nothing matches. Try including more categories.</span></div> : null}
        </div>
      </div>
    </div>
  );
}
