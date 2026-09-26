"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Users, Video, X } from 'lucide-react';

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
const eventDots = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
const toneIndexForEvent = (event: CalendarEvent) => {
  const key = event.id || event.summary || 'calendar';
  return [...key].reduce((value, character) => value + character.charCodeAt(0), 0) % eventTones.length;
};
const toneForEvent = (event: CalendarEvent) => {
  return eventTones[toneIndexForEvent(event)];
};

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<View>('Week');
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
    const response = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load calendar');
    return data.events as CalendarEvent[];
  }, [range]);

  useEffect(() => {
    let active = true;
    let refreshing = false;
    let initialLoad = true;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const loadedEvents = await loadEvents();
        if (active) {
          setEvents(loadedEvents);
          setSelectedEvent((current) => current ? loadedEvents.find((event) => event.id === current.id) || null : null);
          setError('');
        }
      } catch (loadError: unknown) {
        if (active) setError(messageOf(loadError));
      } finally {
        if (active && initialLoad) setLoading(false);
        initialLoad = false;
        refreshing = false;
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
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
    setSelectedEvent(null);
    setError('');
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
  const activeViewIndex = (['Day', 'Week', 'Month'] as View[]).indexOf(view);

  return (
    <div className="flex h-full min-h-0 bg-white text-[13px] text-gray-800">
      <section className="flex min-w-0 flex-1 flex-col bg-white">
      <header className="flex min-h-[58px] flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5">
        <h1 className="text-xl font-semibold leading-none text-gray-900">Calendar</h1>
        <button onClick={() => setCursor(new Date())} className="ml-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-sm hover:bg-gray-50">Today</button>
        <div className="flex items-center">
          <button aria-label="Previous" onClick={() => changeRange(-1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/70 hover:text-gray-800"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Next" onClick={() => changeRange(1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/70 hover:text-gray-800"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <h1 className="min-w-[170px] text-[17px] font-semibold tracking-tight text-gray-800">{rangeTitle}</h1>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="rounded-full bg-gray-100 p-1">
            <div className="relative flex h-7 w-[168px] items-center">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-full bg-white shadow-sm ring-1 ring-black/[0.04] transition-transform duration-200 ease-out" style={{ transform: `translateX(${activeViewIndex * 100}%)` }} />
              {(['Day', 'Week', 'Month'] as View[]).map((option) => (
                <button key={option} aria-pressed={view === option} onClick={() => setView(option)} className={`relative z-10 flex h-full flex-1 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${view === option ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>{option}</button>
              ))}
            </div>
          </div>
          <button onClick={() => openCreate()} className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-[12px] font-medium text-blue-600 transition-colors hover:bg-blue-100"><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">New event</span></button>
        </div>
      </header>

      {error && <div role="alert" className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-3 pb-3 pt-2 sm:px-4">
        {view === 'Month' && <div className="grid grid-cols-7 border-b border-gray-200 bg-white">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => <div key={name} className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">{name}</div>)}</div>}
        {view !== 'Month' && <div className={`grid border-b border-gray-200 bg-white ${view === 'Day' ? 'grid-cols-[46px_minmax(0,1fr)]' : 'grid-cols-[46px_repeat(7,minmax(0,1fr))]'}`}>
          <div />{days.map((day) => <button key={day.toISOString()} onClick={() => setCursor(day)} className="py-2 text-center hover:bg-gray-100"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">{format(day, 'EEE')}</div><div className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white' : 'text-gray-800'}`}>{format(day, 'd')}</div></button>)}
        </div>}
        {view === 'Month' ? <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-auto rounded-b-lg border-l border-gray-200">
          {days.map((day) => (
            <div key={day.toISOString()} onClick={() => openCreate(day)} className="group relative min-h-[110px] cursor-pointer border-b border-r border-gray-200 bg-white p-1.5 transition-colors hover:bg-gray-50/40">
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
          <div className="relative border-r border-gray-200 bg-white" style={{ height: `${16 * 64}px` }}>{Array.from({ length: 16 }, (_, index) => index + 6).map((hour) => <div key={hour} className="absolute right-2 text-[10px] tabular-nums text-gray-400" style={{ top: `${(hour - 6) * 64 + 8}px` }}>{format(new Date(2000, 0, 1, hour), 'ha').toLowerCase()}</div>)}</div>
          {days.map((day) => <div key={day.toISOString()} className="relative border-r border-gray-200 bg-white" style={{ height: `${16 * 64}px` }}>
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
      </section>

      {selectedEvent && <aside className="z-20 flex h-full w-[420px] max-w-[45vw] shrink-0 flex-col rounded-tl-2xl border-l border-gray-200 bg-white transition-all duration-300 ease-in-out">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-gray-100 bg-[#f7f7f5] px-5">
          <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${eventDots[toneIndexForEvent(selectedEvent)]}`} /><span className="text-sm font-semibold text-gray-800">Event details</span></div>
          <button onClick={() => setSelectedEvent(null)} aria-label="Close event details" className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h2 className="text-xl font-semibold leading-7 tracking-tight text-gray-900">{selectedEvent.summary || 'Event'}</h2>
          <div className="mt-5 space-y-5">
            <div className="flex gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><div><p className="text-sm font-medium text-gray-800">{format(dateOf(selectedEvent), 'EEEE, MMMM d, yyyy')}</p><p className="mt-1 text-[12px] text-gray-500">{selectedEvent.start?.dateTime ? `${format(dateOf(selectedEvent), 'h:mm a')} – ${format(new Date(selectedEvent.end?.dateTime || selectedEvent.start.dateTime), 'h:mm a')}` : 'All day'}</p></div></div>
            {selectedEvent.location && <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><div><p className="text-sm font-medium text-gray-800">Location</p><p className="mt-1 break-words text-[12px] text-gray-500">{selectedEvent.location}</p></div></div>}
            {selectedEvent.attendees?.length ? <div className="flex gap-3"><Users className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-800">Guests</p><div className="mt-2 space-y-2">{selectedEvent.attendees.map((attendee) => <div key={attendee.email} className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold uppercase text-gray-600">{attendee.email?.[0] || '?'}</span><span className="truncate text-[12px] text-gray-600">{attendee.email}</span><span className="ml-auto shrink-0 text-[10px] capitalize text-gray-400">{attendee.responseStatus || 'invited'}</span></div>)}</div></div></div> : null}
            {selectedEvent.description && <div className="flex gap-3"><div className="h-4 w-4 shrink-0" /><div><p className="text-sm font-medium text-gray-800">Description</p><p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-gray-500">{selectedEvent.description}</p></div></div>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-gray-100 px-5 py-4">
          {meetLink(selectedEvent) && <a href={meetLink(selectedEvent)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-blue-700"><Video className="h-3.5 w-3.5" />Join Google Meet</a>}
          {selectedEvent.htmlLink && <a href={selectedEvent.htmlLink} target="_blank" rel="noreferrer" className="rounded-full border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50">Open in Google Calendar</a>}
        </div>
      </aside>}

      {showCreate && <aside className="z-20 flex h-full w-[420px] max-w-[45vw] shrink-0 flex-col rounded-tl-2xl border-l border-gray-200 bg-white transition-all duration-300 ease-in-out">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-gray-100 bg-[#f7f7f5] px-5">
          <h2 className="text-sm font-semibold text-gray-900">New event</h2>
          <button type="button" onClick={() => setShowCreate(false)} aria-label="Close event form" className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-200/70 hover:text-gray-700"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={saveEvent} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <input required autoFocus value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Add title" className="w-full border-0 border-b border-gray-200 px-0 py-2 text-xl text-gray-900 outline-none focus:border-blue-500 focus:ring-0" />
            <label className="flex items-center gap-3 text-[12px] text-gray-500"><Clock3 className="h-4 w-4 shrink-0" /><span className="w-14 shrink-0">Starts</span><input required type="datetime-local" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-2 text-[12px] text-gray-800 focus:border-blue-400 focus:outline-none" /></label>
            <label className="flex items-center gap-3 text-[12px] text-gray-500"><Clock3 className="h-4 w-4 shrink-0" /><span className="w-14 shrink-0">Ends</span><input required type="datetime-local" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-2 text-[12px] text-gray-800 focus:border-blue-400 focus:outline-none" /></label>
            <label className="flex items-center gap-3 text-[12px] text-gray-500"><Users className="h-4 w-4 shrink-0" /><span className="w-14 shrink-0">Guests</span><input type="email" value={form.attendeeEmail} onChange={(event) => setForm({ ...form, attendeeEmail: event.target.value })} placeholder="Add guest email" className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:border-blue-400 focus:outline-none" /></label>
            <label className="flex items-center gap-3 text-[12px] text-gray-500"><MapPin className="h-4 w-4 shrink-0" /><span className="w-14 shrink-0">Location</span><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Add a location" className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:border-blue-400 focus:outline-none" /></label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add description" rows={4} className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-800 focus:border-blue-400 focus:outline-none" />
            <p className="flex items-center gap-2 text-[11px] text-gray-500"><Video className="h-4 w-4" />Google Meet link will be added automatically.</p>
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</p>}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-4"><button type="button" onClick={() => setShowCreate(false)} className="rounded-full px-4 py-2 text-[12px] font-medium text-gray-600 transition hover:bg-gray-100">Cancel</button><button disabled={saving} className="rounded-full bg-blue-50 px-4 py-2 text-[12px] font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-60">{saving ? 'Saving…' : 'Save event'}</button></div>
        </form>
      </aside>}

    </div>
  );
}
