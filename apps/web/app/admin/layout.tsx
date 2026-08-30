import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/sidebar';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="flex min-h-dvh overflow-x-hidden flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-4 sm:p-6 overflow-auto md:ml-64">{children}</main>
    </div>
  );
}
