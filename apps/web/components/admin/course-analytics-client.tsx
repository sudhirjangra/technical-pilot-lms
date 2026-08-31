'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  type CourseAnalyticsData,
  type CourseStudent,
} from '@/server/admin/analytics.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Progress } from '@repo/shadcn/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/shadcn/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@repo/shadcn/accordion';
import { cn } from '@repo/shadcn/lib/utils';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Trophy,
  Users,
  AlertTriangle,
} from '@repo/shadcn/lucide';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  compareValues,
  EmptyState,
  SearchInput,
  SortableHeader,
  type SortState,
  TablePagination,
  toggleSort,
  useDebouncedValue,
  usePagination,
} from './data-toolbar';

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const statusVariant = (
  status: string,
): 'default' | 'secondary' | 'destructive' => {
  switch (status) {
    case 'active':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'expired':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const lessonTypeBadge = (
  type: string,
): { label: string; className: string } => {
  switch (type) {
    case 'video':
      return { label: 'Video', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' };
    case 'pdf':
      return { label: 'PDF', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' };
    case 'test':
      return { label: 'Test', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
    case 'assignment':
      return { label: 'Assignment', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
    default:
      return { label: type, className: '' };
  }
};

// ── Stat Card ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="gap-1 px-4 py-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {sub && <p className="text-muted-foreground text-[11px]">{sub}</p>}
    </Card>
  );
}

// ── Charts ─────────────────────────────────────────────────────────

function EnrollmentChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No enrollment data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            fontSize: '12px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--primary))"
          fill="url(#enrollGrad)"
          strokeWidth={2}
          name="Enrollments"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ChapterCompletionChart({
  chapters,
  totalEnrolled,
}: {
  chapters: any[];
  totalEnrolled: number;
}) {
  const data = chapters.map((ch: any, idx: number) => ({
    name: `Ch ${idx + 1}`,
    enrolled: totalEnrolled,
    completed: ch.lessons?.reduce?.((sum: number, l: any) => sum + (l.stats?.completed ?? 0), 0) ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No chapter data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            fontSize: '12px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
          }}
        />
        <Bar dataKey="enrolled" name="Enrolled" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" name="Completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const DISTRIBUTION_COLORS = [
  'hsl(0, 70%, 55%)',
  'hsl(25, 80%, 55%)',
  'hsl(45, 85%, 50%)',
  'hsl(140, 60%, 45%)',
  'hsl(160, 70%, 40%)',
];

function ProgressDistributionChart({ students }: { students: CourseStudent[] }) {
  const buckets = useMemo(() => {
    const ranges = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];
    const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    for (const s of students) {
      const p = s.overallProgress;
      if (p < 20) counts[0]++;
      else if (p < 40) counts[1]++;
      else if (p < 60) counts[2]++;
      else if (p < 80) counts[3]++;
      else counts[4]++;
    }
    return ranges.map((range, i) => ({ range, count: counts[i] }));
  }, [students]);

  if (students.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No student data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="range" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            fontSize: '12px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
          }}
        />
        <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
          {buckets.map((_, i) => (
            <Cell key={i} fill={DISTRIBUTION_COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────

function OverviewTab({
  analytics,
  students,
}: {
  analytics: CourseAnalyticsData;
  students: CourseStudent[];
}) {
  const chapters = analytics.chapters ?? [];

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Enrollment Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnrollmentChart data={analytics.enrollmentTimeline ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Chapter Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChapterCompletionChart
              chapters={chapters}
              totalEnrolled={analytics.totalEnrolled}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Student Progress Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressDistributionChart students={students} />
        </CardContent>
      </Card>

      {/* Chapter / Lesson Completion */}
      {chapters.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Chapter &amp; Lesson Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="multiple" className="w-full">
              {chapters.map((chapter: any, chapterIdx: number) => {
                const lessons = chapter.lessons ?? [];
                const completedCount = chapter.studentsCompleted ?? 0;
                const total = analytics.totalEnrolled || 1;
                const pct = Math.round((completedCount / total) * 100);

                return (
                  <AccordionItem key={chapter.id ?? chapterIdx} value={`ch-${chapterIdx}`}>
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">
                      <div className="flex w-full items-center justify-between gap-3 pr-2">
                        <span className="min-w-0 truncate font-medium">
                          {chapterIdx + 1}. {chapter.title ?? 'Untitled'}
                        </span>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-muted-foreground text-xs">
                            {completedCount}/{analytics.totalEnrolled}
                          </span>
                          <div className="hidden w-24 sm:block">
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {lessons.length === 0 ? (
                        <p className="text-muted-foreground py-2 text-xs">
                          No lessons in this chapter.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {lessons.map((lesson: any, lessonIdx: number) => {
                            const tb = lessonTypeBadge(lesson.lessonType ?? lesson.type ?? '');
                            const completed = lesson.stats?.completed ?? 0;
                            const inProgress = lesson.stats?.in_progress ?? 0;
                            const notStarted = Math.max(
                              0,
                              analytics.totalEnrolled - completed - inProgress,
                            );
                            return (
                              <div
                                key={lesson.id ?? lessonIdx}
                                className="rounded-md border px-3 py-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {chapterIdx + 1}.{lessonIdx + 1}{' '}
                                      {lesson.title ?? 'Untitled'}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={cn('text-[10px]', tb.className)}
                                    >
                                      {tb.label}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {completed} done
                                    </span>
                                    <span className="text-amber-600 dark:text-amber-400">
                                      {inProgress} in progress
                                    </span>
                                    <span>{notStarted} not started</span>
                                  </div>
                                </div>
                                {(lesson.lessonType === 'test' ||
                                  lesson.lessonType === 'assignment') && (
                                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                                    {lesson.avgScore != null && (
                                      <span>
                                        Avg score: {Math.round(lesson.avgScore)}%
                                      </span>
                                    )}
                                    {lesson.passRate != null && (
                                      <span>
                                        Pass rate: {Math.round(lesson.passRate)}%
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Students Tab ──────────────────────────────────────────────────

type StudentSortKey = 'student_name' | 'progress' | 'enrolled_at';
const PAGE_SIZE = 10;

function StudentsTab({ students }: { students: CourseStudent[] }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [sort, setSort] = useState<SortState<StudentSortKey>>({
    key: 'progress',
    direction: 'desc',
  });

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return students
      .filter(
        (s) =>
          !q ||
          (s.fullName ?? '').toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const factor = sort.direction === 'asc' ? 1 : -1;
        const keyMap: Record<string, keyof CourseStudent> = { student_name: 'fullName', progress: 'overallProgress', enrolled_at: 'enrolledAt' };
        const realKey = keyMap[sort.key] ?? sort.key;
        return compareValues((a as any)[realKey], (b as any)[realKey]) * factor;
      });
  }, [students, debouncedSearch, sort]);

  const pagination = usePagination(filtered, PAGE_SIZE);

  const handleSort = (key: StudentSortKey) =>
    setSort((c) => toggleSort(c, key));

  if (students.length === 0) {
    return <EmptyState title="No students enrolled" description="Students will appear here once they enroll." />;
  }

  return (
    <div className="space-y-4">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email"
      />
      <Card className="gap-0 py-0">
        <div className="w-full overflow-x-auto px-4 sm:px-6">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <SortableHeader
                  sortKey="student_name"
                  sort={sort}
                  onSort={handleSort}
                >
                  Name
                </SortableHeader>
                <TableHead className="hidden px-2 py-1.5 text-xs uppercase md:table-cell">
                  Email
                </TableHead>
                <SortableHeader
                  sortKey="enrolled_at"
                  sort={sort}
                  onSort={handleSort}
                  className="hidden sm:table-cell"
                >
                  Enrolled
                </SortableHeader>
                <TableHead className="px-2 py-1.5 text-xs uppercase">
                  Status
                </TableHead>
                <SortableHeader
                  sortKey="progress"
                  sort={sort}
                  onSort={handleSort}
                >
                  Progress
                </SortableHeader>
                <TableHead className="hidden px-2 py-1.5 text-xs uppercase lg:table-cell">
                  Lessons
                </TableHead>
                <TableHead className="hidden px-2 py-1.5 text-xs uppercase sm:table-cell">
                  Last Active
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-[200px] py-2">
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {s.fullName ?? 'Unknown'}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate py-2 text-xs md:table-cell">
                    {s.email ?? '--'}
                  </TableCell>
                  <TableCell className="hidden py-2 text-xs sm:table-cell">
                    {formatDate(s.enrolledAt)}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant={statusVariant(s.status)}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <Progress value={s.overallProgress} className="h-1.5 w-16" />
                      <span className="text-xs">{Math.round(s.overallProgress)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden py-2 text-xs lg:table-cell">
                    {s.lessonsCompleted}/{s.totalLessons}
                  </TableCell>
                  <TableCell className="hidden py-2 text-xs sm:table-cell">
                    {formatDate(s.lastActivity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 pb-3 sm:px-6">
          <TablePagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            from={pagination.from}
            to={pagination.to}
            total={pagination.total}
            onPageChange={pagination.setPage}
            label="students"
          />
        </div>
      </Card>
    </div>
  );
}

// ── Rankings Tab ──────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = {
  1: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  2: 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  3: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

function RankingsTab({
  rankings,
  students,
}: {
  rankings: any[];
  students: CourseStudent[];
}) {
  // Merge rankings data with student data for richer display
  const rows = useMemo(() => {
    if (rankings.length > 0) {
      return rankings.map((r: any, idx: number) => {
        const matched = students.find((s) => s.id === r.studentId);
        const enrolledAt = matched?.enrolledAt ?? r.enrolledAt;
        const daysSinceEnroll = enrolledAt
          ? Math.floor(
              (Date.now() - new Date(enrolledAt).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;
        return {
          rank: idx + 1,
          student_id: r.studentId ?? matched?.id,
          name: r.fullName ?? matched?.fullName ?? 'Unknown',
          progress: r.overallProgress ?? matched?.overallProgress ?? 0,
          bestTestScore: r.bestTestScore ?? null,
          bestAssignmentScore: r.bestAssignmentScore ?? null,
          atRisk: (r.overallProgress ?? matched?.overallProgress ?? 0) < 20 && daysSinceEnroll > 30,
        };
      });
    }
    // Fallback: rank students by progress
    return [...students]
      .sort((a, b) => b.overallProgress - a.overallProgress)
      .map((s, idx) => {
        const daysSinceEnroll = Math.floor(
          (Date.now() - new Date(s.enrolledAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return {
          rank: idx + 1,
          student_id: s.id,
          name: s.fullName ?? 'Unknown',
          progress: s.overallProgress,
          bestTestScore: null as number | null,
          bestAssignmentScore: null as number | null,
          atRisk: s.overallProgress < 20 && daysSinceEnroll > 30,
        };
      });
  }, [rankings, students]);

  const atRiskCount = rows.filter((r) => r.atRisk).length;

  if (rows.length === 0) {
    return <EmptyState title="No rankings available" />;
  }

  return (
    <div className="space-y-4">
      {atRiskCount > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="size-4" />
            <span>
              {atRiskCount} student{atRiskCount > 1 ? 's' : ''} at risk (less
              than 20% progress, enrolled over 30 days ago)
            </span>
          </div>
        </Card>
      )}
      <Card className="gap-0 py-0">
        <div className="w-full overflow-x-auto px-4 sm:px-6">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-2 py-1.5 text-xs uppercase">
                  #
                </TableHead>
                <TableHead className="px-2 py-1.5 text-xs uppercase">
                  Student
                </TableHead>
                <TableHead className="px-2 py-1.5 text-xs uppercase">
                  Progress
                </TableHead>
                <TableHead className="hidden px-2 py-1.5 text-xs uppercase sm:table-cell">
                  Best Test
                </TableHead>
                <TableHead className="hidden px-2 py-1.5 text-xs uppercase sm:table-cell">
                  Best Assignment
                </TableHead>
                <TableHead className="px-2 py-1.5 text-xs uppercase">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.student_id ?? r.rank}
                  className={cn(
                    r.rank <= 3 && 'font-medium',
                    r.atRisk && 'bg-amber-50/30 dark:bg-amber-950/10',
                  )}
                >
                  <TableCell className="py-2">
                    {r.rank <= 3 ? (
                      <Badge
                        variant="outline"
                        className={cn('text-xs', RANK_COLORS[r.rank])}
                      >
                        {r.rank}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {r.rank}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] py-2">
                    <Link
                      href={`/admin/students/${r.student_id}`}
                      className="truncate hover:underline"
                    >
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <Progress value={r.progress} className="h-1.5 w-16" />
                      <span className="text-xs">
                        {Math.round(r.progress)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden py-2 text-xs sm:table-cell">
                    {r.bestTestScore != null
                      ? `${Math.round(r.bestTestScore)}%`
                      : '--'}
                  </TableCell>
                  <TableCell className="hidden py-2 text-xs sm:table-cell">
                    {r.bestAssignmentScore != null
                      ? `${Math.round(r.bestAssignmentScore)}%`
                      : '--'}
                  </TableCell>
                  <TableCell className="py-2">
                    {r.atRisk ? (
                      <Badge
                        variant="outline"
                        className="border-amber-400 text-[10px] text-amber-700 dark:text-amber-400"
                      >
                        At Risk
                      </Badge>
                    ) : r.rank <= 3 ? (
                      <Badge className="bg-emerald-600 text-[10px]">Top</Badge>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ── Chapter Details Tab ──────────────────────────────────────────

function ChapterDetailsTab({
  chapters,
  totalEnrolled,
}: {
  chapters: any[];
  totalEnrolled: number;
}) {
  if (chapters.length === 0) {
    return (
      <EmptyState
        title="No chapters found"
        description="This course has no chapters yet."
      />
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {chapters.map((chapter: any, chapterIdx: number) => {
        const lessons = chapter.lessons ?? [];
        return (
          <AccordionItem
            key={chapter.id ?? chapterIdx}
            value={`detail-ch-${chapterIdx}`}
            className="rounded-lg border px-4"
          >
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              <div className="flex w-full items-center justify-between gap-3 pr-2">
                <span className="min-w-0 truncate font-medium">
                  {chapterIdx + 1}. {chapter.title ?? 'Untitled'}
                </span>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {lessons.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  No lessons.
                </p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-2 py-1.5 text-xs uppercase">
                          Lesson
                        </TableHead>
                        <TableHead className="px-2 py-1.5 text-xs uppercase">
                          Type
                        </TableHead>
                        <TableHead className="px-2 py-1.5 text-xs uppercase">
                          Completed
                        </TableHead>
                        <TableHead className="hidden px-2 py-1.5 text-xs uppercase sm:table-cell">
                          In Progress
                        </TableHead>
                        <TableHead className="hidden px-2 py-1.5 text-xs uppercase sm:table-cell">
                          Avg Progress
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessons.map((lesson: any, lessonIdx: number) => {
                        const tb = lessonTypeBadge(
                          lesson.lessonType ?? lesson.type ?? '',
                        );
                        const completed = lesson.stats?.completed ?? 0;
                        const inProgress = lesson.stats?.in_progress ?? 0;
                        const avgProgress = lesson.avgProgress ?? 0;
                        const isAssessment =
                          lesson.lessonType === 'test' ||
                          lesson.lessonType === 'assignment';

                        return (
                          <TableRow key={lesson.id ?? lessonIdx}>
                            <TableCell className="max-w-[240px] py-2">
                              <span className="truncate">
                                {chapterIdx + 1}.{lessonIdx + 1}{' '}
                                {lesson.title ?? 'Untitled'}
                              </span>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={cn('text-[10px]', tb.className)}
                              >
                                {tb.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-xs">
                              {completed}/{totalEnrolled}
                            </TableCell>
                            <TableCell className="hidden py-2 text-xs sm:table-cell">
                              {inProgress}
                            </TableCell>
                            <TableCell className="hidden py-2 sm:table-cell">
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={avgProgress}
                                  className="h-1.5 w-16"
                                />
                                <span className="text-xs">
                                  {Math.round(avgProgress)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Assessment statistics rows */}
                      {lessons
                        .filter(
                          (l: any) =>
                            l.lesson_type === 'test' ||
                            l.lesson_type === 'assignment',
                        )
                        .map((lesson: any, idx: number) => (
                          <TableRow
                            key={`assess-${lesson.id ?? idx}`}
                            className="bg-muted/20"
                          >
                            <TableCell
                              colSpan={5}
                              className="py-1.5 text-xs text-muted-foreground"
                            >
                              <div className="flex flex-wrap gap-4 pl-4">
                                <span>
                                  {lesson.lessonType === 'test'
                                    ? 'Test'
                                    : 'Assignment'}{' '}
                                  stats for "{lesson.title ?? 'Untitled'}":
                                </span>
                                {lesson.totalAttempts != null && (
                                  <span>{lesson.totalAttempts} attempts</span>
                                )}
                                {lesson.avgScore != null && (
                                  <span>
                                    Avg score: {Math.round(lesson.avgScore)}%
                                  </span>
                                )}
                                {lesson.passRate != null && (
                                  <span>
                                    Pass rate: {Math.round(lesson.passRate)}%
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// ── Main Component ────────────────────────────────────────────────

export function CourseAnalyticsClient({
  courseId,
  analytics,
  students,
}: {
  courseId: string;
  analytics: CourseAnalyticsData | null;
  students: CourseStudent[] | null;
}) {
  const safeStudents = students ?? [];

  if (!analytics) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/courses"
          className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Courses
        </Link>
        <EmptyState
          title="Unable to load analytics"
          description="The analytics data for this course could not be loaded. Please try again later."
        />
      </div>
    );
  }

  const courseTitle =
    typeof analytics.course === 'object' && analytics.course?.title
      ? analytics.course.title
      : typeof analytics.course === 'string'
        ? analytics.course
        : 'Course';

  const completionRate =
    analytics.totalEnrolled > 0
      ? Math.round(
          (analytics.completedStudents / analytics.totalEnrolled) * 100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/courses"
            className="text-muted-foreground mb-1 inline-flex items-center gap-1 text-sm hover:underline"
          >
            <ArrowLeft className="size-4" />
            Courses
          </Link>
          <h1 className="text-xl font-semibold sm:text-2xl">{courseTitle}</h1>
          <p className="text-muted-foreground text-xs">Course Analytics</p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/courses/${courseId}`}>View Course</Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Enrolled"
          value={analytics.totalEnrolled}
        />
        <StatCard
          label="Active Students"
          value={analytics.activeStudents}
        />
        <StatCard
          label="Completed"
          value={analytics.completedStudents}
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="overview" className="gap-1">
            <BarChart3 className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1">
            <Users className="size-3.5" />
            Students
          </TabsTrigger>
          <TabsTrigger value="rankings" className="gap-1">
            <Trophy className="size-3.5" />
            Rankings
          </TabsTrigger>
          <TabsTrigger value="chapters" className="gap-1">
            <BookOpen className="size-3.5" />
            Chapters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab analytics={analytics} students={safeStudents} />
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <StudentsTab students={safeStudents} />
        </TabsContent>

        <TabsContent value="rankings" className="mt-4">
          <RankingsTab
            rankings={analytics.studentRankings ?? []}
            students={safeStudents}
          />
        </TabsContent>

        <TabsContent value="chapters" className="mt-4">
          <ChapterDetailsTab
            chapters={analytics.chapters ?? []}
            totalEnrolled={analytics.totalEnrolled}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
