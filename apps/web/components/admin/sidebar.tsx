'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@repo/shadcn/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@repo/shadcn/sheet';
import { Button } from '@repo/shadcn/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/shadcn/tooltip';
import { BookOpen, CalendarDays, ChartNoAxesCombined, ChevronsLeft, ChevronsRight, CreditCard, FolderKanban, GraduationCap, LayoutDashboard, Menu, ShieldCheck, Users } from '@repo/shadcn/lucide';
import { signOut } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Courses', href: '/admin/courses', icon: BookOpen },
  { label: 'Categories', href: '/admin/categories', icon: FolderKanban },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Sub-Admins', href: '/admin/sub-admins', icon: ShieldCheck },
  { label: 'Enrollments', href: '/admin/enrollments', icon: GraduationCap },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Doubt Sessions', href: '/admin/doubt-sessions', icon: CalendarDays },
];

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/admin"
        className={cn(
          'water-surface flex items-center gap-3 rounded-lg p-3 mb-5 text-sm font-bold',
          collapsed && 'justify-center px-0',
        )}
      >
        <ChartNoAxesCombined className="size-5 text-primary shrink-0" />
        {!collapsed && <span>Admin workspace</span>}
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
          if (!collapsed) return link;
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <div className="water-surface mt-auto rounded-lg p-2">
        <Button
          variant="ghost"
          className={cn(
            'w-full text-sm text-muted-foreground hover:text-foreground',
            collapsed ? 'justify-center px-0' : 'justify-start px-3',
          )}
          onClick={() => void signOut({ callbackUrl: '/auth/sign-in' })}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : 'Sign out'}
        </Button>
      </div>
    </>
  );
}

function AdminSidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: drawer toggle */}
      <div className="water-surface md:hidden border-b p-4 sticky top-0 z-40 rounded-none">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SheetHeader className="px-4 pt-4 pb-2 border-b">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
              <SidebarNav />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: persistent sidebar */}
      <aside
        className={cn(
          'water-surface hidden md:flex border-r p-4 flex-col gap-2 fixed left-0 top-0 h-dvh rounded-none border-y-0 border-l-0 transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <SidebarNav collapsed={collapsed} />
        <Button
          variant="outline"
          size="icon"
          className="water-surface absolute -right-3 top-6 hidden md:flex h-6 w-6 rounded-full shadow"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </Button>
      </aside>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === '1') setCollapsed(true);
    setHydrated(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <>
      <AdminSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <main
        className={cn(
          'flex-1 p-4 sm:p-6 overflow-auto transition-[margin] duration-200',
          hydrated && collapsed ? 'md:ml-16' : 'md:ml-64',
        )}
      >
        {children}
      </main>
    </>
  );
}
