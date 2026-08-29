'use client';

import { startChapter } from '@/server/student/chapters.server';
import type {
  StudentCourseProgress,
  StudentLessonProgress,
} from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Progress } from '@repo/shadcn/progress';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  PlayCircle,
  Timer,
} from '@repo/shadcn/lucide';
import Link from 'next/link';
import { useMemo, useState, useTransition, type ComponentType } from 'react';

const LESSON_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  video: PlayCircle,
  pdf: FileText,
  assignment: ClipboardList,
  test: Timer,
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function dueState(dueAt: string) {
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return null;
  const diffDays = Math.ceil((due - Date.now()) / 86_400_000);
  if (diffDays < 0) return { overdue: true, label: `Overdue by ${Math.abs(diffDays)}d` };
  return { overdue: false, label: diffDays === 0 ? 'Due today' : `${diffDays}d left` };
}

function StartChapterButton({
  chapterId,
  courseId,
}: {
  chapterId: string;
  courseId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={pending}
        className="h-11 sm:h-9"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startChapter(chapterId, `/dashboard/courses/${courseId}`);
            if (result.error) setError(result.error);
          })
        }
      >
        {pending ? 'Starting…' : 'Start now'}
      </Button>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

function LessonRow({
  courseId,
  lesson,
  index,
}: {
  courseId: string;
  lesson: StudentLessonProgress;
  index: string;
}) {
  const Icon = LESSON_ICONS[lesson.lesson_type] ?? FileText;
  const status = lesson.progress?.status ?? 'not_started';
  const due =
    lesson.lesson_type === 'assignment' && lesson.due_at ? dueState(lesson.due_at) : null;

  return (
    <Link
      href={`/dashboard/courses/${courseId}/lessons/${lesson.id}`}
      className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted/60 sm:px-3"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-8 shrink-0 text-xs text-muted-foreground">{index}</span>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm">{lesson.title}</span>
      </span>

      <span className="flex flex-wrap items-center gap-1.5">
        {due && lesson.due_at && (
          <Badge variant={due.overdue ? 'destructive' : 'secondary'} className="text-[10px]">
            {due.overdue && <AlertTriangle className="size-3" />}
            Due {formatDate(lesson.due_at)} · {due.label}
          </Badge>
        )}
        <Badge
          variant={
            status === 'completed'
              ? 'default'
              : status === 'in_progress'
                ? 'secondary'
                : 'outline'
          }
          className="text-[10px]"
        >
          {status === 'completed'
            ? 'Done'
            : status === 'in_progress'
              ? `${lesson.progress?.progress_percent ?? 0}%`
              : 'Not Started'}
        </Badge>
      </span>
    </Link>
  );
}

export function CourseProgressClient({
  courseId,
  progress,
}: {
  courseId: string;
  progress: StudentCourseProgress | null;
}) {
  const chapters = useMemo(
    () =>
      [...(progress?.chapters ?? [])]
        .map((chapter) => ({
          ...chapter,
          lessons: [...chapter.lessons].sort(
            (left, right) => left.sort_order - right.sort_order,
          ),
        }))
        .sort((left, right) => left.sort_order - right.sort_order),
    [progress],
  );

  if (!progress) {
    return (
      <section className="container py-8">
        <p className="text-muted-foreground">
          Unable to load course progress. You may not be enrolled.
        </p>
        <Link href="/dashboard">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← Dashboard
      </Link>

      <div className="mt-4 space-y-5 sm:mt-6 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold sm:text-2xl">Course Progress</h1>
          <div className="flex items-center gap-3">
            <Badge
              variant={progress.overall_status === 'completed' ? 'default' : 'secondary'}
            >
              {progress.overall_status === 'completed'
                ? 'Completed'
                : progress.overall_status === 'in_progress'
                  ? 'In Progress'
                  : 'Not Started'}
            </Badge>
            <span className="text-sm font-medium">{progress.overall_percent}%</span>
            <Progress value={progress.overall_percent} className="w-24 sm:w-32" />
          </div>
        </div>

        {chapters.map((chapter, chapterIndex) => {
          const done = chapter.lessons.filter(
            (lesson) => lesson.progress?.status === 'completed',
          ).length;

          return (
            <Card key={chapter.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    {chapterIndex + 1}. {chapter.title}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {done}/{chapter.lessons.length} lessons
                    {chapter.started_at
                      ? ` · Started ${formatDate(chapter.started_at)}`
                      : ''}
                  </p>
                </div>
                {chapter.started_at ? (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                    <CheckCircle2 className="size-3" />
                    Started
                  </Badge>
                ) : (
                  <StartChapterButton chapterId={chapter.id} courseId={courseId} />
                )}
              </CardHeader>

              <CardContent className="space-y-1">
                {chapter.lessons.map((lesson, lessonIndex) => (
                  <LessonRow
                    key={lesson.id}
                    courseId={courseId}
                    lesson={lesson}
                    index={`${chapterIndex + 1}.${lessonIndex + 1}`}
                  />
                ))}
                {chapter.lessons.length === 0 && (
                  <p className="px-3 text-sm text-muted-foreground">No lessons</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
