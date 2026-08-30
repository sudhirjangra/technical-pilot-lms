'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Slot, createSlot, deleteSlot, cancelSlot, updateSlot } from '@/server/doubt-sessions.server';
import { Button } from '@repo/shadcn/button';
import { Card } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { toast } from '@repo/shadcn/sonner';
import { Input } from '@repo/shadcn/input';
import { Textarea } from '@repo/shadcn/textarea';
import { Label } from '@repo/shadcn/label';

type CreateFormState = {
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_bookings: number;
  topic: string;
  description: string;
  meeting_link: string;
};

type EditFormState = {
  topic: string;
  description: string;
  meeting_link: string;
};

const emptyForm = (): CreateFormState => ({
  date: '',
  start_time: '',
  end_time: '',
  duration_minutes: 30,
  max_bookings: 1,
  topic: '',
  description: '',
  meeting_link: '',
});

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function DoubtSlotsClient({ slots }: { slots: Slot[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateFormState>(emptyForm());
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ topic: '', description: '', meeting_link: '' });
  const [editLoading, setEditLoading] = useState(false);

  function handleStartTimeChange(val: string) {
    setForm(prev => {
      const newForm = { ...prev, start_time: val };
      if (val && prev.duration_minutes > 0) {
        const startMins = timeToMinutes(val);
        newForm.end_time = minutesToTime(startMins + prev.duration_minutes);
      }
      return newForm;
    });
  }

  function handleEndTimeChange(val: string) {
    setForm(prev => {
      const newForm = { ...prev, end_time: val };
      if (prev.start_time && val) {
        const startMins = timeToMinutes(prev.start_time);
        const endMins = timeToMinutes(val);
        const diff = endMins - startMins;
        if (diff > 0) newForm.duration_minutes = diff;
      }
      return newForm;
    });
  }

  function handleDurationChange(val: number) {
    setForm(prev => {
      const newForm = { ...prev, duration_minutes: val };
      if (prev.start_time && val > 0) {
        const startMins = timeToMinutes(prev.start_time);
        newForm.end_time = minutesToTime(startMins + val);
      }
      return newForm;
    });
  }

  const handleCreate = async () => {
    setLoading(true);
    const result = await createSlot({
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      duration_minutes: form.duration_minutes,
      max_bookings: form.max_bookings || 1,
      topic: form.topic || undefined,
      description: form.description || undefined,
      meeting_link: form.meeting_link || undefined,
    });
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Slot created');
      setShowForm(false);
      setForm(emptyForm());
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
    if (!confirm('Delete this slot? All active bookings will be cancelled.')) return;
    const result = await deleteSlot(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Slot deleted');
      router.refresh();
    }
  };

  const openEdit = (slot: Slot) => {
    setEditingSlotId(slot.id);
    setEditForm({
      topic: slot.topic ?? '',
      description: slot.description ?? '',
      meeting_link: slot.meeting_link ?? '',
    });
  };

  const handleEdit = async (id: string) => {
    setEditLoading(true);
    const result = await updateSlot(id, {
      topic: editForm.topic || undefined,
      description: editForm.description || undefined,
      meeting_link: editForm.meeting_link || undefined,
    });
    setEditLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Slot updated');
      setEditingSlotId(null);
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
        <Button onClick={() => { setShowForm(!showForm); setForm(emptyForm()); }}>
          {showForm ? 'Cancel' : '+ Create Slot'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={e => handleStartTimeChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={e => handleEndTimeChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={e => handleDurationChange(Number(e.target.value))}
                min={5}
                max={180}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Max Bookings</Label>
              <Input
                type="number"
                value={form.max_bookings}
                onChange={e => setForm(prev => ({ ...prev, max_bookings: Number(e.target.value) }))}
                min={1}
                max={50}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Topic</Label>
              <Input
                type="text"
                placeholder="e.g. Chapter 3 Doubts"
                value={form.topic}
                onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label>Meeting Link</Label>
              <Input
                type="url"
                placeholder="https://meet.google.com/..."
                value={form.meeting_link}
                onChange={e => setForm(prev => ({ ...prev, meeting_link: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional details about this session..."
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="col-span-2 md:col-span-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm()); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading || !form.date || !form.start_time || !form.end_time}>
                {loading ? 'Creating...' : 'Create Slot'}
              </Button>
            </div>
          </div>
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
              <Card key={slot.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm">
                        {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                      </span>
                      <span className="text-xs text-muted-foreground">({slot.duration_minutes}m)</span>
                      <Badge variant={slot.status === 'available' ? 'default' : slot.status === 'full' ? 'secondary' : 'destructive'}>
                        {slot.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {slot.current_bookings}/{slot.max_bookings} booked
                      </span>
                    </div>
                    {slot.topic && (
                      <p className="text-sm font-medium mt-1">{slot.topic}</p>
                    )}
                    {slot.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{slot.description}</p>
                    )}
                    {slot.meeting_link && (
                      <a
                        href={slot.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-block truncate max-w-xs"
                      >
                        {slot.meeting_link}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => editingSlotId === slot.id ? setEditingSlotId(null) : openEdit(slot)}>
                      {editingSlotId === slot.id ? 'Close' : 'Edit'}
                    </Button>
                    {slot.status === 'available' && (
                      <Button size="sm" variant="outline" onClick={() => handleCancel(slot.id)}>
                        Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(slot.id)}>
                      Delete
                    </Button>
                  </div>
                </div>

                {editingSlotId === slot.id && (
                  <div className="mt-4 pt-4 border-t grid gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Topic</Label>
                        <Input
                          value={editForm.topic}
                          onChange={e => setEditForm(prev => ({ ...prev, topic: e.target.value }))}
                          placeholder="Session topic"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Meeting Link</Label>
                        <Input
                          type="url"
                          value={editForm.meeting_link}
                          onChange={e => setEditForm(prev => ({ ...prev, meeting_link: e.target.value }))}
                          placeholder="https://meet.google.com/..."
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description..."
                        rows={2}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingSlotId(null)}>
                        Discard
                      </Button>
                      <Button size="sm" onClick={() => handleEdit(slot.id)} disabled={editLoading}>
                        {editLoading ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
