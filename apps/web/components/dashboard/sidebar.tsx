'use client';

import LogoIcon from '@/components/logo-icon';
import { APP_NAME } from '@repo/constants/app';
import { cn } from '@repo/shadcn/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@repo/shadcn/sidebar';
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Trophy,
  User,
} from '@repo/shadcn/lucide';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const studentNavItems = [
  {
    group: 'Learning',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: 'My Courses',
        href: '/dashboard/courses',
        icon: BookOpen,
        exact: false,
      },
      {
        label: 'Browse Courses',
        href: '/courses',
        icon: GraduationCap,
        exact: false,
      },
    ],
  },
  {
    group: 'Connect',
    items: [
      {
        label: 'Doubt Sessions',
        href: '/dashboard/doubt-sessions',
        icon: CalendarDays,
        exact: false,
      },
      {
        label: 'Referrals',
        href: '/dashboard/referrals',
        icon: Trophy,
        exact: false,
      },
    ],
  },
  {
    group: 'Account',
    items: [
      {
        label: 'Profile',
        href: '/profile',
        icon: User,
        exact: false,
      },
      {
        label: 'Settings',
        href: '/profile',
        icon: Settings,
        exact: false,
      },
    ],
  },
];

function NavGroup({
  group,
  items,
}: {
  group: string;
  items: (typeof studentNavItems)[0]['items'];
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <SidebarGroup>
      {!isCollapsed && (
        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-1">
          {group}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== '/';
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.label}
                className={cn(
                  'group/item transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Link href={item.href}>
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 group-hover/item:text-sidebar-accent-foreground',
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function DashboardSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header: Logo + app name */}
      <SidebarHeader className="border-b border-sidebar-border/50 px-3 py-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="shrink-0">
            <LogoIcon width={32} height={32} />
          </div>
          <span
            className={cn(
              'font-bold text-sm text-sidebar-foreground truncate transition-all duration-200',
              isCollapsed ? 'opacity-0 w-0' : 'opacity-100',
            )}
          >
            {APP_NAME}
          </span>
        </div>
      </SidebarHeader>

      {/* Nav groups */}
      <SidebarContent className="gap-1 py-3 overflow-y-auto">
        {studentNavItems.map((group) => (
          <NavGroup key={group.group} group={group.group} items={group.items} />
        ))}
      </SidebarContent>

        {/* Footer: Sign out and Profile */}
        <SidebarFooter className="border-t border-sidebar-border/50 p-3">
          <SidebarMenu>
            {/* Profile shortcut */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Profile" className="text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground">
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="size-4 shrink-0" />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Sign Out */}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sign Out"
                className="text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/auth/sign-in' })}
              >
                <LogOut className="size-4 shrink-0" />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
