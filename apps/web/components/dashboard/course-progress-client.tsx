'use client';

import { startChapter } from '@/server/student/chapters.server';
import type {
  StudentCourseProgress,
  StudentLessonProgress,
  CourseLeaderboardData,
} from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Progress } from '@repo/shadcn/progress';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  Lock,
  Medal,
  PlayCircle,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  Users,
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
        className="h-8 sm:h-9 px-2.5 text-xs sm:text-sm"
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
  locked = false,
}: {
  courseId: string;
  lesson: StudentLessonProgress;
  index: string;
  locked?: boolean;
}) {
  const Icon = LESSON_ICONS[lesson.lesson_type] ?? FileText;
  const status = lesson.progress?.status ?? 'not_started';
  const isSubmitted = status === 'completed';
  const due =
    lesson.lesson_type === 'assignment' && lesson.due_at && !isSubmitted
      ? dueState(lesson.due_at)
      : null;
  const submittedAt =
    lesson.lesson_type === 'assignment' && isSubmitted
      ? lesson.progress?.completed_at ?? null
      : null;

  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-8 shrink-0 text-xs text-muted-foreground">{index}</span>
        {locked ? (
          <Lock className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Icon className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-sm">{lesson.title}</span>
      </span>

      <span className="flex flex-wrap items-center gap-1.5">
        {submittedAt && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <CheckCircle2 className="size-3" />
            Submitted {formatDate(submittedAt)}
          </Badge>
        )}
        {!submittedAt && isSubmitted && lesson.lesson_type === 'assignment' && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <CheckCircle2 className="size-3" />
            Submitted
          </Badge>
        )}
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
              : lesson.assessment?.failed
                ? 'destructive'
                : status === 'in_progress'
                  ? 'secondary'
                  : 'outline'
          }
          className="text-[10px]"
        >
          {locked
            ? 'Locked'
            : status === 'completed'
              ? 'Done'
              : lesson.assessment?.failed
                ? 'Failed'
                : status === 'in_progress'
                  ? `${lesson.progress?.progress_percent ?? 0}%`
                  : 'Not Started'}
        </Badge>
      </span>
    </>
  );

  if (locked) {
    return (
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground opacity-60 sm:px-3">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/dashboard/courses/${courseId}/lessons/${lesson.id}`}
      className="flex min-h-9 flex-wrap items-center justify-between gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 sm:px-3"
    >
      {content}
    </Link>
  );
}

