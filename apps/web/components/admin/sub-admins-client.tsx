'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SubAdmin,
  setPermissions,
  promoteUser,
  demoteUser,
} from '@/server/admin/permissions.server';
import { AdminUser } from '@/server/admin/users.server';
import {
  PERMISSION_GROUPS,
  PERMISSION_MAP,
  getPermissionLabel,
} from '@/lib/permission-groups';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { Checkbox } from '@repo/shadcn/checkbox';
import { toast } from '@repo/shadcn/sonner';
import {
  BookOpen,
  CheckCheck,
  CreditCard,
  FileCheck2,
  GraduationCap,
  HelpCircle,
  LineChart,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
} from '@repo/shadcn/lucide';
import { cn } from '@repo/shadcn/lib/utils';

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  courses: BookOpen,
  students: GraduationCap,
  assessments: FileCheck2,
  support: HelpCircle,
  finance: CreditCard,
  reports: LineChart,
};

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
  const [promoteRole, setPromoteRole] = useState<'sub_admin' | 'admin'>('sub_admin');

  const handlePromote = async () => {
    if (!promoteId) return;
    setLoading(true);
    const result = await promoteUser(promoteId, promoteRole);
    setLoading(false);
    if (result.error) toast.error(typeof result.error === 'string' ? result.error : 'Failed to promote user');
    else {
      toast.success(
        promoteRole === 'admin' ? 'User promoted to admin' : 'User promoted to sub-admin',
      );
      setPromoteId('');
      router.refresh();
    }
  };

  const handleChangeRole = async (userId: string, role: 'sub_admin' | 'admin') => {
    setLoading(true);
    const result = await promoteUser(userId, role);
    setLoading(false);
    if (result.error) toast.error(typeof result.error === 'string' ? result.error : 'Failed to change role');
    else {
      toast.success(`Role updated to ${role === 'admin' ? 'admin' : 'sub-admin'}`);
      router.refresh();
    }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm('Demote this user to student? All sub-admin privileges will be revoked.')) return;
    setLoading(true);
    const result = await demoteUser(userId);
    setLoading(false);
    if (result.error) toast.error(typeof result.error === 'string' ? result.error : 'Failed to demote user');
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
    if (result.error) toast.error(typeof result.error === 'string' ? result.error : 'Failed to update permissions');
    else {
      toast.success('Permissions updated successfully');
      setEditingId(null);
      router.refresh();
    }
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleGroup = (groupSlugs: string[]) => {
    const allSelected = groupSlugs.every((slug) => selectedPerms.includes(slug));
    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((p) => !groupSlugs.includes(p)));
    } else {
      setSelectedPerms((prev) => Array.from(new Set([...prev, ...groupSlugs])));
    }
  };

  const handleSelectAll = () => {
    const all = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.slug));
    setSelectedPerms(all);
  };

  const handleClearAll = () => {
    setSelectedPerms([]);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold">Sub-Admin & Role Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Delegate administrative operations to instructors and support personnel with fine-grained, module-level access controls.
        </p>
      </div>

      {/* Promote User Card */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <UserCheck className="size-4 text-primary" />
            Promote Student to Admin Team
          </CardTitle>
          <CardDescription className="text-xs">
            Select an existing student to grant sub-admin access or full administrative privileges.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={promoteId}
              onChange={(e) => setPromoteId(e.target.value)}
              className="flex-1 border rounded-md px-3 py-2 text-xs sm:text-sm bg-background h-9"
            >
              <option value="">Select a student account...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name ? `${s.full_name} (${s.email})` : s.email}
                </option>
              ))}
            </select>
            <select
              value={promoteRole}
              onChange={(e) => setPromoteRole(e.target.value as 'sub_admin' | 'admin')}
              className="border rounded-md px-3 py-2 text-xs sm:text-sm bg-background sm:w-44 h-9"
            >
              <option value="sub_admin">Role: Sub-Admin</option>
              <option value="admin">Role: Full Admin</option>
            </select>
            <Button size="sm" className="h-9 w-full sm:w-auto px-4" onClick={handlePromote} disabled={!promoteId || loading}>
              Promote User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Admins List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold">Active Administrative Staff</h2>
          <Badge variant="outline" className="text-xs">{subAdmins.length} Staff Member{subAdmins.length !== 1 ? 's' : ''}</Badge>
        </div>

        {subAdmins.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No sub-admins found. Promote a student account above to get started.
          </Card>
        )}

        {subAdmins.map((sa) => {
          const isFullAdmin = sa.role === 'admin';
          const userPerms = sa.permissions?.permissions ?? [];

          return (
            <Card key={sa.id} className="overflow-hidden">
              <CardHeader className="p-3 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm sm:text-base font-bold">
                        {sa.full_name || sa.email}
                      </CardTitle>
                      <Badge variant={isFullAdmin ? 'default' : 'secondary'} className="text-[10px] uppercase font-mono tracking-wider">
                        {isFullAdmin ? 'Full Administrator' : 'Sub-Admin'}
                      </Badge>
                      {!sa.is_active && (
                        <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{sa.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {!isFullAdmin && (
                      <Button
                        size="sm"
                        variant={editingId === sa.id ? 'secondary' : 'outline'}
                        className="h-8 px-2.5 text-xs gap-1.5"
                        onClick={() => editingId === sa.id ? setEditingId(null) : handleEditPerms(sa)}
                      >
                        <ShieldCheck className="size-3.5" />
                        {editingId === sa.id ? 'Close Permissions' : 'Edit Permissions'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      disabled={loading}
                      onClick={() => handleChangeRole(sa.id, isFullAdmin ? 'sub_admin' : 'admin')}
                    >
                      {isFullAdmin ? 'Switch to Sub-Admin' : 'Make Full Admin'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 px-2.5 text-xs gap-1"
                      disabled={loading}
                      onClick={() => handleDemote(sa.id)}
                    >
                      <UserX className="size-3.5" />
                      Demote
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* View Permissions Summary */}
              {editingId !== sa.id && (
                <CardContent className="p-3 sm:p-5 pt-0 border-t bg-muted/10">
                  {isFullAdmin ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
                      <ShieldCheck className="size-4 text-primary" />
                      Full administrator — Unrestricted platform access across all modules, settings, and billing.
                    </p>
                  ) : (
                    <div className="space-y-2 py-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Assigned Permissions ({userPerms.length}):</span>
                      </div>
                      {userPerms.length === 0 ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          No module permissions assigned yet. Click "Edit Permissions" to assign access.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {userPerms.map((permSlug) => {
                            const p = PERMISSION_MAP.get(permSlug);
                            return (
                              <Badge key={permSlug} variant="outline" className="text-[11px] py-0.5 px-2 bg-background/80">
                                {p?.label ?? permSlug}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}

              {/* Edit Permissions Panel */}
              {editingId === sa.id && !isFullAdmin && (
                <CardContent className="p-3 sm:p-6 border-t bg-muted/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b">
                    <div>
                      <h3 className="text-sm font-semibold">Configure Sub-Admin Permissions</h3>
                      <p className="text-xs text-muted-foreground">Check the operational capabilities this sub-admin is allowed to perform.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleSelectAll}>
                        <CheckCheck className="size-3 mr-1" />
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleClearAll}>
                        <RotateCcw className="size-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>

                  {/* Grouped Modules */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PERMISSION_GROUPS.map((group) => {
                      const Icon = GROUP_ICONS[group.id] ?? ShieldCheck;
                      const groupSlugs = group.permissions.map((p) => p.slug);
                      const isGroupAllSelected = groupSlugs.every((slug) => selectedPerms.includes(slug));
                      const isGroupPartiallySelected = groupSlugs.some((slug) => selectedPerms.includes(slug)) && !isGroupAllSelected;

                      return (
                        <div key={group.id} className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2 border-b pb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <Icon className="size-4" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-semibold">{group.name}</h4>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">{group.description}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => toggleGroup(groupSlugs)}
                            >
                              {isGroupAllSelected ? 'Uncheck All' : 'Select All'}
                            </Button>
                          </div>

                          <div className="space-y-2.5">
                            {group.permissions.map((perm) => {
                              const isChecked = selectedPerms.includes(perm.slug);
                              return (
                                <label
                                  key={perm.slug}
                                  className={cn(
                                    'flex items-start gap-2.5 p-2 rounded-md border text-left cursor-pointer transition-colors',
                                    isChecked ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border/60 hover:bg-muted/40'
                                  )}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => togglePerm(perm.slug)}
                                    className="mt-0.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-foreground">{perm.label}</p>
                                    <p className="text-[10px] text-muted-foreground leading-snug">{perm.description}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground font-mono">
                      {selectedPerms.length} permissions active
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs px-3" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" className="h-8 text-xs px-4" onClick={handleSavePerms} disabled={loading}>
                        {loading ? 'Saving…' : 'Save Permissions'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
