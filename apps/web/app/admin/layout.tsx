import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin/sidebar';
import { APP_NAME } from '@repo/constants/app';
import { Bell } from '@repo/shadcn/lucide';
import { Button } from '@repo/shadcn/button';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@repo/shadcn/sidebar';
import FollowCursor from '@repo/shadcn/follow-cursor';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/');
  }

  const cookieStore = await cookies();
  const sidebarState = cookieStore.get('sidebar_state')?.value;
  const defaultOpen = sidebarState !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="dashboard-shell">
      <FollowCursor color="oklch(0.55 0.16 160 / 0.16)" />
      <AdminSidebar />

      <SidebarInset className="flex flex-col min-h-dvh overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
          <div className="flex-1 min-w-0">
            <Link
              href="/admin"
              className="text-sm font-semibold text-foreground truncate hidden sm:block"
            >
              {APP_NAME} — Admin
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
              <span className="sr-only">Notifications</span>
            </Button>
            <ModeSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
