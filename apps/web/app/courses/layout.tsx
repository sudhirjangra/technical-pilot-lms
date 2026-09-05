import { auth } from '@/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { AviationRadarBackground } from '@/components/dashboard/radar-background';
import { APP_NAME } from '@repo/constants/app';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@repo/shadcn/sidebar';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default async function CoursesLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="relative min-h-dvh">
        <AviationRadarBackground />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  const sidebarState = (await cookies()).get('sidebar_state')?.value;

  return (
    <SidebarProvider defaultOpen={sidebarState !== 'false'} className="relative">
      <AviationRadarBackground />
      <DashboardSidebar />

      <SidebarInset className="flex min-h-dvh flex-col overflow-x-hidden relative z-10 bg-transparent">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <div className="min-w-0 flex-1">
            <Link href="/courses" className="hidden truncate text-sm font-semibold sm:block">
              {APP_NAME}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <ModeSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
