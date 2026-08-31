'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@repo/shadcn/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@repo/shadcn/sheet';
import { Button } from '@repo/shadcn/button';
import { BookOpen, CalendarDays, ChartNoAxesCombined, CreditCard, FolderKanban, GraduationCap, LayoutDashboard, Menu, ShieldCheck, Users } from '@repo/shadcn/lucide';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

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

function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <Link href="/admin" className="water-surface flex items-center gap-3 rounded-lg p-3 mb-5 text-sm font-bold">
        <ChartNoAxesCombined className="size-5 text-primary" />
        <span>Admin workspace</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
          );
        })}
      </nav>
      <div className="water-surface mt-auto rounded-lg p-2">
        <Button
          variant="ghost"
          className="w-full justify-start px-3 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => void signOut({ callbackUrl: '/auth/sign-in' })}
        >
          Sign out
        </Button>
      </div>
    </>
  );
}

export function AdminSidebar() {
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
      <aside className="water-surface hidden md:flex w-64 border-r p-4 flex-col gap-2 fixed left-0 top-0 h-dvh rounded-none border-y-0 border-l-0">
        <SidebarNav />
      </aside>
    </>
  );
}
