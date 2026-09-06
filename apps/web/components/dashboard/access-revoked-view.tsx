'use client';

import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent } from '@repo/shadcn/card';
import { AlertCircle, ArrowLeft, BookOpen, Lock, ShieldAlert } from '@repo/shadcn/lucide';
import Link from 'next/link';

export function AccessRevokedView({
  courseTitle,
}: {
  courseTitle?: string;
  courseSlug?: string;
}) {
  return (
    <div className="container mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center px-4 py-12">
      <Card className="w-full border-destructive/30 bg-destructive/5 backdrop-blur-md shadow-lg overflow-hidden">
        <div className="h-1.5 w-full bg-destructive/80" />
        <CardContent className="flex flex-col items-center p-6 text-center sm:p-10">
          <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 ring-8 ring-destructive/5 text-destructive sm:size-20">
            <ShieldAlert className="size-8 sm:size-10" />
            <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-1 shadow">
              <Lock className="size-4 text-destructive" />
            </div>
          </div>

          <Badge
            variant="destructive"
            className="mb-3 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider bg-destructive/15 text-destructive border-destructive/30"
          >
            Access Revoked
          </Badge>

          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Course Access Revoked
          </h1>

          {courseTitle && (
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {courseTitle}
            </p>
          )}

          <div className="mt-4 max-w-md rounded-lg border border-destructive/20 bg-background/80 p-4 text-left text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">
                  Administrator Action Notice
                </p>
                <p className="mt-1">
                  Your access to this course has been revoked by an administrator. All lessons, video streams, study notes, and assessment attempts for this course are currently disabled.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-sm text-xs text-muted-foreground">
            If you believe this revocation was made in error or wish to request reinstatement, please contact course administration or platform support.
          </p>

          <div className="mt-8 flex flex-col w-full gap-2.5 sm:flex-row sm:justify-center">
            <Button asChild className="h-10 px-5 gap-2">
              <Link href="/dashboard/courses">
                <ArrowLeft className="size-4" />
                Back to My Courses
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-10 px-5 gap-2">
              <Link href="/courses">
                <BookOpen className="size-4" />
                Browse Catalog
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
