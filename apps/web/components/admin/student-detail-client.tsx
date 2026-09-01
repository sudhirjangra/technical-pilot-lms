'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type AttemptDetail,
  type ProgressRecord,
  type StudentDetail,
  type StudentEnrollment,
  getAttemptDetail,
  gradeAttemptAnswers,
  toggleStudentActive,
  updateEnrollmentStatus,
} from '@/server/admin/students.server';
import type { AdminCourseProgress } from '@/server/admin/enrollments.server';
import type {
  StudentAnalytics,
  StudentAttempt,
} from '@/server/admin/analytics.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import { OrbitalSpinner } from '@repo/shadcn/orbital-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import { toast } from '@repo/shadcn/sonner';
import { Progress } from '@repo/shadcn/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@repo/shadcn/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/shadcn/table';
import { cn } from '@repo/shadcn/lib/utils';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Monitor,
  Smartphone,
  Activity,
  CalendarDays,
  FileText,
  Video,
  ClipboardCheck,
  FlaskConical,
  User,
  Shield,
} from '@repo/shadcn/lucide';

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function relativeTime(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'active':
    case 'in_progress':
      return 'secondary';
    case 'expired':
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
    case 'active':
    case 'in_progress':
      return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'expired':
    case 'failed':
      return 'bg-red-500/10 text-red-600 border-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function lessonTypeIcon(type: string) {
  switch (type) {
    case 'video':
      return <Video className="size-3.5" />;
    case 'pdf':
      return <FileText className="size-3.5" />;
    case 'test':
      return <FlaskConical className="size-3.5" />;
    case 'assignment':
      return <ClipboardCheck className="size-3.5" />;
    default:
      return <BookOpen className="size-3.5" />;
  }
}

/* ── Stat Card ────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="gap-1 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="text-xl font-semibold">{value}</p>
      {sub && <p className="text-muted-foreground text-[11px]">{sub}</p>}
    </Card>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */

