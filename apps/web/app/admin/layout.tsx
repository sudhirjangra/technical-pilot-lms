import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/sidebar';
import FollowCursor from '@repo/shadcn/follow-cursor';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="dashboard-shell flex min-h-dvh overflow-x-hidden flex-col md:flex-row">
      <FollowCursor color="oklch(0.55 0.16 160 / 0.16)" />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
