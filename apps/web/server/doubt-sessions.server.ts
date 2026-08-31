'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib';
import { z } from 'zod';

const SlotSchema = z.object({
  id: z.string(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  duration_minutes: z.number(),
  max_bookings: z.number(),
  current_bookings: z.number(),
  status: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  topic: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  meeting_link: z.string().nullable().optional(),
});

const BookingSchema = z.object({
  id: z.string(),
  slot_id: z.string(),
  student_id: z.string(),
  status: z.string(),
  booked_at: z.string(),
  cancelled_at: z.string().nullable(),
  meeting_link: z.string().nullable(),
  doubt_slots: z.object({
    id: z.string(), date: z.string(), start_time: z.string(),
    end_time: z.string(), duration_minutes: z.number(), status: z.string(),
    topic: z.string().nullable().optional(),
    meeting_link: z.string().nullable().optional(),
  }).nullable(),
});

export type Slot = z.infer<typeof SlotSchema>;
export type Booking = z.infer<typeof BookingSchema>;

async function headers() {
  const session = await auth();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
  };
}

export async function getAdminSlots(date?: string): Promise<Slot[]> {
  const h = await headers();
  const qs = date ? `?date=${date}` : '';
  const [error, data] = await safeFetch(z.array(SlotSchema), `/doubt-sessions/slots${qs}`, {
    headers: h, cache: 'no-store',
  });
  if (error) return [];
  return data!;
}

export async function createSlot(payload: {
  date: string; start_time: string; end_time: string;
  duration_minutes: number; max_bookings?: number;
  topic?: string; description?: string; meeting_link?: string;
}) {
  const h = await headers();
  const [error, data] = await safeFetch(SlotSchema, '/doubt-sessions/slots', {
    method: 'POST', headers: h, cache: 'no-store', body: JSON.stringify(payload),
  });
  if (error) return { error };
  return { data: data! };
}

export async function updateSlot(id: string, payload: {
  status?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  max_bookings?: number;
  meeting_link?: string;
  topic?: string;
  description?: string;
}) {
  const h = await headers();
  const [error, data] = await safeFetch(SlotSchema, `/doubt-sessions/slots/${id}`, {
    method: 'PATCH', headers: h, cache: 'no-store',
    body: JSON.stringify(payload),
  });
  if (error) return { error };
  return { data: data! };
}

export async function deleteSlot(id: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/doubt-sessions/slots/${id}`, {
    method: 'DELETE', headers: h, cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}

export async function cancelSlot(id: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/doubt-sessions/slots/${id}`, {
    method: 'PATCH', headers: h, cache: 'no-store',
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (error) return { error };
  return { success: true };
}

export async function getUpcomingSlots(): Promise<Slot[]> {
  const session = await auth();
  const [error, data] = await safeFetch(z.array(SlotSchema), '/doubt-sessions/upcoming', {
    headers: { Authorization: `Bearer ${session?.user?.tokens.access_token}` },
    cache: 'no-store',
  });
  if (error) return [];
  return data!;
}

export async function bookSlot(slotId: string) {
  const h = await headers();
  const [error, data] = await safeFetch(z.any(), '/doubt-sessions/book', {
    method: 'POST', headers: h, cache: 'no-store',
    body: JSON.stringify({ slot_id: slotId }),
  });
  if (error) return { error };
  return { data: data! };
}

export async function getMyBookings(): Promise<Booking[]> {
  const session = await auth();
  const [error, data] = await safeFetch(z.array(BookingSchema), '/doubt-sessions/my-bookings', {
    headers: { Authorization: `Bearer ${session?.user?.tokens.access_token}` },
    cache: 'no-store',
  });
  if (error) return [];
  return data!;
}

export async function cancelBooking(bookingId: string) {
  const h = await headers();
  const [error] = await safeFetch(z.any(), `/doubt-sessions/bookings/${bookingId}/cancel`, {
    method: 'POST', headers: h, cache: 'no-store',
  });
  if (error) return { error };
  return { success: true };
}
