'use client';

import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isBefore, startOfDay, addMinutes, parse } from 'date-fns';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/bookings/${slug}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setSchedule(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!schedule) return <div className="min-h-screen flex items-center justify-center text-red-500">Schedule not found</div>;

  const days = Array.from({ length: 5 }).map((_, i) => addDays(currentWeek, i)); // Mon-Fri

  const getAvailableTimes = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return [];
    
    const times = [];
    let current = parse(schedule.startHour, 'HH:mm', date);
    const end = parse(schedule.endHour, 'HH:mm', date);

    while (isBefore(addMinutes(current, schedule.durationMinutes), end) || current.getTime() === end.getTime() - schedule.durationMinutes * 60000) {
      times.push(format(current, 'HH:mm'));
      current = addMinutes(current, schedule.durationMinutes);
    }
    return times;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setSubmitting(true);
    const startDateTime = parse(selectedTime, 'HH:mm', selectedDate);

    try {
      const res = await fetch('/api/bookings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: schedule.id,
          guestName: formData.name,
          guestEmail: formData.email,
          startTime: startDateTime.toISOString(),
        })
      });
      if (res.ok) {
        setSuccess(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            You're scheduled with {schedule.name} for {format(selectedDate!, 'EEEE, MMMM do')} at {selectedTime}.
            A calendar invite with the Google Meet link has been sent to {formData.email}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Left Side: Info */}
        <div className="bg-blue-50 w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-blue-100 flex flex-col">
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{schedule.name}</h1>
            <div className="flex items-center gap-3 text-gray-600 mb-3">
              <Clock size={20} className="text-blue-600" />
              <span className="font-medium">{schedule.durationMinutes} min meeting</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <CalendarIcon size={20} className="text-blue-600" />
              <span className="font-medium">Google Meet Video Call</span>
            </div>
            
            {selectedDate && selectedTime && (
              <div className="mt-8 p-4 bg-blue-100 rounded-xl text-blue-900">
                <p className="font-semibold text-sm uppercase tracking-wider mb-1">Selected Time</p>
                <p className="text-lg">{format(selectedDate, 'EEEE, MMMM do')}</p>
                <p className="text-xl font-bold mt-1">{selectedTime}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selection/Form */}
        <div className="w-full md:w-2/3 p-8">
          {!selectedTime ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Select a Date & Time</h2>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-2 mb-6">
                {days.map(day => (
                  <button
                    key={day.toISOString()}
                    onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedDate && isSameDay(selectedDate, day)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                    }`}
                  >
                    <div className="text-xs uppercase font-medium mb-1 opacity-80">{format(day, 'EEE')}</div>
                    <div className="text-xl font-bold">{format(day, 'd')}</div>
                  </button>
                ))}
              </div>

              {selectedDate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">
                    Available times for {format(selectedDate, 'MMMM do')}
                  </h3>
                  <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {getAvailableTimes(selectedDate).length === 0 ? (
                      <div className="col-span-3 text-center text-gray-500 py-4">No availability on this date.</div>
                    ) : (
                      getAvailableTimes(selectedDate).map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className="py-3 px-4 border border-blue-200 rounded-lg text-blue-700 font-medium hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          {time}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animation-fade-in">
              <button 
                onClick={() => setSelectedTime(null)}
                className="flex items-center gap-1 text-blue-600 font-medium mb-6 hover:underline"
              >
                <ChevronLeft size={16} /> Back to calendar
              </button>
              
              <h2 className="text-xl font-bold text-gray-800 mb-6">Enter your details</h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="jane@example.com"
                  />
                </div>
                
                <button
                  disabled={submitting}
                  className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-70 transition-all flex justify-center"
                >
                  {submitting ? 'Confirming Booking...' : 'Schedule Event'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
