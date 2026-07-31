'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Slot, Booking, bookSlot, cancelBooking } from '@/server/doubt-sessions.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import { toast } from '@repo/shadcn/sonner';

export function StudentDoubtClient({ slots, bookings }: { slots: Slot[]; bookings: Booking[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const bookedSlotIds = new Set(
    bookings.filter((b) => b.status === 'confirmed').map((b) => b.slot_id),
  );

  const handleBook = async (slotId: string) => {
    setLoading(slotId);
    const result = await bookSlot(slotId);
    setLoading(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Session booked!');
      router.refresh();
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    setLoading(bookingId);
    const result = await cancelBooking(bookingId);
    setLoading(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Booking cancelled');
      router.refresh();
    }
  };

  return (
    <section className="min-h-dvh container py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Doubt Sessions</h1>
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
          ← Dashboard
        </Button>
      </div>

      <Tabs defaultValue="available">
        <TabsList>
          <TabsTrigger value="available">Available Slots ({slots.length})</TabsTrigger>
          <TabsTrigger value="bookings">My Bookings ({bookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4 space-y-3">
          {slots.length === 0 && <p className="text-muted-foreground">No upcoming slots available.</p>}
          {slots.map((slot) => (
            <Card key={slot.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {new Date(slot.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)} • {slot.duration_minutes}m
                  • {slot.current_bookings}/{slot.max_bookings} booked
                </p>
              </div>
              {bookedSlotIds.has(slot.id) ? (
                <Badge>Booked</Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleBook(slot.id)}
                  disabled={loading === slot.id}
                >
                  {loading === slot.id ? 'Booking...' : 'Book'}
                </Button>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4 space-y-3">
          {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
          {bookings.map((b) => (
            <Card key={b.id} className="p-4 flex items-center justify-between">
              <div>
                {b.doubt_slots && (
                  <>
                    <p className="font-medium">
                      {new Date(b.doubt_slots.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.doubt_slots.start_time.slice(0, 5)} – {b.doubt_slots.end_time.slice(0, 5)}
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'completed' ? 'secondary' : 'destructive'}>
                  {b.status}
                </Badge>
                {b.status === 'confirmed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancel(b.id)}
                    disabled={loading === b.id}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </section>
  );
}
