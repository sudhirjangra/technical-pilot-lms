'use client';

import { Course } from '@/server/admin/courses.server';
import {
  createEnrollment,
  Enrollment,
  EnrollmentsMeta,
  getEnrollments,
  getAssessmentAttempts,
  getStudentCourseProgress,
  type AdminCourseProgress,
  type AssessmentAttempt,
} from '@/server/admin/enrollments.server';
import { getAttemptDetail, type AttemptDetail } from '@/server/admin/students.server';
import { AdminUser } from '@/server/admin/users.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/shadcn/command';
import { Check, ChevronsUpDown } from '@repo/shadcn/lucide';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/shadcn/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import { toast } from '@repo/shadcn/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/shadcn/table';
import { cn } from '@repo/shadcn/lib/utils';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  EmptyState,
  FilterField,
  SearchInput,
  TablePagination,
  TableSkeletonRows,
  useDebouncedValue,
} from './data-toolbar';

const PAGE_SIZE = 20;

function EntityPicker({
  items,
  value,
  onChange,
  placeholder,
  emptyText,
  searchPlaceholder,
  id,
}: {
  items: { id: string; label: string; hint?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyText: string;
  searchPlaceholder: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between font-normal sm:h-9"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.hint ?? ''}`}
                  onSelect={() => {
                    onChange(item.id === value ? '' : item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      item.id === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{item.label}</span>
                    {item.hint && (
                      <span className="text-muted-foreground truncate text-xs">
                        {item.hint}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function EnrollmentsClient({
  courses,
  students,
}: {
  courses: Course[];
  students: AdminUser[];
}) {
  const [courseId, setCourseId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [meta, setMeta] = useState<EnrollmentsMeta>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [courseProgress, setCourseProgress] = useState<AdminCourseProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [assessmentAttempts, setAssessmentAttempts] = useState<Record<string, AssessmentAttempt[]>>({});
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const openProgress = async (enrollment: Enrollment) => {
    setCourseProgress(null);
    setProgressDialogOpen(true);
    setProgressLoading(true);
    setAttemptsLoading(true);
    setAssessmentAttempts({});
    setSelectedStudentId(enrollment.student_id);
    setSelectedAttempt(null);
    setAttemptDetail(null);
    const result = await getStudentCourseProgress(enrollment.course_id, enrollment.student_id);
    setCourseProgress(result);
    setProgressLoading(false);
    if (result) {
      const assessments = result.chapters.flatMap((chapter) =>
        chapter.lessons.flatMap((lesson) => [
          ...lesson.assignments.map((assessment) => ({ ...assessment, type: 'assignment' as const })),
          ...lesson.tests.map((assessment) => ({ ...assessment, type: 'test' as const })),
        ]),
      );
      const attemptEntries = await Promise.all(
        assessments.map(async (assessment) => [
          `${assessment.type}:${assessment.id}`,
          await getAssessmentAttempts(assessment.id, assessment.type),
        ] as const),
      );
      setAssessmentAttempts(Object.fromEntries(attemptEntries));
    }
    setAttemptsLoading(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getEnrollments({
      courseId: courseId || undefined,
      status,
      search: debouncedSearch,
      page,
      limit: PAGE_SIZE,
    });
    setEnrollments(result.data);
    setMeta(result.meta);
    setLoading(false);
  }, [courseId, status, debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [courseId, status, debouncedSearch]);

  const handleEnroll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courseId || !studentId) {
      toast.error('Select both a course and a student');
      return;
    }
    setEnrolling(true);
    const result = await createEnrollment(studentId, courseId);
    setEnrolling(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Student enrolled');
    setStudentId('');
    setEnrollDialogOpen(false);
    void load();
  };

  const total = meta.total;
  const limit = meta.limit || PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Enrollments</h1>
          <p className="text-muted-foreground text-xs">{total} matching enrollments</p>
        </div>
        <Button onClick={() => setEnrollDialogOpen(true)}>+ Manual Enrollment</Button>
      </div>

      <Card className="gap-3 py-3">
        <CardHeader className="px-3 sm:px-4">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-4">
          <FilterField label="Course" className="w-full sm:w-64">
            <EntityPicker
              id="enrollment-course-filter"
              items={courses.map((course) => ({
                id: course.id,
                label: course.title,
                hint: `/${course.slug}`,
              }))}
              value={courseId}
              onChange={setCourseId}
              placeholder="All courses"
              searchPlaceholder="Search courses..."
              emptyText="No courses found."
            />
          </FilterField>
          <FilterField label="Status" className="w-full sm:w-40">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Search" className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search student name or email"
              className="sm:max-w-none"
            />
          </FilterField>
        </CardContent>
      </Card>

      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent
          className="border-white/20 bg-white/20 shadow-[0_20px_80px_rgba(15,23,42,0.35)] backdrop-blur-[18px] sm:max-w-md dark:bg-slate-900/40"
          overlayClassName="backdrop-blur-md bg-slate-950/35"
        >
          <DialogHeader>
            <DialogTitle>Manual Enrollment</DialogTitle>
            <DialogDescription>
              Select a student and a course to create a new enrollment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEnroll} className="flex flex-col gap-4">
            <FilterField label="Student" className="w-full">
              <EntityPicker
                id="enrollment-student"
                items={students.map((student) => ({
                  id: student.id,
                  label: student.full_name ?? student.email,
                  hint: student.email,
                }))}
                value={studentId}
                onChange={setStudentId}
                placeholder="Select student"
                searchPlaceholder="Search students..."
                emptyText="No students found."
              />
            </FilterField>
            <FilterField label="Course" className="w-full">
              <EntityPicker
                items={courses.map((course) => ({
                  id: course.id,
                  label: course.title,
                  hint: `/${course.slug}`,
                }))}
                value={courseId}
                onChange={setCourseId}
                placeholder="Select course"
                searchPlaceholder="Search courses..."
                emptyText="No courses found."
              />
            </FilterField>
            <DialogFooter>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={enrolling || !courseId || !studentId}
              >
                {enrolling ? 'Enrolling...' : 'Enroll Student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,760px)] max-w-[96vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Course Progress</DialogTitle>
            <DialogDescription>Chapter and lesson completion for this enrollment.</DialogDescription>
          </DialogHeader>
          {progressLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading progress...</p>
          ) : !courseProgress ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Unable to load progress.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium">Overall progress: {courseProgress.overall_percent}%</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Assessment history</p>
                  {attemptsLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
                </div>
                {courseProgress.chapters.flatMap((chapter) => chapter.lessons.flatMap((lesson) => {
                  const assessments = [
                    ...lesson.assignments.map((assessment) => ({ ...assessment, type: 'assignment' as const })),
                    ...lesson.tests.map((assessment) => ({ ...assessment, type: 'test' as const })),
                  ];
                  return assessments.map((assessment) => {
                    const attempts = (assessmentAttempts[`${assessment.type}:${assessment.id}`] ?? [])
                      .filter((attempt) => attempt.student_id === selectedStudentId);
                    return (
                      <details key={`${assessment.type}:${assessment.id}`} className="rounded-md border px-3 py-2">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-medium">{assessment.title ?? 'Untitled assessment'}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{attempts.length} attempt{attempts.length === 1 ? '' : 's'}</span>
                        </summary>
                        <div className="mt-2 space-y-2">
                          {attempts.length === 0 ? <p className="text-xs text-muted-foreground">No attempts recorded.</p> : attempts.map((attempt, index) => {
                            const percentage = attempt.percentage ?? 0;
                            return (
                              <div key={attempt.id} className="rounded border bg-muted/20 p-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium">Attempt {attempts.length - index}</span>
                                  <span>{attempt.score ?? 0}/{attempt.max_score ?? 0} ({Math.round(percentage)}%)</span>
                                  <Badge variant={attempt.passed ? 'default' : 'secondary'}>{attempt.passed ? 'Passed' : 'Not passed'}</Badge>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} /></div>
                                <p className="mt-1 text-muted-foreground">Started {new Date(attempt.started_at).toLocaleString()} · {formatDuration(attempt.time_spent_seconds)}</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-7 px-0 text-xs"
                                  onClick={async () => {
                                    const key = `${assessment.type}:${attempt.id}`;
                                    if (selectedAttempt === key) {
                                      setSelectedAttempt(null);
                                      setAttemptDetail(null);
                                      return;
                                    }
                                    setSelectedAttempt(key);
                                    setAttemptDetail(null);
                                    setAttemptDetail(await getAttemptDetail(attempt.id, assessment.type));
                                  }}
                                >
                                  {selectedAttempt === `${assessment.type}:${attempt.id}` ? 'Hide questions' : 'Review questions'}
                                </Button>
                                {selectedAttempt === `${assessment.type}:${attempt.id}` && attemptDetail && (
                                  <div className="mt-2 space-y-2 border-t pt-2">
                                    {attemptDetail.questionReview?.map((question, questionIndex) => (
                                      <div key={question.questionId} className="rounded border bg-background/60 p-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="min-w-0 text-xs font-medium">{questionIndex + 1}. {question.questionText}</p>
                                          <Badge variant={question.isCorrect ? 'default' : question.isCorrect === false ? 'destructive' : 'secondary'} className="shrink-0 text-[10px]">
                                            {question.pointsEarned ?? (question.isCorrect ? question.points ?? 0 : 0)}/{question.points ?? 0} pts
                                          </Badge>
                                        </div>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                          {question.isCorrect === true ? 'Correct' : question.isCorrect === false ? 'Incorrect' : 'Ungraded'} · {formatDuration(question.timeSpentSeconds)}
                                        </p>
                                        {question.textAnswer && <p className="mt-1 whitespace-pre-wrap text-[11px]">Answer: {question.textAnswer}</p>}
                                        {question.selectedOptionTexts?.length ? <p className="text-[11px] text-muted-foreground">Selected: {question.selectedOptionTexts.join(', ')}</p> : null}
                                        {question.correctOptionTexts?.length ? <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Correct answer: {question.correctOptionTexts.join(', ')}</p> : null}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  });
                }))}
              </div>
              {courseProgress.chapters.map((chapter, chapterIndex) => {
                const lessons = chapter.lessons ?? [];
                const chapterPercent = lessons.length
                  ? Math.round(lessons.reduce((sum, lesson) => sum + (lesson.progress?.status === 'completed' ? 100 : lesson.progress?.progress_percent ?? 0), 0) / lessons.length)
                  : 0;
                return (
                  <Card key={chapter.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-medium">{chapterIndex + 1}. {chapter.title ?? 'Untitled chapter'}</p>
                      <Badge variant="secondary">{chapterPercent}%</Badge>
                    </div>
                    <div className="space-y-2">
                      {lessons.map((lesson, lessonIndex) => {
                        const percent = lesson.progress?.status === 'completed' ? 100 : lesson.progress?.progress_percent ?? 0;
                        return <div key={lesson.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-muted-foreground">{chapterIndex + 1}.{lessonIndex + 1} {lesson.title ?? 'Untitled lesson'}</span>
                          <span className="shrink-0">{lesson.lesson_type === 'pdf' ? (percent === 100 ? 'Completed' : 'Not completed') : `${percent}%`}</span>
                        </div>;
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!loading && enrollments.length === 0 ? (
        <EmptyState
          title="No enrollments found"
          description="Adjust the course, status, or search filters."
        />
      ) : (
        <Card className="gap-0 py-0">
          <div className="w-full overflow-x-auto px-6 sm:px-8">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-1.5 text-xs uppercase">Student</TableHead>
                  <TableHead className="hidden px-2 py-1.5 text-xs uppercase md:table-cell">
                    Course
                  </TableHead>
                  <TableHead className="hidden px-2 py-1.5 text-xs uppercase sm:table-cell">
                    Enrolled
                  </TableHead>
                  <TableHead className="px-2 py-1.5 text-xs uppercase">Status</TableHead>
                  <TableHead className="px-2 py-1.5 text-xs uppercase">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeletonRows rows={5} columns={4} />
                ) : (
                  enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="max-w-[220px] py-2">
                        <div className="flex flex-col">
                          <span className="truncate font-medium">
                            {enrollment.profiles?.full_name ??
                              enrollment.profiles?.email ??
                              enrollment.student_id}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {enrollment.profiles?.email ?? ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-[220px] py-2 text-xs md:table-cell">
                        <Link
                          href={`/admin/courses/${enrollment.course_id}/analytics`}
                          className="truncate hover:underline"
                        >
                          {enrollment.courses?.title ?? enrollment.course_id}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden py-2 text-xs sm:table-cell">
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant={
                            enrollment.status === 'active' ? 'default' : 'secondary'
                          }
                        >
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button size="sm" variant="outline" onClick={() => void openProgress(enrollment)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-5 pb-3 sm:px-6">
            <TablePagination
              page={page}
              pageCount={pageCount}
              from={from}
              to={to}
              total={total}
              onPageChange={setPage}
              label="enrollments"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
