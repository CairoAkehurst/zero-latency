'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { formatListDate, textToHtml } from '@/lib/shared/compose';
import type { ThreadSummary } from '@/lib/shared/types';
import { Glyph, Icon } from './icons';
import { IconButton, Spinner, useToast } from './ui';
import { useMail } from './mail-context';

interface ListState { q: string; threads: ThreadSummary[]; next: string | null; loading: boolean; loadingMore: boolean; error: string | null }

interface Card { historyId: string; summary: string; replies: { label: string; body: string }[] }
type CardState = Card | 'loading' | 'error';

const BATCH = 8;
const CACHE_LIMIT = 300;

function cacheKey(accountId: string) {
  return `zl:v1:cards:${accountId}`;
}

function readCache(accountId: string): Record<string, Card> {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(accountId)) ?? '{}') as Record<string, Card>;
  } catch {
    return {};
  }
}

function writeCache(accountId: string, cards: Record<string, Card>) {
  try {
    const entries = Object.entries(cards);
    localStorage.setItem(cacheKey(accountId), JSON.stringify(Object.fromEntries(entries.slice(-CACHE_LIMIT))));
  } catch {
    // Storage full or blocked: summaries are regenerated next time.
  }
}

/**
 * Summaries and quick replies per thread. Cards request their own summary when they scroll into view; requests
 * are batched and cached per thread version (historyId), so revisiting the grid costs nothing.
 */
