'use client';

import { StudentEnrollment } from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent } from '@repo/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  List,
  Lock,
  Play,
  Search,
  ShieldAlert,
  SlidersHorizontal,
} from '@repo/shadcn/lucide';
import Link from 'next/link';
import { ComponentType, useMemo, useState } from 'react';
import type { LucideProps } from '@repo/shadcn/lucide';
import { cn } from '@repo/shadcn/lib/utils';

type CourseStatus = 'active' | 'completed' | 'expired';

const statusLabels: Record<CourseStatus, string> = {
  active: 'In progress',
  completed: 'Completed',
  expired: 'Access Revoked',
};

function CourseThumbnail({ title, thumbnail }: { title: string; thumbnail: string | null }) {
  return thumbnail ? (
    <img src={thumbnail} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
      <BookOpen className="size-10" strokeWidth={1.5} />
      <span className="sr-only">{title}</span>
    </div>
  );
}

export function MyCoursesClient({ enrollments }: { enrollments: StudentEnrollment[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | CourseStatus>('all');
  const [sort, setSort] = useState<'recent' | 'oldest' | 'name'>('recent');
  const [grid, setGrid] = useState(true);
  const [revokedModalCourse, setRevokedModalCourse] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...enrollments]
      .filter((enrollment) => filter === 'all' || enrollment.status === filter)
      .filter((enrollment) => enrollment.courses?.title.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        if (sort === 'name') return (a.courses?.title ?? '').localeCompare(b.courses?.title ?? '');
        const direction = sort === 'recent' ? -1 : 1;
        return direction * (new Date(a.enrolled_at).getTime() - new Date(b.enrolled_at).getTime());
      });
  }, [enrollments, filter, query, sort]);

  const grouped = [
    { key: 'active', title: 'Continue learning', items: filtered.filter((item) => item.status === 'active') },
    { key: 'completed', title: 'Completed courses', items: filtered.filter((item) => item.status === 'completed') },
    { key: 'expired', title: 'Revoked access', items: filtered.filter((item) => item.status === 'expired') },
  ].filter((group) => group.items.length > 0);

  const activeCount = enrollments.filter((item) => item.status === 'active').length;
  const completedCount = enrollments.filter((item) => item.status === 'completed').length;
  const revokedCount = enrollments.filter((item) => item.status === 'expired').length;

  const stats: { label: string; count: number; icon: ComponentType<LucideProps> }[] = [
    { label: 'All courses', count: enrollments.length, icon: BookOpen },
    { label: 'In progress', count: activeCount, icon: Clock3 },
    { label: 'Completed', count: completedCount, icon: CheckCircle2 },
    ...(revokedCount > 0 ? [{ label: 'Revoked', count: revokedCount, icon: ShieldAlert }] : []),
  ];

  return (
    <section className="container px-3 sm:px-6 space-y-5 sm:space-y-7 py-4 sm:py-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs sm:text-sm font-medium text-primary">Your learning library</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My courses</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">Pick up where you left off or revisit your courses.</p>
        </div>
        <Button size="sm" className="h-9 w-full sm:w-auto" asChild><Link href="/courses">Explore courses</Link></Button>
      </div>

      <div className={cn('grid gap-2.5 sm:gap-3', revokedCount > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')}>
        {stats.map(({ label, count, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4">
              <div className={cn('rounded-lg p-1.5 sm:p-2 shrink-0', label === 'Revoked' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
                <Icon className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold leading-none">{count}</p>
                <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 rounded-lg border bg-card p-2.5 sm:p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your courses" className="h-9 pl-9 text-xs sm:text-sm" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal className="my-2 size-3.5 shrink-0 text-muted-foreground" />
          {(['all', 'active', 'completed', 'expired'] as const).map((value) => (
            <Button key={value} variant={filter === value ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter(value)} className="h-8 px-2 text-xs shrink-0">
              {value === 'all' ? 'All' : statusLabels[value]}
            </Button>
          ))}
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-8 rounded-md border bg-background px-2 text-xs">
            <option value="recent">Recently added</option><option value="oldest">Oldest first</option><option value="name">Name</option>
          </select>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setGrid(!grid)} aria-label={grid ? 'Show list view' : 'Show grid view'}>
            {grid ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
          </Button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center"><BookOpen className="mb-3 size-10 text-muted-foreground/50" /><h2 className="font-semibold">{enrollments.length ? 'No courses found' : 'Your library is waiting'}</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">{enrollments.length ? 'Try another search or filter.' : 'Browse the catalog to start building your learning path.'}</p>{!enrollments.length && <Button asChild className="mt-5"><Link href="/courses">Browse courses</Link></Button>}</CardContent></Card>
      ) : grouped.map((group) => (
        <div key={group.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <span className="text-sm text-muted-foreground">{group.items.length} {group.items.length === 1 ? 'course' : 'courses'}</span>
          </div>
          <div className={grid ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-3'}>
            {group.items.map((enrollment) => {
              const course = enrollment.courses;
              const status = enrollment.status as CourseStatus;
              const isRevoked = status === 'expired';

              if (isRevoked) {
                return (
                  <div key={enrollment.id} className="relative">
                    <Card className="h-full overflow-hidden border-destructive/30 bg-card/60 opacity-90 transition-shadow">
                      <div className={grid ? 'aspect-[16/8] overflow-hidden bg-muted/60 relative' : 'hidden'}>
                        <CourseThumbnail title={course?.title ?? 'Course'} thumbnail={course?.thumbnail_url ?? null} />
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                          <Lock className="size-7 text-destructive/80" />
                        </div>
                      </div>
                      <CardContent className={grid ? 'space-y-3 p-4' : 'flex items-center gap-4 p-4'}>
                        {!grid && (
                          <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted relative">
                            <CourseThumbnail title={course?.title ?? 'Course'} thumbnail={course?.thumbnail_url ?? null} />
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                              <Lock className="size-4 text-destructive/80" />
                            </div>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 font-semibold leading-snug text-foreground/80">{course?.title ?? 'Course unavailable'}</h3>
                            <Badge variant="destructive" className="shrink-0 bg-destructive/15 text-destructive border-destructive/30 font-medium">
                              Access Revoked
                            </Badge>
                          </div>
                          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-[11px] text-destructive leading-tight flex items-start gap-1.5 mt-1">
                            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                            <span>Access revoked by administrator. Content locked.</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between pt-1 border-t border-border/40">
                            <span className="text-xs text-muted-foreground">Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setRevokedModalCourse(course?.title ?? 'this course')}
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              }

              return (
                <Link key={enrollment.id} href={`/dashboard/courses/${enrollment.course_id}`} className="group">
                  <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/30">
                    <div className={grid ? 'aspect-[16/8] overflow-hidden bg-muted' : 'hidden'}>
                      <CourseThumbnail title={course?.title ?? 'Course'} thumbnail={course?.thumbnail_url ?? null} />
                    </div>
                    <CardContent className={grid ? 'space-y-3 p-4' : 'flex items-center gap-4 p-4'}>
                      {!grid && (
                        <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                          <CourseThumbnail title={course?.title ?? 'Course'} thumbnail={course?.thumbnail_url ?? null} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 font-semibold leading-snug">{course?.title ?? 'Course unavailable'}</h3>
                          <Badge variant={status === 'active' ? 'default' : 'secondary'} className="shrink-0">
                            {statusLabels[status] ?? status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Added {new Date(enrollment.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                          {status === 'completed' ? <CheckCircle2 className="size-4" /> : <Play className="size-4" />}
                          {status === 'completed' ? 'Review course' : 'Continue learning'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Access Revoked Information Dialog */}
      <Dialog open={!!revokedModalCourse} onOpenChange={(open) => !open && setRevokedModalCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-destructive mb-1">
              <ShieldAlert className="size-5" />
              <DialogTitle className="text-destructive">Course Access Revoked</DialogTitle>
            </div>
            <DialogDescription className="text-sm pt-2 text-foreground/90">
              Access to <strong className="font-semibold text-foreground">{revokedModalCourse}</strong> has been revoked by an administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-muted-foreground leading-relaxed space-y-1.5">
            <p>
              When enrollment access is revoked, all videos, course notes, PDF materials, and assessment submissions for this course are locked.
            </p>
            <p>
              If you believe this is an error or would like to request restoration of access, please contact platform administration.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setRevokedModalCourse(null)}>
              Dismiss
            </Button>
            <Button size="sm" asChild>
              <Link href="/courses">Browse Other Courses</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}