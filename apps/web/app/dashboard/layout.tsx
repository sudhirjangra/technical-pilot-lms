import { auth } from '@/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { GuardedLink } from '@/components/dashboard/guarded-link';
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

export const dynamic = 'force-dynamic';

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

      <SidebarInset className="flex flex-col h-dvh max-h-dvh overflow-hidden relative z-10 bg-transparent">
        {/* ── Topbar ── */}
        <header className="sticky top-0 z-30 flex h-14 min-h-14 max-h-14 shrink-0 box-border items-center gap-3 border-b border-sidebar-border bg-background/80 px-4 backdrop-blur-md">
          {/* Sidebar toggle (mobile + desktop) */}
          <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />

          {/* Breadcrumb / app name */}
          <div className="flex-1 min-w-0">
            <GuardedLink
              href="/dashboard"
              className="text-sm font-semibold text-foreground truncate hidden sm:block"
            >
              {APP_NAME}
            </GuardedLink>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <ModeSwitcher />
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">{children}</main>
      </SidebarInset>

    </SidebarProvider>
  );
}
