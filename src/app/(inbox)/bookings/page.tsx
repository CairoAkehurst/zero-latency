'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Link as LinkIcon, Trash2, Copy } from 'lucide-react';
import Link from 'next/link';

interface Schedule {
  id: string;
  name: string;
  slug: string;
  durationMinutes: number;
  availableDays: number[];
  startHour: string;
  endHour: string;
}

export default function BookingsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);
    
    const schedule = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      durationMinutes: parseInt(formData.get('durationMinutes') as string),
      availableDays: [1, 2, 3, 4, 5], // Mon-Fri default for prototype
      startHour: formData.get('startHour') as string,
      endHour: formData.get('endHour') as string,
    };

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
      if (res.ok) {
        fetchSchedules();
        (e.target as HTMLFormElement).reset();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      fetchSchedules();
    } catch (e) {
      console.error(e);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="p-8">Loading schedules...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Booking Schedules</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-6 rounded-xl border shadow-sm h-fit">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">New Schedule</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input name="name" required placeholder="e.g., 30 Min Call" className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <input name="slug" required placeholder="e.g., 30min" className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" name="durationMinutes" required defaultValue={30} className="w-full p-2 border rounded-md" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" name="startHour" required defaultValue="09:00" className="w-full p-2 border rounded-md" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" name="endHour" required defaultValue="17:00" className="w-full p-2 border rounded-md" />
              </div>
            </div>
            <button disabled={creating} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex justify-center items-center gap-2">
              <Plus size={18} /> {creating ? 'Creating...' : 'Create Schedule'}
            </button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          {schedules.length === 0 ? (
            <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-500">
              No schedules yet. Create one to get started!
            </div>
          ) : (
            schedules.map(schedule => (
              <div key={schedule.id} className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{schedule.name}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5"><Clock size={16} /> {schedule.durationMinutes} mins</span>
                    <span className="flex items-center gap-1.5"><Calendar size={16} /> Mon-Fri, {schedule.startHour}-{schedule.endHour}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => copyLink(schedule.slug)}
                    className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 py-1.5 px-3 rounded-md transition-colors"
                  >
                    {copied === schedule.slug ? <span className="text-green-600 font-medium">Copied!</span> : <><Copy size={16} /> Copy Link</>}
                  </button>
                  <Link 
                    href={`/book/${schedule.slug}`} 
                    target="_blank"
                    className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md transition-colors"
                  >
                    <LinkIcon size={16} /> View Page
                  </Link>
                  <button 
                    onClick={() => handleDelete(schedule.id)}
                    className="flex items-center gap-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-md transition-colors"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
