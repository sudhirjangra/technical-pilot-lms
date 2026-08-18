import LogoIcon from '@/components/logo-icon';
import { APP_NAME } from '@repo/constants/app';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Top nav bar - only visible on small screens */}
      <header className="flex items-center justify-between px-6 py-4 lg:hidden border-b border-border/50">
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon width={28} height={28} />
          <span className="font-semibold text-sm">{APP_NAME}</span>
        </Link>
        <ModeSwitcher />
      </header>

      <div className="flex flex-1">
        {/* Left brand panel — hidden on mobile */}
        <aside className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col relative overflow-hidden bg-primary/5 dark:bg-primary/10 border-r border-border/50">
          {/* Decorative gradient blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl opacity-60" />
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/15 blur-3xl opacity-50" />
          </div>

          <div className="relative flex flex-col h-full p-10 z-10">
            {/* Logo + name */}
            <Link href="/" className="flex items-center gap-3 mb-auto">
              <LogoIcon width={38} height={38} />
              <span className="font-bold text-lg text-foreground">{APP_NAME}</span>
            </Link>

            {/* Hero text */}
            <div className="flex-1 flex flex-col justify-center gap-6 py-12">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight text-foreground">
                  Learn without
                  <br />
                  <span className="text-primary">limits.</span>
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
                  Access courses, video lectures, assignments and tests — all
                  in one structured learning platform.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  '📹 Video Lectures',
                  '📝 Assignments',
                  '🧪 Tests & Analytics',
                  '💬 Doubt Sessions',
                  '🎁 Referral Rewards',
                ].map((feat) => (
                  <span
                    key={feat}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-background/70 dark:bg-background/40 border border-border text-muted-foreground"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom quote */}
            <blockquote className="border-l-2 border-primary pl-4 mt-auto">
              <p className="text-sm text-muted-foreground italic">
                &ldquo;The beautiful thing about learning is that no one can take
                it away from you.&rdquo;
              </p>
              <cite className="text-xs text-muted-foreground/70 mt-1 block">
                — B.B. King
              </cite>
            </blockquote>
          </div>
        </aside>

        {/* Right form panel */}
        <main className="flex-1 flex flex-col">
          {/* Theme switcher — top-right, large screens only */}
          <div className="hidden lg:flex justify-end p-5">
            <ModeSwitcher />
          </div>

          <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-6">
            <div className="w-full max-w-md">{children}</div>
          </div>

          <footer className="text-center text-xs text-muted-foreground py-5 px-6">
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
