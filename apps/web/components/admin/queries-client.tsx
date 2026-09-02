'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { replyToQuery, type StudentQuery } from '@/server/student-queries.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Textarea } from '@repo/shadcn/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { toast } from '@repo/shadcn/sonner';
import { CheckCircle2, Clock, MessageSquare, Send, XCircle } from '@repo/shadcn/lucide';

const statusColors: Record<string, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  open: 'outline',
  answered: 'default',
  closed: 'secondary',
};

export function AdminQueriesClient({ queries }: { queries: StudentQuery[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<StudentQuery | null>(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return queries;
    return queries.filter((q) => q.status === filter);
  }, [queries, filter]);

  const counts = useMemo(() => ({
    all: queries.length,
    open: queries.filter((q) => q.status === 'open').length,
    answered: queries.filter((q) => q.status === 'answered').length,
    closed: queries.filter((q) => q.status === 'closed').length,
  }), [queries]);

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSubmitting(true);
    const result = await replyToQuery(selected.id, reply.trim());
    setSubmitting(false);
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to reply');
    } else {
      toast.success('Reply sent');
      setSelected(null);
      setReply('');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Student Queries</h1>
        <Badge variant="outline" className="text-sm">
          {counts.open} open
        </Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'open', 'answered', 'closed'] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter(s)}
            className="shrink-0 capitalize"
          >
            {s} ({counts[s]})
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-2 size-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">No queries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id} className="cursor-pointer transition-colors hover:ring-1 hover:ring-primary/30" onClick={() => { setSelected(q); setReply(q.admin_reply ?? ''); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{q.subject}</p>
                      <Badge variant={statusColors[q.status] ?? 'outline'} className="shrink-0 text-[10px] gap-0.5">
                        {q.status === 'open' && <Clock className="size-2.5" />}
                        {q.status === 'answered' && <CheckCircle2 className="size-2.5" />}
                        {q.status === 'closed' && <XCircle className="size-2.5" />}
                        {q.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{q.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>{q.profiles?.full_name ?? q.profiles?.email ?? 'Unknown student'}</span>
                      <span>{new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setReply(''); } }}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selected.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    From: {selected.profiles?.full_name ?? 'Unknown'} ({selected.profiles?.email ?? ''})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selected.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-sm whitespace-pre-wrap">{selected.body}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reply</label>
                  <Textarea
                    rows={4}
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleReply} disabled={submitting || !reply.trim()} className="gap-1.5">
                      <Send className="size-4" />
                      {submitting ? 'Sending...' : selected.status === 'answered' ? 'Update Reply' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
