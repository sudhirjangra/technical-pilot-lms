'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Slot, createSlot, deleteSlot, cancelSlot } from '@/server/doubt-sessions.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { toast } from '@repo/shadcn/sonner';

export function DoubtSlotsClient({ slots }: { slots: Slot[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createSlot({
      date: fd.get('date') as string,
      start_time: fd.get('start_time') as string,
      end_time: fd.get('end_time') as string,
      duration_minutes: Number(fd.get('duration_minutes')),
      max_bookings: Number(fd.get('max_bookings')) || 1,
    });
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Slot created');
      setShowForm(false);
      router.refresh();
    }
  };

  const handleCancel = async (id: string) => {
    const result = await cancelSlot(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Slot cancelled');
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this slot?')) return;
    const result = await deleteSlot(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Slot deleted');
      router.refresh();
    }
  };

  const grouped = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doubt Sessions</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Create Slot'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <input name="date" type="date" required className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Start Time</label>
              <input name="start_time" type="time" required className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">End Time</label>
              <input name="end_time" type="time" required className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Duration (min)</label>
              <input name="duration_minutes" type="number" defaultValue={30} required className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Max Bookings</label>
              <input name="max_bookings" type="number" defaultValue={1} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {Object.keys(grouped).length === 0 && (
        <p className="text-muted-foreground">No slots created yet.</p>
      )}

      {Object.entries(grouped).sort().map(([date, dateSlots]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {new Date(date + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <div className="grid gap-3">
            {dateSlots.map((slot) => (
              <Card key={slot.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-mono text-sm">
                      {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">({slot.duration_minutes}m)</span>
                  </div>
                  <Badge variant={slot.status === 'available' ? 'default' : slot.status === 'full' ? 'secondary' : 'destructive'}>
                    {slot.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {slot.current_bookings}/{slot.max_bookings} booked
                  </span>
                </div>
                <div className="flex gap-2">
                  {slot.status === 'available' && (
                    <Button size="sm" variant="outline" onClick={() => handleCancel(slot.id)}>
                      Cancel
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(slot.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
