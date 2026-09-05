import HeroAviation from '@/components/hero-aviation';
import LogoIcon from '@/components/logo-icon';
import FollowCursor from '@repo/shadcn/follow-cursor';
import { APP_NAME } from '@repo/constants/app';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-muted/60 dark:bg-neutral-950">
      <FollowCursor color="oklch(0.55 0.16 160 / 0.18)" />
      {/* Top nav bar - only visible on small screens */}
      <header className="flex items-center justify-between px-6 py-4 lg:hidden border-b border-border/50 bg-background/80 backdrop-blur-md z-20">
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon width={28} height={28} />
          <span className="font-semibold text-sm">{APP_NAME}</span>
        </Link>
        <ModeSwitcher />
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Continuous technical grid pattern spanning both panels */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,120,120,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,120,120,0.08)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* Left brand panel — dominant ratio on large screens (58% - 65%), seamless with right panel */}
        <aside className="hidden lg:flex lg:w-[58%] xl:w-[62%] 2xl:w-[65%] shrink-0 flex-col justify-between relative z-10">
          <div className="relative flex flex-col h-full p-8 xl:p-12 z-10">
            {/* Logo + name */}
            <Link href="/" className="flex items-center gap-3">
              <LogoIcon width={36} height={36} />
              <span className="font-bold text-lg tracking-tight text-foreground">{APP_NAME}</span>
            </Link>

            {/* Aviation Animated Visual from Root */}
            <div className="my-auto flex flex-col items-center justify-center py-6">
              <div className="w-full max-w-[320px] xl:max-w-[400px] 2xl:max-w-[440px]">
                <HeroAviation />
              </div>

              {/* Tagline and description */}
              <div className="text-center space-y-2.5 mt-6 max-w-md xl:max-w-lg">
                <h1 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold tracking-tight text-foreground">
                  Train Like a <span className="text-primary">Commercial Pilot</span>
                </h1>
                <p className="text-muted-foreground text-xs xl:text-sm leading-relaxed">
                  DGCA & airline ground school training with structured lectures, question banks, and live doubt sessions.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-md">
                {[
                  '✈️ ATPL & CPL',
                  '🧭 Air Navigation',
                  '🌦️ Meteorology',
                  '⚡ Tech General',
                  '📝 Test Series',
                  '🎯 DGCA Analytics',
                ].map((feat) => (
                  <span
                    key={feat}
                    className="text-[11px] xl:text-xs font-medium px-3 py-1 rounded-full bg-background/70 dark:bg-neutral-900/80 border border-border/80 text-foreground/80 shadow-2xs"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom status badge */}
            <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                STATUS: GROUND OPS ACTIVE
              </span>
              <span className="font-mono text-[11px]">RADAR ONLINE</span>
            </div>
          </div>
        </aside>

        {/* Right form panel — compact, focused sidebar ratio sharing the exact same background */}
        <main className="flex-1 lg:w-[42%] xl:w-[38%] 2xl:w-[35%] flex flex-col min-w-0 relative z-10">
          {/* Theme switcher — top-right, large screens only */}
          <div className="hidden lg:flex justify-end p-5 relative z-10">
            <ModeSwitcher />
          </div>

          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 overflow-y-auto relative z-10">
            <div className="w-full max-w-sm sm:max-w-[360px] xl:max-w-[380px]">{children}</div>
          </div>

          <footer className="flex-shrink-0 text-center text-xs text-muted-foreground py-4 px-6 border-t border-border/40 relative z-10 bg-transparent">
            By continuing, you agree to our{' '}
            <Link href="#" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </footer>
        </main>
      </div>
    </div>
  );
}
