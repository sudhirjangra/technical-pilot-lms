'use client';

import { GuardedLink } from '@/components/dashboard/guarded-link';

export function LessonBackLink({ href }: { href: string }) {
  return (
    <GuardedLink href={href} className="text-sm text-muted-foreground hover:underline">
      ← Course Progress
    </GuardedLink>
  );
}
