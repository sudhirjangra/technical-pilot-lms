'use client';

import { AdminUser } from '@/server/admin/users.server';
import { Badge } from '@repo/shadcn/badge';
import { Card } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { useState } from 'react';

export function StudentsClient({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState('');

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students & Users</h1>
        <span className="text-sm text-muted-foreground">{users.length} total</span>
      </div>

      <Input
        placeholder="Search by name, email, or role..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid gap-3">
        {filtered.length === 0 && <p className="text-muted-foreground">No users found.</p>}
        {filtered.map((user) => (
          <Card key={user.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{user.full_name ?? user.email}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
              <Badge variant={user.is_active ? 'default' : 'destructive'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
