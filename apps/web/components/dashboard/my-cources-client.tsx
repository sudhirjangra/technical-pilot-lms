'use client';

import { StudentEnrollment } from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { BookOpen, CheckCircle2, Clock3, LayoutGrid, List, Play, Search, SlidersHorizontal } from '@repo/shadcn/lucide';
import Link from 'next/link';
import { ComponentType, useMemo, useState } from 'react';
import type { LucideProps } from '@repo/shadcn/lucide';

type CourseStatus = 'active' | 'completed' | 'expired';

const statusLabels: Record<CourseStatus, string> = {
  active: 'In progress',
  completed: 'Completed',
  expired: 'Expired',
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

export function MyCourcesClient({ enrollments }: { enrollments: StudentEnrollment[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | CourseStatus>('all');
  const [sort, setSort] = useState<'recent' | 'oldest' | 'name'>('recent');
  const [grid, setGrid] = useState(true);

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
    { key: 'expired', title: 'Past access', items: filtered.filter((item) => item.status === 'expired') },
  ].filter((group) => group.items.length > 0);

  const stats: { label: string; count: number; icon: ComponentType<LucideProps> }[] = [
    { label: 'All courses', count: enrollments.length, icon: BookOpen },
    { label: 'In progress', count: enrollments.filter((item) => item.status === 'active').length, icon: Clock3 },
    { label: 'Completed', count: enrollments.filter((item) => item.status === 'completed').length, icon: CheckCircle2 },
  ];

  return (
    <section className="container space-y-7 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">Your learning library</p>
          <h1 className="text-3xl font-bold tracking-tight">My courses</h1>
          <p className="mt-1 text-muted-foreground">Pick up where you left off or revisit a completed course.</p>
        </div>
        <Button asChild><Link href="/courses">Explore courses</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(({ label, count, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className="size-5 text-primary" />
              <div><p className="text-2xl font-bold leading-none">{count}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your courses" className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <SlidersHorizontal className="my-2.5 size-4 shrink-0 text-muted-foreground" />
          {(['all', 'active', 'completed', 'expired'] as const).map((value) => (
            <Button key={value} variant={filter === value ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter(value)} className="shrink-0">
              {value === 'all' ? 'All' : statusLabels[value]}
            </Button>
          ))}
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="recent">Recently added</option><option value="oldest">Oldest first</option><option value="name">Name</option>
          </select>
          <Button variant="ghost" size="icon" onClick={() => setGrid(!grid)} aria-label={grid ? 'Show list view' : 'Show grid view'}>
            {grid ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
          </Button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center"><BookOpen className="mb-3 size-10 text-muted-foreground/50" /><h2 className="font-semibold">{enrollments.length ? 'No courses found' : 'Your library is waiting'}</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">{enrollments.length ? 'Try another search or filter.' : 'Browse the catalog to start building your learning path.'}</p>{!enrollments.length && <Button asChild className="mt-5"><Link href="/courses">Browse courses</Link></Button>}</CardContent></Card>
      ) : grouped.map((group) => (
        <div key={group.key} className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{group.title}</h2><span className="text-sm text-muted-foreground">{group.items.length} {group.items.length === 1 ? 'course' : 'courses'}</span></div>
          <div className={grid ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-3'}>
            {group.items.map((enrollment) => {
              const course = enrollment.courses;
              const status = enrollment.status as CourseStatus;
              return <Link key={enrollment.id} href={`/dashboard/courses/${enrollment.course_id}`} className="group">
                <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/30">
                  <div className={grid ? 'aspect-[16/8] overflow-hidden bg-muted' : 'hidden'}><CourseThumbnail title={course?.title ?? 'Course'} thumbnail={course?.thumbnail_url ?? null} /></div>
                  <CardContent className={grid ? 'space-y-3 p-4' : 'flex items-center gap-4 p-4'}>
                    {!grid && <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted"><CourseThumbnail title={course?.title ?? 'Course'} thumbnail={course?.thumbnail_url ?? null} /></div>}
                    <div className="min-w-0 flex-1"><div className="mb-2 flex items-start justify-between gap-2"><h3 className="line-clamp-2 font-semibold leading-snug">{course?.title ?? 'Course unavailable'}</h3><Badge variant={status === 'active' ? 'default' : 'secondary'} className="shrink-0">{statusLabels[status] ?? status}</Badge></div><p className="text-xs text-muted-foreground">Added {new Date(enrollment.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p><div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">{status === 'completed' ? <CheckCircle2 className="size-4" /> : <Play className="size-4" />}{status === 'completed' ? 'Review course' : 'Continue learning'}</div></div>
                  </CardContent>
                </Card>
              </Link>;
            })}
          </div>
        </div>
      ))}
    </section>
  );
}