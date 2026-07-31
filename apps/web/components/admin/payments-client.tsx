'use client';

import { Payment } from '@/server/admin/payments.server';
import { Badge } from '@repo/shadcn/badge';
import { Card } from '@repo/shadcn/card';

export function PaymentsClient({ payments }: { payments: Payment[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      {payments.length === 0 && <p className="text-muted-foreground">No payments yet.</p>}

      <div className="grid gap-3">
        {payments.map((p) => (
          <Card key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {p.profiles?.full_name ?? p.profiles?.email ?? 'Unknown'}
              </p>
              <p className="text-sm text-muted-foreground">
                {p.courses?.title ?? 'Unknown course'} • ₹{p.amount}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === 'completed' ? 'default' : p.status === 'failed' ? 'destructive' : 'secondary'}>
                {p.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
