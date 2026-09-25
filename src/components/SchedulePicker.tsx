'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client/api';
import { escapeHtml, formatSlots, freeSlots, type Slot } from '@/lib/shared/compose';
import { Dialog, Spinner } from './ui';
import { useMail } from './mail-context';

const START = 9, END = 18, SLOT = 30, DAYS = 5;

/** Week grid of the next five weekdays; busy time comes from Google Calendar free/busy. Returns HTML to insert. */
export function SchedulePicker({ onInsert, onClose }: { onInsert: (html: string, text: string) => void; onClose: () => void }) {
  const { account } = useMail();
  const [busy, setBusy] = useState<Slot[] | null>(() => (account.canReadFreeBusy ? null : []));
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [now] = useState(() => Date.now());
  const days = useMemo(() => {
    const out: Date[] = [];
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    while (out.length < DAYS) { if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return out;
  }, [now]);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  useEffect(() => {
    if (!account.canReadFreeBusy) return;
    const from = days[0]!.getTime();
    const to = days[days.length - 1]!.getTime() + 86_400_000;
    api.freeBusy(from, to).then((r) => setBusy(r.busy)).catch((e: Error) => { setError(e.message); setBusy([]); });
  }, [account.canReadFreeBusy, days]);

  const free = useMemo(() => new Set(busy ? freeSlots(busy, { from: now, days: DAYS, startHour: START, endHour: END, slotMinutes: SLOT }).map((s) => s.start) : []), [busy, now]);
  const rows = (END - START) * (60 / SLOT);

  const insert = () => {
    const slots = [...picked].sort((a, b) => a - b).map((s) => ({ start: s, end: s + SLOT * 60_000 }));
    const lines = formatSlots(slots);
    const intro = `Here are some times that work for me (${tz.replace(/_/g, ' ')}):`;
    onInsert(`<p>${escapeHtml(intro)}</p><ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`, `${intro}\n${lines.map((l) => `• ${l}`).join('\n')}`);
    onClose();
  };

  return (
    <Dialog title="Share availability" onClose={onClose} wide actions={<><button className="zl-btn zl-btn--ghost" onClick={onClose}>Cancel</button><button className="zl-btn zl-btn--primary" disabled={!picked.size} onClick={insert}>Insert {picked.size ? `${picked.size} slot${picked.size > 1 ? 's' : ''}` : ''}</button></>}>
      <p>Pick the times to offer. Gray blocks are busy on your Google Calendar.</p>
      {!account.canReadFreeBusy ? <div className="zl-banner">Calendar access wasn’t granted, so busy times aren’t shown. Sign in again and allow calendar free/busy to see them.</div> : null}
      {error ? <div className="zl-banner zl-banner--error">{error}</div> : null}
      {busy === null ? <div className="zl-loadmore"><Spinner /></div> : (
        <div className="zl-sched" role="grid" aria-label="Available times">
          <span />
          {days.map((d) => <span key={d.getTime()} className="zl-sched-head">{d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>)}
          {Array.from({ length: rows }, (_, r) => {
            const minutes = START * 60 + r * SLOT;
            return [
              <span key={`t${r}`} className="zl-sched-time">{minutes % 60 === 0 ? new Date(2000, 0, 1, minutes / 60).toLocaleTimeString('en-US', { hour: 'numeric' }) : ''}</span>,
              ...days.map((d) => {
                const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(minutes / 60), minutes % 60).getTime();
                const past = start < now;
                const isFree = free.has(start);
                const isPicked = picked.has(start);
                return (
                  <button key={start} type="button" role="gridcell" aria-selected={isPicked} disabled={past || !isFree}
                    aria-label={`${new Date(start).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}${past ? ', past' : !isFree ? ', busy' : ''}`}
                    className={`zl-sched-cell ${past ? 'is-past' : !isFree ? 'is-busy' : ''} ${isPicked ? 'is-picked' : ''}`}
                    onClick={() => setPicked((p) => { const n = new Set(p); if (n.has(start)) n.delete(start); else n.add(start); return n; })} />
                );
              }),
            ];
          })}
        </div>
      )}
    </Dialog>
  );
}
