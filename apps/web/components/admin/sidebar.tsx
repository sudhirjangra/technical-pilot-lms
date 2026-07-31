'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@repo/shadcn/lib/utils';

const navItems = [
  { label: 'Courses', href: '/admin/courses' },
  { label: 'Categories', href: '/admin/categories' },
  { label: 'Students', href: '/admin/students' },
  { label: 'Sub-Admins', href: '/admin/sub-admins' },
  { label: 'Enrollments', href: '/admin/enrollments' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Doubt Sessions', href: '/admin/doubt-sessions' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/30 p-4 flex flex-col gap-2">
      <Link href="/admin" className="text-lg font-bold mb-4 px-3">
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
        <Link href="/" className="px-3 py-2 text-sm text-muted-foreground hover:underline">
          ← Back to site
        </Link>
      </div>
    </aside>
  );
}