export function CourseProgressClient({
  courseId,
  progress,
  initialLeaderboard,
}: {
  courseId: string;
  progress: StudentCourseProgress | null;
  initialLeaderboard?: CourseLeaderboardData | null;
}) {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'leaderboard'>('curriculum');

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

  const leaderboard = initialLeaderboard?.leaderboard ?? [];
  const currentUserRank = initialLeaderboard?.currentUserRank ?? null;
  const totalEnrolled = initialLeaderboard?.totalEnrolled ?? leaderboard.length;

  return (
    <section className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← Dashboard
      </Link>

      <div className="mt-4 space-y-5 sm:mt-6 sm:space-y-6">
        {/* Header summary */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Course Overview</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Flight training progress & enrolled peer rankings
            </p>
          </div>
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

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Button
            variant={activeTab === 'curriculum' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('curriculum')}
            className="gap-2 h-9 text-xs"
          >
            <Compass className="h-4 w-4" />
            Curriculum & Lessons
          </Button>
          <Button
            variant={activeTab === 'leaderboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('leaderboard')}
            className="gap-2 h-9 text-xs"
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            Class Leaderboard
            {totalEnrolled > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {totalEnrolled}
              </Badge>
            )}
          </Button>
        </div>

        {/* Tab 1: Curriculum */}
        {activeTab === 'curriculum' && (
          <div className="space-y-4">
            {chapters.map((chapter, chapterIndex) => {
              const done = chapter.lessons.filter(
                (lesson) => lesson.progress?.status === 'completed',
              ).length;
              const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
              const unlocked =
                chapterIndex === 0 ||
                (previousChapter?.lessons.length
                  ? previousChapter.lessons.every(
                    (lesson) => lesson.progress?.status === 'completed',
                  )
                  : false);

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
                        {!unlocked ? ' · Locked' : ''}
                      </p>
                    </div>
                    {!unlocked ? (
                      <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                        <Lock className="size-3" />
                        Locked
                      </Badge>
                    ) : chapter.started_at ? (
                      <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                        <CheckCircle2 className="size-3" />
                        Started
                      </Badge>
                    ) : (
                      <StartChapterButton chapterId={chapter.id} courseId={courseId} />
                    )}
                  </CardHeader>

                  <CardContent className="space-y-1">
                    {!unlocked && (
                      <p className="mb-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                        Complete the previous chapter to unlock this content.
                      </p>
                    )}
                    {unlocked && !chapter.started_at && (
                      <p className="mb-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                        Press &ldquo;Start now&rdquo; to unlock the lessons in this chapter.
                      </p>
                    )}
                    {chapter.lessons.map((lesson, lessonIndex) => (
                      <LessonRow
                        key={lesson.id}
                        courseId={courseId}
                        lesson={lesson}
                        index={`${chapterIndex + 1}.${lessonIndex + 1}`}
                        locked={!unlocked || !chapter.started_at}
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
        )}

        {/* Tab 2: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-5">
            {/* Current user rank banner */}
            {currentUserRank && (
              <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-sm">
                      #{currentUserRank.rank}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{currentUserRank.fullName} (You)</span>
                        <Badge variant="outline" className="text-[10px] bg-background/80">
                          {currentUserRank.status === 'completed' ? 'Completed' : 'Enrolled'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ranked #{currentUserRank.rank} of {totalEnrolled} enrolled pilots in this course
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-border/60 sm:pl-4">
                    <div className="text-center">
                      <span className="block text-xs text-muted-foreground">Progress</span>
                      <span className="font-bold text-sm text-primary">{currentUserRank.progressPercent}%</span>
                    </div>
                    {currentUserRank.avgScore !== null && (
                      <div className="text-center">
                        <span className="block text-xs text-muted-foreground">Avg Score</span>
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {currentUserRank.avgScore}%
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <span className="block text-xs text-muted-foreground">Completed</span>
                      <span className="font-bold text-sm">
                        {currentUserRank.completedLessons}/{currentUserRank.totalLessons}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard Table / Cards */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Enrolled Pilots Ranking
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {leaderboard.length} student{leaderboard.length !== 1 ? 's' : ''} enrolled
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {leaderboard.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No active student rankings found for this course yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {leaderboard.map((entry) => {
                      const isTop1 = entry.rank === 1;
                      const isTop2 = entry.rank === 2;
                      const isTop3 = entry.rank === 3;

                      return (
                        <div
                          key={entry.studentId}
                          className={`flex items-center justify-between p-3.5 sm:px-5 transition-colors ${
                            entry.isCurrentUser ? 'bg-primary/5' : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                isTop1
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                                  : isTop2
                                    ? 'bg-slate-300/30 text-slate-700 dark:text-slate-300 border border-slate-400/40'
                                    : isTop3
                                      ? 'bg-amber-700/20 text-amber-700 dark:text-amber-500 border border-amber-700/40'
                                      : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${entry.rank}`}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm truncate">{entry.fullName}</span>
                                {entry.isCurrentUser && (
                                  <Badge variant="default" className="text-[9px] px-1 py-0 h-4">
                                    You
                                  </Badge>
                                )}
                                {entry.status === 'completed' && (
                                  <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 px-1 py-0 h-4">
                                    Graduated
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground block">
                                {entry.completedLessons} of {entry.totalLessons} lessons done
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {entry.avgScore !== null && (
                              <div className="hidden sm:block text-right">
                                <span className="text-[10px] text-muted-foreground block">Score</span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {entry.avgScore}%
                                </span>
                              </div>
                            )}
                            <div className="text-right w-20 sm:w-24">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-[10px] text-muted-foreground sm:hidden">Prog</span>
                                <span className="font-semibold text-xs ml-auto">{entry.progressPercent}%</span>
                              </div>
                              <Progress value={entry.progressPercent} className="h-1.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
