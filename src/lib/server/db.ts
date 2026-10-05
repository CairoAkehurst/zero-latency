import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.json');

export interface Schedule {
  id: string;
  userId: string;
  name: string;
  slug: string;
  durationMinutes: number;
  availableDays: number[]; // 0=Sun, 1=Mon, etc.
  startHour: string; // e.g., "09:00"
  endHour: string; // e.g., "17:00"
  googleRefreshToken?: string; // Store for guest booking access
  googleAccessToken?: string;
}

export interface Booking {
  id: string;
  scheduleId: string;
  guestName: string;
  guestEmail: string;
  startTime: string; // ISO string
  eventId: string; // Google Calendar event ID
}

interface DbSchema {
  schedules: Schedule[];
  bookings: Booking[];
}

async function getDb(): Promise<DbSchema> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { schedules: [], bookings: [] };
  }
}

async function saveDb(db: DbSchema) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export const db = {
  getSchedules: async (userId?: string) => {
    const data = await getDb();
    if (userId) return data.schedules.filter(s => s.userId === userId);
    return data.schedules;
  },
  getScheduleBySlug: async (slug: string) => {
    const data = await getDb();
    return data.schedules.find(s => s.slug === slug);
  },
  getScheduleById: async (id: string) => {
    const data = await getDb();
    return data.schedules.find(s => s.id === id);
  },
  createSchedule: async (schedule: Schedule) => {
    const data = await getDb();
    data.schedules.push(schedule);
    await saveDb(data);
  },
  updateSchedule: async (id: string, updates: Partial<Schedule>) => {
    const data = await getDb();
    const index = data.schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      data.schedules[index] = { ...data.schedules[index], ...updates };
      await saveDb(data);
    }
  },
  deleteSchedule: async (id: string) => {
    const data = await getDb();
    data.schedules = data.schedules.filter(s => s.id !== id);
    await saveDb(data);
  },
  createBooking: async (booking: Booking) => {
    const data = await getDb();
    data.bookings.push(booking);
    await saveDb(data);
  },
  getBookings: async (scheduleId?: string) => {
    const data = await getDb();
    if (scheduleId) return data.bookings.filter(b => b.scheduleId === scheduleId);
    return data.bookings;
  }
};
