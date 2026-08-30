'use client';

import { OrbitalSpinner } from '@repo/shadcn/orbital-spinner';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function GlobalRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, searchParams.toString()]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card/95 px-6 py-5 shadow-lg">
        <OrbitalSpinner className="size-12" />
        <p className="text-sm font-medium text-foreground">Loading...</p>
      </div>
    </div>
  );
}
