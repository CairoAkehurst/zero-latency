"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Users, Video, X } from 'lucide-react';

type CalendarEvent = {
  id: string;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  htmlLink?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
  attendees?: Array<{ email?: string | null; responseStatus?: string | null }> | null;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string | null; uri?: string | null }> | null } | null;
};

type View = 'Month' | 'Week' | 'Day';
const dateOf = (event: CalendarEvent) => new Date(event.start?.dateTime || `${event.start?.date}T00:00:00`);
const localInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong';
const eventTones = [
  'border-blue-200 bg-blue-50 text-blue-900 before:bg-blue-500',
  'border-emerald-200 bg-emerald-50 text-emerald-900 before:bg-emerald-500',
  'border-violet-200 bg-violet-50 text-violet-900 before:bg-violet-500',
  'border-amber-200 bg-amber-50 text-amber-950 before:bg-amber-500',
  'border-rose-200 bg-rose-50 text-rose-900 before:bg-rose-500',
  'border-cyan-200 bg-cyan-50 text-cyan-950 before:bg-cyan-500',
];
const toneForEvent = (event: CalendarEvent) => {
  const key = event.id || event.summary || 'calendar';
  const hash = [...key].reduce((value, character) => value + character.charCodeAt(0), 0);
  return eventTones[hash % eventTones.length];
};

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<View>('Month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragSelection, setDragSelection] = useState<{ start: Date; end: Date } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [form, setForm] = useState({
    summary: '', description: '', start: '', end: '', attendeeEmail: '', location: '',
  });

  const range = useMemo(() => {
    if (view === 'Month') return { start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) };
    if (view === 'Week') return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    return { start: cursor, end: cursor };
  }, [cursor, view]);

  const loadEvents = useCallback(async () => {
    const timeMin = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate()).toISOString();
    const timeMax = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() + 1).toISOString();
    const response = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load calendar');
    return data.events as CalendarEvent[];
  }, [range]);

  useEffect(() => {
    let active = true;
    loadEvents().then((loadedEvents) => {
      if (active) setEvents(loadedEvents);
    }).catch((loadError: unknown) => {
      if (active) setError(messageOf(loadError));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadEvents]);

  const days = useMemo(() => {
    const count = view === 'Month' ? 42 : view === 'Week' ? 7 : 1;
    const first = view === 'Month' ? range.start : view === 'Week' ? range.start : cursor;
    return Array.from({ length: count }, (_, index) => addDays(first, index));
  }, [cursor, range, view]);

  const changeRange = (direction: number) => {
    setCursor((current) => view === 'Month' ? (direction > 0 ? addMonths(current, 1) : subMonths(current, 1)) : addDays(current, direction * (view === 'Week' ? 7 : 1)));
  };

  const openCreate = (day?: Date, startAt?: Date, endAt?: Date) => {
    const start = startAt || (day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10) : new Date(Date.now() + 60 * 60 * 1000));
    const end = endAt || new Date(start.getTime() + 60 * 60 * 1000);
    setForm((current) => ({ ...current, summary: '', description: '', start: localInput(start), end: localInput(end), attendeeEmail: '', location: '' }));
    setShowCreate(true);
  };

  const beginTimeSelection = (day: Date, hour: number) => {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
    setIsSelecting(true);
    setDragSelection({ start, end: start });
  };

  const updateTimeSelection = (day: Date, hour: number) => {
    if (!isSelecting || !dragSelection) return;
    setDragSelection({ ...dragSelection, end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour) });
  };

  const finishTimeSelection = () => {
    if (!isSelecting || !dragSelection) return;
    const start = dragSelection.start <= dragSelection.end ? dragSelection.start : dragSelection.end;
    const lastHour = dragSelection.start <= dragSelection.end ? dragSelection.end : dragSelection.start;
    const end = new Date(lastHour.getTime() + 60 * 60 * 1000);
    setIsSelecting(false);
    setDragSelection(null);
    openCreate(undefined, start, end);
  };

  const saveEvent = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create event');
      setShowCreate(false);
      setEvents(await loadEvents());
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  const rangeTitle = view === 'Month' ? format(cursor, 'MMMM yyyy') : view === 'Week'
    ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}` : format(cursor, 'EEEE, MMMM d, yyyy');

  const dayEvents = (day: Date) => events.filter((event) => isSameDay(dateOf(event), day));
  const meetLink = (event: CalendarEvent) => event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-[13px] text-gray-800">
      <header className="flex min-h-[58px] flex-wrap items-center gap-2 border-b border-gray-100 bg-[#f7f7f5] px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2 text-gray-800">
          <CalendarDays className="h-[18px] w-[18px] text-gray-500" />
          <span className="text-[15px] font-semibold tracking-tight">Calendar</span>
        </div>
        <button onClick={() => setCursor(new Date())} className="ml-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-sm hover:bg-gray-50">Today</button>
        <div className="flex items-center">
          <button aria-label="Previous" onClick={() => changeRange(-1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/70 hover:text-gray-800"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Next" onClick={() => changeRange(1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/70 hover:text-gray-800"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <h1 className="min-w-[170px] text-[17px] font-semibold tracking-tight text-gray-800">{rangeTitle}</h1>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex rounded-md border border-gray-200 bg-white p-0.5 shadow-sm">
            {(['Day', 'Week', 'Month'] as View[]).map((option) => (
              <button key={option} onClick={() => setView(option)} className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${view === option ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>{option}</button>
            ))}
          </div>
          <button onClick={() => openCreate()} className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-gray-700"><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">New event</span></button>
        </div>
      </header>

      {error && <div role="alert" className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-4">
        {view === 'Month' && <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => <div key={name} className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">{name}</div>)}</div>}
        {view !== 'Month' && <div className={`grid border-b border-gray-200 bg-gray-50/70 ${view === 'Day' ? 'grid-cols-[46px_minmax(0,1fr)]' : 'grid-cols-[46px_repeat(7,minmax(0,1fr))]'}`}>
          <div />{days.map((day) => <button key={day.toISOString()} onClick={() => setCursor(day)} className="py-2 text-center hover:bg-gray-100"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">{format(day, 'EEE')}</div><div className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white' : 'text-gray-800'}`}>{format(day, 'd')}</div></button>)}
        </div>}
        {view === 'Month' ? <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-auto rounded-b-lg border-l border-gray-200">
          {days.map((day) => (
            <div key={day.toISOString()} onClick={() => openCreate(day)} className={`group relative min-h-[110px] cursor-pointer border-b border-r border-gray-200 p-1.5 transition-colors ${!isSameMonth(day, cursor) ? 'bg-gray-50/60' : isSameDay(day, new Date()) ? 'bg-blue-50/30' : 'bg-white hover:bg-gray-50/70'}`}>
              <div className="mb-1 flex items-center justify-between px-0.5"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white' : isSameMonth(day, cursor) ? 'text-gray-700' : 'text-gray-400'}`}>{format(day, 'd')}</span><button onClick={(event) => { event.stopPropagation(); openCreate(day); }} className="rounded-md p-1 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100" aria-label={`Create event ${format(day, 'MMM d')}`}><Plus className="h-3.5 w-3.5" /></button></div>
              <div className="space-y-1">
                {dayEvents(day).slice(0, 4).map((event) => (
                  <button key={event.id} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(event); }} className={`relative block w-full truncate rounded-md border border-l-[3px] px-2 py-1 text-left text-[11px] leading-[15px] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition hover:brightness-[0.98] hover:shadow-sm before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] ${toneForEvent(event)}`}>
                    <span className="block truncate font-semibold">{event.summary || '(No title)'}</span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-normal opacity-75">{event.start?.dateTime ? format(dateOf(event), 'h:mm a') : 'All day'}{event.attendees?.length ? <><span aria-hidden="true">·</span><Users className="h-3 w-3 shrink-0" />{event.attendees.length}</> : null}</span>
                  </button>
                ))}
                {dayEvents(day).length > 4 && <button onClick={(clickEvent) => { clickEvent.stopPropagation(); setCursor(day); setView('Day'); }} className="px-2 text-[10px] font-medium text-gray-500 hover:text-gray-800">+{dayEvents(day).length - 4} more</button>}
              </div>
            </div>
          ))}
        </div> : <div className={`grid min-h-0 flex-1 overflow-auto rounded-b-lg border-l border-gray-200 ${view === 'Day' ? 'grid-cols-[46px_minmax(0,1fr)]' : 'grid-cols-[46px_repeat(7,minmax(150px,1fr))]'}`} onMouseUp={finishTimeSelection}>
          <div className="relative border-r border-gray-200 bg-gray-50/50" style={{ height: `${16 * 64}px` }}>{Array.from({ length: 16 }, (_, index) => index + 6).map((hour) => <div key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-gray-400" style={{ top: `${(hour - 6) * 64}px` }}>{format(new Date(2000, 0, 1, hour), 'ha').toLowerCase()}</div>)}</div>
          {days.map((day) => <div key={day.toISOString()} className={`relative border-r border-gray-200 ${isSameDay(day, new Date()) ? 'bg-blue-50/20' : 'bg-white'}`} style={{ height: `${16 * 64}px` }}>
            {Array.from({ length: 16 }, (_, index) => index + 6).map((hour) => <div key={hour} onMouseDown={(event) => { if (event.button === 0) { event.preventDefault(); beginTimeSelection(day, hour); } }} onMouseEnter={() => updateTimeSelection(day, hour)} className="absolute left-0 right-0 z-0 h-16 border-b border-gray-100 transition-colors hover:bg-blue-50/40" style={{ top: `${(hour - 6) * 64}px` }} />)}
            {dragSelection && isSelecting && (isSameDay(dragSelection.start, day) || isSameDay(dragSelection.end, day)) && (() => {
              const slot = isSameDay(dragSelection.start, day) ? dragSelection.start : dragSelection.end;
              const top = (slot.getHours() - 6) * 64;
              return <div className="pointer-events-none absolute left-1 right-1 z-10 rounded-md border border-blue-300 bg-blue-100/80 px-2 py-1 text-[10px] font-medium text-blue-800" style={{ top, height: 58 }}>New event · {format(slot, 'h:mm a')}</div>;
            })()}
            {dayEvents(day).map((event) => {
              const start = dateOf(event);
              const eventEnd = new Date(event.end?.dateTime || start.getTime() + 60 * 60 * 1000);
              const offset = Math.max(0, (start.getHours() - 6) * 64 + (start.getMinutes() / 60) * 64);
              const height = Math.max(34, Math.min(16 * 64 - offset, ((eventEnd.getTime() - start.getTime()) / 3_600_000) * 64));
              return <button key={event.id} onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(event); }} className={`absolute left-1 right-1 z-20 overflow-hidden rounded-md border border-l-[3px] px-2 py-1 text-left text-[11px] leading-[15px] shadow-sm transition hover:brightness-[0.98] before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] ${toneForEvent(event)}`} style={{ top: offset, height }}><span className="block truncate font-semibold">{event.summary || '(No title)'}</span><span className="block truncate text-[10px] opacity-75">{format(start, 'h:mm a')}{event.attendees?.length ? ` · ${event.attendees.length} guest${event.attendees.length === 1 ? '' : 's'}` : ''}</span></button>;
            })}
          </div>)}
        </div>}
        {loading && <div className="pointer-events-none absolute bottom-8 right-10 rounded-full bg-white/90 px-3 py-1.5 text-xs text-gray-500 shadow">Loading events…</div>}
        {!loading && !events.length && !error && <div className="pointer-events-none absolute bottom-8 right-10 rounded-full bg-white/90 px-3 py-1.5 text-xs text-gray-400 shadow">Your calendar is up to date</div>}
      </div>

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
        <form onSubmit={saveEvent} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4"><h2 className="text-lg font-medium text-gray-800">Create event</h2><button type="button" onClick={() => setShowCreate(false)} aria-label="Close" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
          <div className="space-y-4 px-6 py-5">
            <input required autoFocus value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Add title" className="w-full border-0 border-b border-gray-200 px-0 py-2 text-xl text-gray-900 outline-none focus:border-blue-500 focus:ring-0" />
            <label className="flex items-center gap-3 text-sm text-gray-500"><Clock3 className="h-4 w-4" /><span className="w-16">Starts</span><input required type="datetime-local" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-2 text-gray-800" /></label>
            <label className="flex items-center gap-3 text-sm text-gray-500"><Clock3 className="h-4 w-4" /><span className="w-16">Ends</span><input required type="datetime-local" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-2 text-gray-800" /></label>
            <label className="flex items-center gap-3 text-sm text-gray-500"><Users className="h-4 w-4" /><span className="w-16">Guest</span><input type="email" value={form.attendeeEmail} onChange={(event) => setForm({ ...form, attendeeEmail: event.target.value })} placeholder="Add guest email" className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-gray-800" /></label>
            <label className="flex items-center gap-3 text-sm text-gray-500"><MapPin className="h-4 w-4" /><span className="w-16">Location</span><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Add location or meeting link" className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-gray-800" /></label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add description" rows={3} className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800" />
            <p className="flex items-center gap-2 text-xs text-gray-500"><Video className="h-4 w-4" />A Google Meet link will be added automatically.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4"><button type="button" onClick={() => setShowCreate(false)} className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button><button disabled={saving} className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button></div>
        </form>
      </div>}

      {selectedEvent && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedEvent(null); }}>
        <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-medium text-gray-900">{selectedEvent.summary || 'Event'}</h2><p className="mt-1 text-sm text-gray-500">{selectedEvent.start?.dateTime ? `${format(dateOf(selectedEvent), 'EEEE, MMMM d · h:mm a')} – ${format(new Date(selectedEvent.end?.dateTime || selectedEvent.start.dateTime), 'h:mm a')}` : format(dateOf(selectedEvent), 'EEEE, MMMM d')}</p></div><button onClick={() => setSelectedEvent(null)} aria-label="Close" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
          {selectedEvent.location && <p className="mt-4 flex items-center gap-2 text-sm text-gray-600"><MapPin className="h-4 w-4" />{selectedEvent.location}</p>}
          {selectedEvent.attendees?.length ? <p className="mt-3 flex items-center gap-2 text-sm text-gray-600"><Users className="h-4 w-4" />{selectedEvent.attendees.map((attendee) => attendee.email).filter(Boolean).join(', ')}</p> : null}
          {selectedEvent.description && <p className="mt-4 whitespace-pre-wrap text-sm text-gray-600">{selectedEvent.description}</p>}
          <div className="mt-5 flex gap-2">{meetLink(selectedEvent) && <a href={meetLink(selectedEvent)!} target="_blank" rel="noreferrer" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">Join with Google Meet</a>}{selectedEvent.htmlLink && <a href={selectedEvent.htmlLink} target="_blank" rel="noreferrer" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700">Open in Google Calendar</a>}</div>
        </div>
      </div>}
    </div>
  );
}
