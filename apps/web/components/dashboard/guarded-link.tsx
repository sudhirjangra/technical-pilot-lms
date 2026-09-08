'use client';

/**
 * GuardedLink - a drop-in replacement for Next.js <Link> that intercepts
 * navigation when a test/assignment is in progress.
 *
 * When `isTestActive()` returns true, clicking the link prompts the user
 * with a confirmation dialog. If confirmed, it executes the registered
 * exit callback (saving current answers/time spent), clears the guard,
 * and navigates to the destination href.
 *
 * If no test is active, it behaves exactly like Next.js <Link>.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ComponentProps, useCallback } from 'react';
import { isTestActive, getExitConfirmCallback, clearTestGuard } from '@/lib/test-guard';

type GuardedLinkProps = ComponentProps<typeof Link>;

export function GuardedLink({ onClick, href, ...props }: GuardedLinkProps) {
  const router = useRouter();

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isTestActive()) {
        e.preventDefault();
        const confirmed = window.confirm(
          'You have an assessment in progress.\n\nLeaving now will save your answers and pause the assessment. You can resume or submit it later from the lesson page.\n\nDo you want to exit the assessment?',
        );
        if (confirmed) {
          const cb = getExitConfirmCallback();
          if (cb) {
            try {
              await cb();
            } catch {
              // Best-effort auto-save before exit
            }
          }
          clearTestGuard();
          onClick?.(e);
          if (href) {
            router.push(href.toString());
          }
        }
        return;
      }
      onClick?.(e);
    },
    [onClick, href, router],
  );

  return <Link {...props} href={href} onClick={handleClick} />;
}

