import { auth } from '@/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { AviationRadarBackground } from '@/components/dashboard/radar-background';
import { APP_NAME } from '@repo/constants/app';

import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@repo/shadcn/sidebar';
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
    <SidebarProvider defaultOpen={defaultOpen} className="dashboard-shell relative">
      <FollowCursor color="oklch(0.55 0.16 160 / 0.16)" />
      <AviationRadarBackground />
      <DashboardSidebar />

      <SidebarInset className="flex flex-col min-h-dvh overflow-x-hidden relative z-10 bg-transparent">
        {/* ── Topbar ── */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-background/80 px-4 backdrop-blur-md">
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

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <ModeSwitcher />
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
