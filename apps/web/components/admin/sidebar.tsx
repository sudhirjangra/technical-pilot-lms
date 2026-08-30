'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@repo/shadcn/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@repo/shadcn/sheet';
import { Button } from '@repo/shadcn/button';
import { Menu, X } from '@repo/shadcn/lucide';
import { useState } from 'react';

const navItems = [
  { label: 'Courses', href: '/admin/courses' },
  { label: 'Categories', href: '/admin/categories' },
  { label: 'Students', href: '/admin/students' },
  { label: 'Sub-Admins', href: '/admin/sub-admins' },
  { label: 'Enrollments', href: '/admin/enrollments' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Doubt Sessions', href: '/admin/doubt-sessions' },
];

function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <Link href="/admin" className="text-lg font-bold mb-4 px-3 block">
        Admin Panel
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <Link href="/" className="px-3 py-2 text-sm text-muted-foreground hover:underline block">
          ← Back to site
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: drawer toggle */}
      <div className="md:hidden border-b bg-muted/30 p-4 sticky top-0 z-40">
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
      <aside className="hidden md:flex w-64 border-r bg-muted/30 p-4 flex-col gap-2 fixed left-0 top-0 h-dvh">
        <SidebarNav />
      </aside>
    </>
  );
}
