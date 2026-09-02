'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export function ModeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const toggleTheme = React.useCallback(async () => {
    const nextTheme = isDark ? 'light' : 'dark';

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (!document.startViewTransition || prefersReducedMotion) {
      setTheme(nextTheme);
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => setTheme(nextTheme));
    }).ready;
  }, [isDark, setTheme]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-8 w-14 items-center rounded-full border bg-muted/50 p-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark ? 'translate-x-[22px]' : 'translate-x-0'
        }`}
      >
        <Sun
          className={`absolute h-4 w-4 text-amber-500 transition-all duration-300 ${
            isDark
              ? 'scale-0 rotate-90 opacity-0'
              : 'scale-100 rotate-0 opacity-100'
          }`}
        />
        <Moon
          className={`absolute h-4 w-4 text-blue-400 transition-all duration-300 ${
            isDark
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 -rotate-90 opacity-0'
          }`}
        />
      </span>
    </button>
  );
}
