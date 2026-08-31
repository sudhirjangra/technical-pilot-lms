'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SubAdmin,
  setPermissions,
  promoteUser,
  demoteUser,
} from '@/server/admin/permissions.server';
import { AdminUser } from '@/server/admin/users.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { Checkbox } from '@repo/shadcn/checkbox';
import { toast } from '@repo/shadcn/sonner';

export function SubAdminsClient({
  subAdmins,
  allPermissions,
  students,
}: {
  subAdmins: SubAdmin[];
  allPermissions: string[];
  students: AdminUser[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [promoteId, setPromoteId] = useState('');

  const handlePromote = async () => {
    if (!promoteId) return;
    setLoading(true);
    const result = await promoteUser(promoteId);
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('User promoted to sub-admin');
      setPromoteId('');
      router.refresh();
    }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm('Demote this sub-admin to student? All permissions will be revoked.')) return;
    setLoading(true);
    const result = await demoteUser(userId);
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('User demoted to student');
      router.refresh();
    }
  };

  const handleEditPerms = (sa: SubAdmin) => {
    setEditingId(sa.id);
    setSelectedPerms(sa.permissions?.permissions ?? []);
  };

  const handleSavePerms = async () => {
    if (!editingId) return;
    setLoading(true);
    const result = await setPermissions(editingId, selectedPerms);
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Permissions updated');
      setEditingId(null);
      router.refresh();
    }
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Sub-Admin Management</h1>
        <p className="text-sm text-muted-foreground">
          Sub-admins can manage enrollment, course content, doubt sessions, and student records
          within the permissions assigned below. They cannot change platform-wide roles, billing,
          or global admin settings unless an administrator explicitly grants those permissions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promote Student to Sub-Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <select
              value={promoteId}
              onChange={(e) => setPromoteId(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name ?? s.email} ({s.email})
                </option>
              ))}
            </select>
            <Button onClick={handlePromote} disabled={!promoteId || loading}>
              Promote
            </Button>
          </div>
        </CardContent>
      </Card>

      {subAdmins.length === 0 && <p className="text-muted-foreground">No sub-admins yet.</p>}

      {subAdmins.map((sa) => (
        <Card key={sa.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{sa.full_name ?? sa.email}</CardTitle>
                <p className="text-sm text-muted-foreground">{sa.email}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEditPerms(sa)}>
                  Edit Permissions
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDemote(sa.id)}>
                  Demote
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {sa.permissions?.permissions.length ? (
                sa.permissions.permissions.map((p) => (
                  <Badge key={p} variant="secondary">{p}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No permissions assigned</span>
              )}
            </div>
          </CardContent>

          {editingId === sa.id && (
            <CardContent className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Select permissions:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {allPermissions.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedPerms.includes(perm)}
                      onCheckedChange={() => togglePerm(perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSavePerms} disabled={loading || selectedPerms.length === 0}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