function useCards(accountId: string, threads: ThreadSummary[], enabled: boolean) {
  const [cards, setCards] = useState<Record<string, CardState>>(() => (typeof window === 'undefined' ? {} : readCache(accountId)));
  const queue = useRef(new Set<string>());
  const inflight = useRef(new Set<string>());
  const timer = useRef<number | null>(null);
  const threadsRef = useRef(threads);
  const flushRef = useRef<() => void>(() => undefined);
  useEffect(() => { threadsRef.current = threads; });

  const flush = useCallback(() => {
    timer.current = null;
    const byId = new Map(threadsRef.current.map((t) => [t.id, t]));
    const ids = [...queue.current].filter((id) => byId.has(id) && !inflight.current.has(id)).slice(0, BATCH);
    ids.forEach((id) => { queue.current.delete(id); inflight.current.add(id); });
    if (!ids.length) return;
    setCards((c) => ({ ...c, ...Object.fromEntries(ids.map((id) => [id, 'loading' as const])) }));
    api.aiCards(ids).then((r) => {
      setCards((c) => {
        const next: Record<string, CardState> = { ...c };
        for (const id of ids) next[id] = 'error';
        for (const card of r.cards) {
          // Key by the list's version of the thread, which is what we compare against later.
          const t = byId.get(card.threadId);
          next[card.threadId] = { historyId: t?.historyId ?? card.historyId, summary: card.summary, replies: card.replies };
        }
        writeCache(accountId, Object.fromEntries(Object.entries(next).filter((e): e is [string, Card] => typeof e[1] === 'object')));
        return next;
      });
    }).catch(() => {
      setCards((c) => ({ ...c, ...Object.fromEntries(ids.map((id) => [id, 'error' as const])) }));
    }).finally(() => {
      ids.forEach((id) => inflight.current.delete(id));
      if (queue.current.size && timer.current === null) timer.current = window.setTimeout(() => flushRef.current(), 60);
    });
    if (queue.current.size) timer.current = window.setTimeout(() => flushRef.current(), 60);
  }, [accountId]);
  useEffect(() => { flushRef.current = flush; });

  const request = useCallback((t: ThreadSummary, force = false) => {
    if (!enabled) return;
    const have = cards[t.id];
    if (!force && (have === 'loading' || have === 'error' || (typeof have === 'object' && have.historyId === t.historyId))) return;
    queue.current.add(t.id);
    if (timer.current === null) timer.current = window.setTimeout(flush, 120);
  }, [cards, enabled, flush]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  return { cards, request };
}

export function SummaryGrid({ state, onLoadMore, onRetry, onOpenSidebar }: { state: ListState; onLoadMore: () => void; onRetry: () => void; onOpenSidebar: () => void }) {
  const { account, me, openThread, openThreadId, compose, aiEnabled, refreshList } = useMail();
  const { push } = useToast();
  const { cards, request } = useCards(account.id, state.threads, aiEnabled);
  const [spinning, setSpinning] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);

  // Ask for a summary when a card comes into view (and keep asking as the list grows).
  const grid = useRef<HTMLUListElement>(null);
  const requestRef = useRef(request);
  useEffect(() => { requestRef.current = request; });
  useEffect(() => {
    const root = grid.current;
    if (!root) return;
    const byId = new Map(state.threads.map((t) => [t.id, t]));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const t = byId.get((e.target as HTMLElement).dataset.id ?? '');
        if (t) requestRef.current(t);
      }
    }, { rootMargin: '200px' });
    root.querySelectorAll<HTMLElement>('[data-id]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [state.threads]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !state.next) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) onLoadMore(); }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [state.next, onLoadMore]);

  const reply = async (t: ThreadSummary, body: string) => {
    setReplying(t.id);
    try {
      const thread = await api.thread(t.id);
      const last = [...thread.messages].reverse().find((m) => !m.labelIds.includes('DRAFT'));
      if (!last) return;
      compose({ mode: 'reply', threadId: t.id, source: last, bodyHtml: textToHtml(body) });
    } catch (e) {
      push({ message: e instanceof Error ? e.message : 'Could not open the reply.', tone: 'error' });
    } finally {
      setReplying(null);
    }
  };

  return (
    <section className="zl-listpane zl-summary" aria-label="Summary">
      <header className="zl-viewbar">
        <span className="zl-only-mobile"><IconButton icon="menu" label="Open sidebar" onClick={onOpenSidebar} /></span>
        <h1 className="zl-viewbar-title" style={{ fontSize: 'inherit', margin: 0 }}><Glyph name="layers" ink="purple" /><span>Summary</span></h1>
        <div className="zl-viewbar-tools">
          <IconButton icon="refresh" label="Refresh" onClick={() => { setSpinning(true); refreshList(); setTimeout(() => setSpinning(false), 600); }} className={spinning ? 'is-on' : ''} />
        </div>
      </header>
      {!aiEnabled ? <div className="zl-banner">AI is off, so cards show the latest message instead of a summary. Set OPENAI_API_KEY to turn on summaries and quick replies.</div> : <div />}
      <div className="zl-scroll">
        {state.error ? (
          <div className="zl-empty"><Icon name="alert" /><strong>Couldn’t load your inbox</strong><span>{state.error}</span><button className="zl-btn zl-btn--secondary" onClick={onRetry}>Try again</button></div>
        ) : state.loading && !state.threads.length ? (
          <div className="zl-empty"><Spinner /></div>
        ) : !state.threads.length ? (
          <div className="zl-empty"><Icon name="inbox" /><strong>Inbox zero</strong><span>Nothing to summarise.</span></div>
        ) : (
          <ul className="zl-card-grid" ref={grid}>
            {state.threads.map((t) => {
              const card = cards[t.id];
              const fresh = typeof card === 'object' ? card : null;
              const others = t.participants.filter((p) => p.email.toLowerCase() !== me.toLowerCase());
              const sender = others[others.length - 1] ?? t.participants[0];
              const name = sender?.name || sender?.email || '(unknown)';
              return (
                <li key={t.id} data-id={t.id}>
                  <article
                    className={`zl-mail-card${t.unread ? ' is-unread' : ''}${openThreadId === t.id ? ' is-open' : ''}`}
                    tabIndex={0}
                    onClick={() => openThread(t.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openThread(t.id); }}
                    aria-label={`${name}: ${t.subject || '(no subject)'}`}
                  >
                    <header className="zl-mail-card-head">
                      <span className="zl-monogram" aria-hidden>{name[0]?.toUpperCase()}</span>
                      <span className="zl-mail-card-from">{name}{t.messageCount > 1 ? <small>{t.messageCount}</small> : null}</span>
                      <time>{formatListDate(t.lastDate)}</time>
                    </header>
                    <h3 className="zl-mail-card-title">{t.unread ? <span className="zl-row-dot" aria-label="Unread" /> : null}{t.subject || '(no subject)'}</h3>
                    <p className="zl-mail-card-summary">
                      {!aiEnabled ? t.snippet
                        : fresh ? fresh.summary
                          : card === 'error' ? <>{t.snippet} <button className="zl-btn zl-btn--text zl-btn--sm" onClick={(e) => { e.stopPropagation(); request(t, true); }}>Retry summary</button></>
                            : <span className="zl-skeleton" aria-label="Summarising"><span /><span /><span /></span>}
                    </p>
                    {fresh && fresh.replies.length ? (
                      <footer className="zl-mail-card-replies">
                        {fresh.replies.map((r) => (
                          <button key={r.label} className="zl-btn zl-btn--secondary zl-btn--sm" title={r.body} disabled={replying === t.id} onClick={(e) => { e.stopPropagation(); void reply(t, r.body); }}>{r.label}</button>
                        ))}
                      </footer>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={sentinel} />
        {state.loadingMore ? <div className="zl-loadmore"><Spinner /></div> : null}
      </div>
    </section>
  );
}
