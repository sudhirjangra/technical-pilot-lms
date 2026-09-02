'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Slot, Booking, bookSlot, cancelBooking } from '@/server/doubt-sessions.server';
import { submitQuery, type StudentQuery } from '@/server/student-queries.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { Input } from '@repo/shadcn/input';
import { Textarea } from '@repo/shadcn/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import { toast } from '@repo/shadcn/sonner';
import { CheckCircle2, Clock, MessageSquare, Send } from '@repo/shadcn/lucide';

export function StudentDoubtClient({
  slots,
  bookings,
  queries,
}: {
  slots: Slot[];
  bookings: Booking[];
  queries: StudentQuery[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [queryBody, setQueryBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmitQuery = async () => {
    if (!subject.trim() || !queryBody.trim()) {
      toast.error('Please fill in both subject and your question');
      return;
    }
    setSubmitting(true);
    const result = await submitQuery(subject.trim(), queryBody.trim());
    setSubmitting(false);
    if (result.error) toast.error(typeof result.error === 'string' ? result.error : 'Failed to submit query');
    else {
      toast.success('Query submitted successfully');
      setSubject('');
      setQueryBody('');
      router.refresh();
    }
  };

  return (
    <section className="min-h-dvh container py-6 sm:py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Doubt Sessions & Queries</h1>

      <Tabs defaultValue="available">
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="available">Available Slots ({slots.length})</TabsTrigger>
          <TabsTrigger value="bookings">My Bookings ({bookings.length})</TabsTrigger>
          <TabsTrigger value="queries" className="gap-1">
            <MessageSquare className="size-3.5" />
            My Queries ({queries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4 space-y-3">
          {slots.length === 0 && <p className="text-muted-foreground">No upcoming slots available.</p>}
          {slots.map((slot) => (
            <Card key={slot.id} className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {slot.topic && <p className="font-medium text-sm">{slot.topic}</p>}
                <p className={slot.topic ? 'text-sm text-muted-foreground' : 'font-medium'}>
                  {new Date(slot.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)} • {slot.duration_minutes}m
                  • {slot.current_bookings}/{slot.max_bookings} booked
                </p>
                {slot.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{slot.description}</p>
                )}
              </div>
              <div className="shrink-0">
                {bookedSlotIds.has(slot.id) ? (
                  <Badge>Booked</Badge>
                ) : (
                  <Button size="sm" onClick={() => handleBook(slot.id)} disabled={loading === slot.id}>
                    {loading === slot.id ? 'Booking...' : 'Book'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4 space-y-3">
          {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
          {bookings.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {b.doubt_slots?.topic && <p className="font-medium text-sm">{b.doubt_slots.topic}</p>}
                  {b.doubt_slots && (
                    <>
                      <p className={b.doubt_slots.topic ? 'text-sm text-muted-foreground' : 'font-medium'}>
                        {new Date(b.doubt_slots.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {b.doubt_slots.start_time.slice(0, 5)} – {b.doubt_slots.end_time.slice(0, 5)}
                      </p>
                      {b.doubt_slots.meeting_link && (
                        <a href={b.doubt_slots.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1 inline-block">
                          Join Meeting &rarr;
                        </a>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'completed' ? 'secondary' : 'destructive'}>
                    {b.status}
                  </Badge>
                  {b.status === 'confirmed' && (
                    <Button size="sm" variant="outline" onClick={() => handleCancel(b.id)} disabled={loading === b.id}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="queries" className="mt-4 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ask a Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Textarea
                placeholder="Describe your question in detail..."
                rows={4}
                value={queryBody}
                onChange={(e) => setQueryBody(e.target.value)}
              />
              <Button onClick={handleSubmitQuery} disabled={submitting} className="gap-1.5">
                <Send className="size-4" />
                {submitting ? 'Submitting...' : 'Submit Query'}
              </Button>
            </CardContent>
          </Card>

          {queries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No queries submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {queries.map((q) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-medium text-sm">{q.subject}</h3>
                    <Badge variant={q.status === 'answered' ? 'default' : q.status === 'closed' ? 'secondary' : 'outline'} className="shrink-0 gap-1">
                      {q.status === 'answered' && <CheckCircle2 className="size-3" />}
                      {q.status === 'open' && <Clock className="size-3" />}
                      {q.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{q.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {q.admin_reply && (
                    <div className="mt-3 rounded-md border bg-muted/50 p-3">
                      <p className="text-xs font-medium text-primary mb-1">Admin Reply</p>
                      <p className="text-sm">{q.admin_reply}</p>
                      {q.replied_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(q.replied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
