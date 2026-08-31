'use client';

import { useState } from 'react';
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

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

export function StudentDetailClient({
  student,
  enrollments,
  progress,
}: {
  student: StudentDetail;
  enrollments: StudentEnrollment[];
  progress: ProgressRecord[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [attemptDialog, setAttemptDialog] = useState(false);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
  const [attemptType, setAttemptType] = useState<'assignment' | 'test'>('assignment');
  const [gradingState, setGradingState] = useState<
    Record<string, boolean | null>
  >({});
  const [gradingSaving, setGradingSaving] = useState(false);

  const isActive = student.is_active !== false;

  const completedLessons = progress.filter((p) => p.status === 'completed').length;
  const activeEnrollments = enrollments.filter((e) => e.status === 'active').length;

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

  return (
    <div className="space-y-6">
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
                  Score: {attemptDetail.score ?? '—'} /{' '}
                  {attemptDetail.max_score ?? '—'}
                </span>
                {attemptDetail.percentage != null && (
                  <span>({attemptDetail.percentage.toFixed(1)}%)</span>
                )}
                {attemptDetail.passed != null && (
                  <Badge variant={attemptDetail.passed ? 'default' : 'destructive'}>
                    {attemptDetail.passed ? 'Passed' : 'Failed'}
                  </Badge>
                )}
                {attemptDetail.time_spent_seconds != null && (
                  <span className="text-muted-foreground">
                    Time: {Math.round(attemptDetail.time_spent_seconds / 60)}m
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
                    </div>

                    {q.textAnswer && (
                      <div className="mt-1">
                        <p className="text-muted-foreground text-xs">
                          Student answer:
                        </p>
                        <p className="text-sm whitespace-pre-wrap rounded bg-muted/50 p-2">
                          {q.textAnswer}
                        </p>
                      </div>
                    )}

                    {q.selectedOptionIds && q.selectedOptionIds.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        Selected:{' '}
                        {q.selectedOptionIds.length} option
                        {q.selectedOptionIds.length > 1 ? 's' : ''}
                      </p>
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

      <div className="flex items-center gap-3">
        <Link
          href="/admin/students"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Students
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {student.full_name || student.email}
          </h1>
          <p className="text-muted-foreground text-sm">
            {student.email}
            {student.phone ? ` • ${student.phone}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge variant={student.role === 'admin' ? 'default' : 'secondary'}>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Enrollments" value={enrollments.length} />
        <StatCard label="Active Courses" value={activeEnrollments} />
        <StatCard label="Lessons Done" value={completedLessons} />
        <StatCard
          label="Member Since"
          value={formatDate(student.created_at)}
        />
      </div>

      <Tabs defaultValue="enrollments">
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="enrollments">
            Enrollments ({enrollments.length})
          </TabsTrigger>
          <TabsTrigger value="progress">
            Progress ({progress.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments" className="mt-4 space-y-3">
          {enrollments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No enrollments found.
            </p>
          ) : (
            enrollments.map((enrollment) => (
              <Card key={enrollment.id} className="gap-2 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {enrollment.courses?.title ?? enrollment.course_id}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Enrolled: {formatDate(enrollment.enrolled_at)}
                      {enrollment.completed_at &&
                        ` • Completed: ${formatDate(enrollment.completed_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={enrollment.status}
                      onValueChange={(value) =>
                        handleEnrollmentStatus(enrollment.id, value)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="expired">Access revoked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-4 space-y-3">
          {progress.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No progress records.
            </p>
          ) : (
            progress.map((record, idx) => (
              <Card key={record.id ?? idx} className="gap-1 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {record.lessons?.title ?? record.lesson_id}
                    </p>
                    {record.completed_at && (
                      <p className="text-muted-foreground text-xs">
                        Completed: {formatDate(record.completed_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        record.status === 'completed'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {record.status}
                    </Badge>
                    {record.progress_percent != null && (
                      <span className="text-muted-foreground text-xs">
                        {record.progress_percent}%
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
