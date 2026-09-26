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

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<View>('Month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
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

  const openCreate = (day?: Date) => {
    const start = day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10) : new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setForm((current) => ({ ...current, summary: '', description: '', start: localInput(start), end: localInput(end), attendeeEmail: '', location: '' }));
    setShowCreate(true);
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
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-5 py-3.5 sm:px-7">
        <div className="flex items-center gap-2 text-gray-700">
          <CalendarDays className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-medium tracking-tight">Calendar</span>
        </div>
        <button onClick={() => setCursor(new Date())} className="ml-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Today</button>
        <div className="flex items-center">
          <button aria-label="Previous" onClick={() => changeRange(-1)} className="rounded-full p-2 text-gray-600 hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
          <button aria-label="Next" onClick={() => changeRange(1)} className="rounded-full p-2 text-gray-600 hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <h1 className="min-w-[190px] text-xl font-normal text-gray-800">{rangeTitle}</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border border-gray-300 p-0.5">
            {(['Day', 'Week', 'Month'] as View[]).map((option) => (
              <button key={option} onClick={() => setView(option)} className={`rounded px-3 py-1.5 text-sm ${view === option ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>{option}</button>
            ))}
          </div>
          <button onClick={() => openCreate()} className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Create</span></button>
        </div>
      </header>

      {error && <div role="alert" className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-3 sm:px-6">
        {view === 'Month' && <div className="grid grid-cols-7 border-b border-gray-200">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => <div key={name} className="py-2 text-center text-xs font-medium uppercase tracking-wide text-gray-500">{name}</div>)}</div>}
        {view !== 'Month' && <div className="grid grid-cols-7 border-b border-gray-200">{days.map((day) => <div key={day.toISOString()} className="py-2 text-center"><div className="text-xs uppercase text-gray-500">{format(day, 'EEE')}</div><div className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm ${isSameDay(day, new Date()) ? 'bg-blue-600 font-medium text-white' : 'text-gray-800'}`}>{format(day, 'd')}</div></div>)}</div>}
        <div className={`grid min-h-0 flex-1 ${view === 'Month' ? 'grid-cols-7 grid-rows-6' : view === 'Day' ? 'grid-cols-1' : 'grid-cols-7'} overflow-auto`}>
          {days.map((day) => (
            <div key={day.toISOString()} className={`group relative min-h-[110px] border-b border-r border-gray-200 p-1.5 ${view !== 'Month' ? 'min-w-[145px] flex-1' : ''} ${view === 'Month' && !isSameMonth(day, cursor) ? 'bg-gray-50/70' : 'bg-white'}`}>
              {view === 'Month' && <div className="mb-1 flex items-center justify-between px-1"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${isSameDay(day, new Date()) ? 'bg-blue-600 font-medium text-white' : isSameMonth(day, cursor) ? 'text-gray-700' : 'text-gray-400'}`}>{format(day, 'd')}</span><button onClick={() => openCreate(day)} className="rounded-full p-1 text-gray-400 opacity-0 hover:bg-gray-100 group-hover:opacity-100" aria-label={`Create event ${format(day, 'MMM d')}`}><Plus className="h-3.5 w-3.5" /></button></div>}
              <div className="space-y-1">
                {dayEvents(day).slice(0, view === 'Month' ? 4 : 12).map((event) => (
                  <button key={event.id} onClick={() => setSelectedEvent(event)} className="block w-full truncate rounded px-2 py-1 text-left text-xs font-medium text-blue-950 hover:brightness-95" style={{ backgroundColor: '#dbeafe', borderLeft: '3px solid #4285f4' }}>
                    {event.start?.dateTime && <span className="mr-1 font-normal">{format(dateOf(event), 'h:mm a')}</span>}{event.summary || '(No title)'}
                  </button>
                ))}
                {view === 'Month' && dayEvents(day).length > 4 && <button onClick={() => { setCursor(day); setView('Day'); }} className="px-2 text-xs font-medium text-gray-500">+{dayEvents(day).length - 4} more</button>}
              </div>
            </div>
          ))}
        </div>
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