export function StudentDetailClient({
  student,
  enrollments,
  progress,
  courseProgress,
  analytics,
  attempts,
}: {
  student: StudentDetail;
  enrollments: StudentEnrollment[];
  progress: ProgressRecord[];
  courseProgress: { course: string; progress: AdminCourseProgress | null }[];
  analytics: StudentAnalytics | null;
  attempts: StudentAttempt[] | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [attemptDialog, setAttemptDialog] = useState(false);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(
    null,
  );
  const [attemptType, setAttemptType] = useState<'assignment' | 'test'>(
    'assignment',
  );
  const [gradingState, setGradingState] = useState<
    Record<string, boolean | null>
  >({});
  const [gradingSaving, setGradingSaving] = useState(false);
  const [attemptFilter, setAttemptFilter] = useState<
    'all' | 'test' | 'assignment'
  >('all');

  const isActive = student.is_active !== false;

  // Computed stats
  const completedLessons =
    analytics?.summary?.totalLessonsCompleted ??
    progress.filter((p) => p.status === 'completed').length;
  const activeEnrollments = enrollments.filter(
    (e) => e.status === 'active',
  ).length;
  const completedEnrollments =
    analytics?.summary?.completedCourses ??
    enrollments.filter((e) => e.status === 'completed').length;
  const totalAssessmentTime = (analytics?.summary?.totalTimeOnTestsSeconds ?? 0) + (analytics?.summary?.totalTimeOnAssignmentsSeconds ?? 0);

  // Attempts stats
  const filteredAttempts = useMemo(() => {
    if (!attempts) return [];
    if (attemptFilter === 'all') return attempts;
    return attempts.filter((a) => a.type === attemptFilter);
  }, [attempts, attemptFilter]);

  const attemptStats = useMemo(() => {
    if (!attempts || attempts.length === 0)
      return { total: 0, avgScore: 0, passRate: 0 };
    const withScore = attempts.filter((a) => a.percentage != null);
    const passed = attempts.filter((a) => a.passed === true);
    return {
      total: attempts.length,
      avgScore:
        withScore.length > 0
          ? withScore.reduce((sum, a) => sum + (a.percentage ?? 0), 0) /
            withScore.length
          : 0,
      passRate:
        withScore.length > 0 ? (passed.length / withScore.length) * 100 : 0,
    };
  }, [attempts]);

  // Devices
  const devices = analytics?.devices ?? [];
  const lastActive = devices.length > 0
    ? devices.reduce((latest, d) =>
        new Date(d.last_active_at) > new Date(latest.last_active_at)
          ? d
          : latest,
      ).last_active_at
    : null;

  // Recent activity
  const recentActivity = analytics?.recentActivity ?? [];

  /* ── Handlers ─────────────────────────────────────────────────── */

  const handleToggleActive = async () => {
    setLoading(true);
    const result = await toggleStudentActive(student.id, !isActive);
    setLoading(false);
    if (result.error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success(`Student ${isActive ? 'disabled' : 'enabled'}`);
    router.refresh();
  };

  const handleEnrollmentStatus = async (
    enrollmentId: string,
    status: string,
  ) => {
    setLoading(true);
    const result = await updateEnrollmentStatus(enrollmentId, status);
    setLoading(false);
    if (result.error) {
      toast.error('Failed to update enrollment');
      return;
    }
    toast.success('Enrollment updated');
    router.refresh();
  };

  const openAttemptDetail = async (
    attemptId: string,
    type: 'assignment' | 'test',
  ) => {
    setAttemptType(type);
    setAttemptDialog(true);
    setAttemptDetail(null);
    setGradingState({});
    const detail = await getAttemptDetail(attemptId, type);
    setAttemptDetail(detail);
    if (detail?.questionReview) {
      const initial: Record<string, boolean | null> = {};
      for (const q of detail.questionReview) {
        initial[q.questionId] = q.isCorrect ?? null;
      }
      setGradingState(initial);
    }
  };

  const handleGrade = async () => {
    if (!attemptDetail) return;
    const grades = Object.entries(gradingState)
      .filter(([, v]) => v !== null)
      .map(([questionId, isCorrect]) => ({
        questionId,
        isCorrect: isCorrect!,
      }));
    if (grades.length === 0) {
      toast.error('No grades to submit');
      return;
    }
    setGradingSaving(true);
    const result = await gradeAttemptAnswers(
      attemptDetail.id,
      attemptType,
      grades,
    );
    setGradingSaving(false);
    if (result.error) {
      toast.error('Failed to save grades');
      return;
    }
    toast.success('Grades saved');
    setAttemptDialog(false);
    router.refresh();
  };

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Loading overlay */}
      {loading && (
        <div className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]">
          <div className="border-border bg-card/95 flex flex-col items-center gap-3 rounded-xl border px-6 py-5 shadow-lg">
            <OrbitalSpinner className="size-12" />
            <p className="text-foreground text-sm font-medium">
              Please wait...
            </p>
          </div>
        </div>
      )}

      {/* Attempt detail dialog */}
      <Dialog
        open={attemptDialog}
        onOpenChange={(open) => {
          setAttemptDialog(open);
          if (!open) setAttemptDetail(null);
        }}
      >
        <DialogContent className="max-h-[92vh] w-[min(96vw,900px)] max-w-[96vw] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Attempt Detail</DialogTitle>
            <DialogDescription>
              Review answers and grade text questions.
            </DialogDescription>
          </DialogHeader>

          {!attemptDetail ? (
            <div className="flex items-center justify-center py-12">
              <OrbitalSpinner className="size-8" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm">
                <span>
                  Score: {attemptDetail.score ?? '--'} /{' '}
                  {attemptDetail.max_score ?? '--'}
                </span>
                {attemptDetail.percentage != null && (
                  <span>({attemptDetail.percentage.toFixed(1)}%)</span>
                )}
                {attemptDetail.passed != null && (
                  <Badge
                    variant={attemptDetail.passed ? 'default' : 'destructive'}
                  >
                    {attemptDetail.passed ? 'Passed' : 'Failed'}
                  </Badge>
                )}
                {attemptDetail.time_spent_seconds != null && (
                  <span className="text-muted-foreground">
                    Time:{' '}
                    {formatDuration(attemptDetail.time_spent_seconds)}
                  </span>
                )}
              </div>

              {attemptDetail.questionReview?.map((q) => {
                const needsGrading =
                  q.questionType === 'text' && q.isCorrect === null;
                return (
                  <Card key={q.questionId} className="gap-2 p-3">
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="text-sm font-medium">
                        {q.questionText}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {q.questionType?.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {q.pointsEarned ?? 0}/{q.points ?? 0} pts
                      </Badge>
                      {q.isCorrect === true && (
                        <Badge className="bg-emerald-600 text-[10px]">
                          Correct
                        </Badge>
                      )}
                      {q.isCorrect === false && (
                        <Badge variant="destructive" className="text-[10px]">
                          Incorrect
                        </Badge>
                      )}
                      {q.isCorrect === null && (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-[10px] text-amber-600"
                        >
                          Ungraded
                        </Badge>
                      )}
                      {q.timeSpentSeconds != null && (
                        <span className="text-muted-foreground text-[10px]">
                          {formatDuration(q.timeSpentSeconds)}
                        </span>
                      )}
                    </div>

                    {q.textAnswer && (
                      <div className="mt-1">
                        <p className="text-muted-foreground text-xs">
                          Student answer:
                        </p>
                        <p className="bg-muted/50 text-sm whitespace-pre-wrap rounded p-2">
                          {q.textAnswer}
                        </p>
                      </div>
                    )}

                    {Array.isArray((q as any).options) && (q as any).options.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {(q as any).options.map(
                          (opt: { id: string; text: string; isCorrect: boolean; isSelected: boolean }) => (
                            <li
                              key={opt.id}
                              className={cn(
                                'flex items-center gap-2 rounded px-2 py-1 text-xs',
                                opt.isCorrect && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                                opt.isSelected && !opt.isCorrect && 'bg-destructive/10 text-destructive',
                              )}
                            >
                              <span className="flex-1">{opt.text}</span>
                              {opt.isSelected && (
                                <Badge variant="outline" className="text-[9px]">
                                  Selected
                                </Badge>
                              )}
                              {opt.isCorrect && (
                                <Badge className="bg-emerald-600 text-[9px]">Correct</Badge>
                              )}
                            </li>
                          ),
                        )}
                      </ul>
                    )}

                    {q.explanation && (
                      <details className="text-muted-foreground text-xs">
                        <summary className="cursor-pointer">
                          Explanation
                        </summary>
                        <p className="mt-1">{q.explanation}</p>
                      </details>
                    )}

                    {needsGrading && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-medium">Grade:</span>
                        <Button
                          size="sm"
                          variant={
                            gradingState[q.questionId] === true
                              ? 'default'
                              : 'outline'
                          }
                          className="h-7 text-xs"
                          onClick={() =>
                            setGradingState((s) => ({
                              ...s,
                              [q.questionId]: true,
                            }))
                          }
                        >
                          Correct
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            gradingState[q.questionId] === false
                              ? 'destructive'
                              : 'outline'
                          }
                          className="h-7 text-xs"
                          onClick={() =>
                            setGradingState((s) => ({
                              ...s,
                              [q.questionId]: false,
                            }))
                          }
                        >
                          Incorrect
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}

              {attemptDetail.questionReview?.some(
                (q) => q.questionType === 'text' && q.isCorrect === null,
              ) && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleGrade}
                    disabled={gradingSaving}
                  >
                    {gradingSaving ? (
                      <>
                        <OrbitalSpinner className="mr-2 size-3" />
                        Saving...
                      </>
                    ) : (
                      'Submit Grades'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/students"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Students
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {student.full_name || student.email}
          </h1>
          <p className="text-muted-foreground text-sm">
            {student.email}
            {student.phone ? ` · ${student.phone}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge
              variant={student.role === 'admin' ? 'default' : 'secondary'}
            >
              {student.role}
            </Badge>
            <Badge variant={isActive ? 'default' : 'destructive'}>
              {isActive ? 'Active' : 'Disabled'}
            </Badge>
            {student.date_of_birth && (
              <span className="text-muted-foreground text-xs">
                DOB: {formatDate(student.date_of_birth)}
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={isActive ? 'destructive' : 'default'}
          onClick={handleToggleActive}
          disabled={loading}
        >
          {isActive ? 'Disable Account' : 'Enable Account'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enrollments">
            Enrollments ({enrollments.length})
          </TabsTrigger>
          <TabsTrigger value="assessments">
            Assessments{attempts ? ` (${attempts.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Overview ──────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Total Courses"
              value={analytics?.summary?.totalCoursesEnrolled ?? enrollments.length}
              icon={<BookOpen className="size-4" />}
            />
            <StatCard
              label="Active Courses"
              value={activeEnrollments}
              icon={<Activity className="size-4" />}
            />
            <StatCard
              label="Completed Courses"
              value={completedEnrollments}
              icon={<CheckCircle2 className="size-4" />}
            />
            <StatCard
              label="Lessons Completed"
              value={completedLessons}
              icon={<GraduationCap className="size-4" />}
            />
            <StatCard
              label="Assessment Time"
              value={formatDuration(totalAssessmentTime)}
              icon={<Clock className="size-4" />}
            />
            <StatCard
              label="Member Since"
              value={formatDate(student.created_at)}
              icon={<CalendarDays className="size-4" />}
            />
            <StatCard
              label="Last Active"
              value={lastActive ? relativeTime(lastActive) : '--'}
              sub={lastActive ? formatDate(lastActive) : undefined}
              icon={<Monitor className="size-4" />}
            />
            <StatCard
              label="Account Status"
              value={isActive ? 'Active' : 'Disabled'}
              sub={student.role}
              icon={<Shield className="size-4" />}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Recent Activity */}
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-semibold">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No recent activity recorded.
                  </p>
                ) : (
                  <div className="space-y-0">
                    {recentActivity.slice(0, 15).map((item: any, i: number) => (
                      <div
                        key={item.id ?? i}
                        className="border-border flex items-start gap-3 border-b py-2 last:border-0"
                      >
                        <div className="bg-muted mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                          {lessonTypeIcon(item.lessonType ?? item.type ?? '')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.lessonTitle ?? item.title ?? 'Activity'}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {item.courseTitle ?? ''}{' '}
                            {item.status && (
                              <span
                                className={cn(
                                  'ml-1 inline-block rounded px-1.5 py-0.5 text-[10px]',
                                  statusColor(item.status),
                                )}
                              >
                                {item.status}
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {relativeTime(
                            item.completedAt ?? item.updatedAt ?? item.createdAt,
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Enrollment list */}
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-semibold">
                  Enrollments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {enrollments.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No enrollments.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {enrollments.map((enrollment) => {
                      const cp = courseProgress.find(
                        (c) =>
                          c.course ===
                          (enrollment.courses?.title ?? enrollment.course_id),
                      );
                      const pct = cp?.progress?.overall_percent ?? 0;
                      return (
                        <div key={enrollment.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="min-w-0 truncate text-sm font-medium">
                              {enrollment.courses?.title ??
                                enrollment.course_id}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                'shrink-0 text-[10px]',
                                statusColor(enrollment.status),
                              )}
                            >
                              {enrollment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-muted-foreground w-9 text-right text-[11px]">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Enrollments & Progress ────────────────────── */}
        <TabsContent value="enrollments" className="mt-4 space-y-3">
          {enrollments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No enrollments found.
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {enrollments.map((enrollment) => {
                const cp = courseProgress.find(
                  (c) =>
                    c.course ===
                    (enrollment.courses?.title ?? enrollment.course_id),
                );
                const pct = cp?.progress?.overall_percent ?? 0;
                return (
                  <AccordionItem
                    key={enrollment.id}
                    value={enrollment.id}
                    className="border-border rounded-lg border"
                  >
                    <div className="flex items-center gap-3 px-4 pt-3">
                      <div className="min-w-0 flex-1">
                        <AccordionTrigger className="py-0 hover:no-underline">
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <p className="truncate text-left font-medium">
                              {enrollment.courses?.title ??
                                enrollment.course_id}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                Enrolled:{' '}
                                {formatDate(enrollment.enrolled_at)}
                              </span>
                              {enrollment.completed_at && (
                                <span className="text-muted-foreground">
                                  Completed:{' '}
                                  {formatDate(enrollment.completed_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            statusColor(enrollment.status),
                          )}
                        >
                          {enrollment.status}
                        </Badge>
                        <Select
                          value={enrollment.status}
                          onValueChange={(value) =>
                            handleEnrollmentStatus(enrollment.id, value)
                          }
                          disabled={loading}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">
                              Completed
                            </SelectItem>
                            <SelectItem value="expired">
                              Access revoked
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 pb-2 pt-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-muted-foreground text-xs font-medium">
                        {pct}%
                      </span>
                    </div>
                    <AccordionContent className="px-4 pb-4 pt-0">
                      {cp?.progress?.chapters &&
                      cp.progress.chapters.length > 0 ? (
                        <div className="space-y-4">
                          {cp.progress.chapters.map(
                            (chapter: any, ci: number) => (
                              <div key={chapter.id}>
                                <p className="mb-2 text-sm font-medium">
                                  {ci + 1}. {chapter.title}
                                </p>
                                <div className="space-y-1 pl-3">
                                  {chapter.lessons.map(
                                    (lesson: any, li: number) => {
                                      const lpct =
                                        lesson.progress?.status === 'completed'
                                          ? 100
                                          : (lesson.progress
                                              ?.progress_percent ?? 0);
                                      return (
                                        <div
                                          key={lesson.id}
                                          className="flex items-center gap-2 py-1 text-sm"
                                        >
                                          <span className="text-muted-foreground">
                                            {lessonTypeIcon(
                                              lesson.lesson_type ?? '',
                                            )}
                                          </span>
                                          <span className="text-muted-foreground min-w-0 flex-1 truncate">
                                            {ci + 1}.{li + 1} {lesson.title}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              'text-[10px]',
                                              lesson.lesson_type
                                                ? ''
                                                : 'hidden',
                                            )}
                                          >
                                            {lesson.lesson_type}
                                          </Badge>
                                          {lesson.progress?.status && (
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                'text-[10px]',
                                                statusColor(
                                                  lesson.progress.status,
                                                ),
                                              )}
                                            >
                                              {lesson.progress.status}
                                            </Badge>
                                          )}
                                          <span className="text-muted-foreground w-10 shrink-0 text-right text-xs">
                                            {lesson.lesson_type === 'pdf'
                                              ? lpct === 100
                                                ? 'Done'
                                                : '--'
                                              : `${lpct}%`}
                                          </span>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          No detailed progress available.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        {/* ── Tab 3: Assessments ───────────────────────────────── */}
        <TabsContent value="assessments" className="mt-4 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total Attempts"
              value={attemptStats.total}
              icon={<ClipboardCheck className="size-4" />}
            />
            <StatCard
              label="Avg Score"
              value={
                attemptStats.avgScore > 0
                  ? `${attemptStats.avgScore.toFixed(1)}%`
                  : '--'
              }
              icon={<GraduationCap className="size-4" />}
            />
            <StatCard
              label="Pass Rate"
              value={
                attemptStats.passRate > 0
                  ? `${attemptStats.passRate.toFixed(0)}%`
                  : '--'
              }
              icon={<CheckCircle2 className="size-4" />}
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Filter:</span>
            {(['all', 'test', 'assignment'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={attemptFilter === f ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => setAttemptFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'test' ? 'Tests' : 'Assignments'}
              </Button>
            ))}
          </div>

          {/* Table */}
          {!attempts ? (
            <p className="text-muted-foreground text-sm">
              Unable to load assessment data.
            </p>
          ) : filteredAttempts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No attempts found.
            </p>
          ) : (
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">%</TableHead>
                    <TableHead className="text-xs">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.map((attempt) => (
                    <TableRow
                      key={attempt.id}
                      className="cursor-pointer"
                      onClick={() =>
                        openAttemptDetail(
                          attempt.id,
                          attempt.type as 'assignment' | 'test',
                        )
                      }
                    >
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {attempt.type === 'test' ? (
                            <FlaskConical className="mr-1 size-3" />
                          ) : (
                            <ClipboardCheck className="mr-1 size-3" />
                          )}
                          {attempt.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {attempt.title ?? attempt.lessonTitle ?? '--'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(attempt.startedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDuration(attempt.timeSpentSeconds)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {attempt.score != null
                          ? `${attempt.score}/${attempt.maxScore ?? '--'}`
                          : '--'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {attempt.percentage != null
                          ? `${attempt.percentage.toFixed(1)}%`
                          : '--'}
                      </TableCell>
                      <TableCell>
                        {attempt.passed === true && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                            Passed
                          </Badge>
                        )}
                        {attempt.passed === false && (
                          <Badge variant="destructive" className="text-[10px]">
                            Failed
                          </Badge>
                        )}
                        {attempt.passed == null && (
                          <span className="text-muted-foreground text-xs">
                            --
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 4: Sessions & Activity ───────────────────────── */}
        <TabsContent value="sessions" className="mt-4 space-y-5">
          {/* Devices */}
          <Card className="p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Devices & Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {devices.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-xs">
                  No device data available.
                </p>
              ) : (
                <div className="space-y-0">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="border-border flex items-center gap-3 border-b py-3 last:border-0"
                    >
                      <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                        {device.platform?.toLowerCase().includes('mobile') ||
                        device.platform?.toLowerCase().includes('android') ||
                        device.platform?.toLowerCase().includes('ios') ? (
                          <Smartphone className="text-muted-foreground size-4" />
                        ) : (
                          <Monitor className="text-muted-foreground size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {device.device_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {device.platform}
                          </Badge>
                          <span className="text-muted-foreground text-[11px]">
                            First seen: {formatDate(device.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium">
                          {relativeTime(device.last_active_at)}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {formatDateTime(device.last_active_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-xs">
                  No activity data available.
                </p>
              ) : (
                <div className="relative pl-5">
                  <div className="bg-border absolute top-0 bottom-0 left-2 w-px" />
                  {recentActivity.slice(0, 20).map((item: any, i: number) => (
                    <div key={item.id ?? i} className="relative pb-4 last:pb-0">
                      <div
                        className={cn(
                          'absolute -left-3 top-1 size-2.5 rounded-full border-2 border-background',
                          item.status === 'completed'
                            ? 'bg-emerald-500'
                            : item.status === 'in_progress'
                              ? 'bg-blue-500'
                              : 'bg-muted-foreground',
                        )}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">
                            {item.lessonTitle ?? item.title ?? 'Activity'}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {item.courseTitle ?? ''}
                            {item.status && (
                              <span
                                className={cn(
                                  'ml-1.5 inline-block rounded px-1.5 py-0.5 text-[10px]',
                                  statusColor(item.status),
                                )}
                              >
                                {item.status}
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {formatDateTime(
                            item.completed_at ??
                              item.updated_at ??
                              item.created_at,
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
