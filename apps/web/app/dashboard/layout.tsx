import { auth } from '@/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { APP_NAME } from '@repo/constants/app';
import { Button } from '@repo/shadcn/button';

import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@repo/shadcn/sidebar';
import { Bell } from '@repo/shadcn/lucide';
import FollowCursor from '@repo/shadcn/follow-cursor';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';



export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const cookieStore = await cookies();
  const sidebarState = cookieStore.get('sidebar_state')?.value;
  const defaultOpen = sidebarState !== 'false';



  return (
    <SidebarProvider defaultOpen={defaultOpen} className="dashboard-shell">
      <FollowCursor color="oklch(0.55 0.16 160 / 0.16)" />
      <DashboardSidebar />

      <SidebarInset className="flex flex-col min-h-dvh overflow-x-hidden">
        {/* ── Topbar ── */}
        <header className="water-surface sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 rounded-none border-x-0 border-t-0 bg-background/70 px-4 backdrop-blur-md">
          {/* Sidebar toggle (mobile + desktop) */}
          <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />

          {/* Breadcrumb / app name */}
          <div className="flex-1 min-w-0">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-foreground truncate hidden sm:block"
            >
              {APP_NAME}
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notifications bell */}
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="size-4" />
              {/* Notification dot — can wire up later */}
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
              <span className="sr-only">Notifications</span>
            </Button>

            {/* Theme switcher */}
            <ModeSwitcher />
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
