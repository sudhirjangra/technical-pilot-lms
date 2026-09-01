'use client';

import LogoIcon from '@/components/logo-icon';
import { removeSession } from '@/server/auth.server';
import { APP_NAME } from '@repo/constants/app';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/shadcn/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/shadcn/dropdown-menu';
import { cn } from '@repo/shadcn/lib/utils';
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ChevronsUpDown,
  ClipboardList,
  GraduationCap,
  LogOut,
  Settings,
  Trophy,
} from '@repo/shadcn/lucide';
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
  SidebarSeparator,
  useSidebar,
} from '@repo/shadcn/sidebar';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useState } from 'react';

const navGroups = [
  {
    group: 'Learning',
    items: [
      { label: 'My Courses', href: '/dashboard/courses', icon: BookOpen, exact: false },
      { label: 'Browse Courses', href: '/courses', icon: GraduationCap, exact: false },
      { label: 'My Attempts', href: '/dashboard/attempts', icon: ClipboardList, exact: false },
    ],
  },
  {
    group: 'Connect',
    items: [
      { label: 'Doubt Sessions', href: '/dashboard/doubt-sessions', icon: CalendarDays, exact: false },
      { label: 'Referrals', href: '/dashboard/referrals', icon: Trophy, exact: false },
    ],
  },
];

function NavGroup({
  group,
  items,
}: {
  group: string;
  items: (typeof navGroups)[0]['items'];
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
                  'group/item transition-colors w-full',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Link href={item.href} className="flex-1 min-w-0">
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      isActive
                        ? 'text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 group-hover/item:text-sidebar-accent-foreground',
                    )}
                  />
                  <span className="truncate">{item.label}</span>
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
  const { data: session } = useSession();
  const isCollapsed = state === 'collapsed';
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = session?.user;
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0] ?? 'U').toUpperCase();

  const logoSize = isCollapsed ? 28 : 32;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const token = user?.tokens?.session_token;
    if (token) {
      await removeSession({ session_token: token });
    }
    await signOut({ callbackUrl: '/auth/sign-in' });
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border overflow-hidden">
      <SidebarHeader className="border-b border-sidebar-border/50 px-3 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="shrink-0 transition-transform group-hover:scale-105">
            <LogoIcon width={logoSize} height={logoSize} className="transition-all duration-200" />
          </div>
          <span
            className={cn(
              'font-bold text-sm text-sidebar-foreground truncate transition-all duration-200 group-hover:text-primary',
              isCollapsed ? 'opacity-0 w-0' : 'opacity-100',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 py-3 no-scrollbar">
        {navGroups.map((group, i) => (
          <Fragment key={group.group}>
            {i > 0 && <SidebarSeparator />}
            <NavGroup group={group.group} items={group.items} />
          </Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={user?.full_name ?? user?.email ?? 'Account'}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
                    <AvatarImage src={user?.avatar_url ?? ''} alt={user?.full_name ?? ''} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                    <span className="truncate font-semibold">{user?.full_name ?? 'Account'}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-sidebar-foreground/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={4}
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 max-w-[calc(var(--sidebar-width)-1rem)] rounded-lg"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.avatar_url ?? ''} alt={user?.full_name ?? ''} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.full_name ?? 'Account'}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <BadgeCheck className="size-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=settings">
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  className="bg-red-500/10 text-destructive text-red-400 hover:bg-red-500/20 focus:bg-red-500/25 focus:text-red-600"
                >
                  <LogOut className="size-4" />
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
