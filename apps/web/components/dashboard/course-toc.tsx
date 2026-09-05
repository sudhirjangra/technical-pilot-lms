'use client';

import type {
  StudentChapterProgress,
  StudentCourseProgress,
  StudentLessonProgress,
} from '@/server/student/courses.server';
import { startChapter } from '@/server/student/chapters.server';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@repo/shadcn/accordion';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Progress } from '@repo/shadcn/progress';
import { ScrollArea } from '@repo/shadcn/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@repo/shadcn/sheet';
import { cn } from '@repo/shadcn/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  ListTree,
  Lock,
  PlayCircle,
  PlayCircle as PlayIcon,
  Timer,
} from '@repo/shadcn/lucide';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, useTransition, type ComponentType } from 'react';

const LESSON_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  video: PlayCircle,
  pdf: FileText,
  assignment: ClipboardList,
  test: Timer,
};

const LESSON_TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  pdf: 'PDF Note',
  assignment: 'Assignment',
  test: 'Test',
};

function lessonStatus(lesson: StudentLessonProgress) {
  return lesson.progress?.status ?? 'not_started';
}

/** Defensive re-sort so student ordering can never diverge from admin ordering. */
function sortStructure(chapters: StudentChapterProgress[]): StudentChapterProgress[] {
  return [...chapters]
    .map((chapter) => ({
      ...chapter,
      lessons: [...(chapter.lessons ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order,
      ),
    }))
    .sort((left, right) => left.sort_order - right.sort_order);
}

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
  if (diffDays < 0) {
    return { overdue: true, label: `Overdue by ${Math.abs(diffDays)}d` };
  }
  return {
    overdue: false,
    label: diffDays === 0 ? 'Due today' : `${diffDays}d left`,
  };
}

/**
 * Check if a chapter is unlocked. Unlocked if it's the first chapter or
 * if all lessons in the previous chapter are completed.
 */
function isChapterUnlocked(
  chapters: StudentChapterProgress[],
  currentChapterIndex: number,
): boolean {
  if (currentChapterIndex === 0) return true;

  const previousChapter = chapters[currentChapterIndex - 1];
  if (!previousChapter?.lessons) return true;

  // All lessons in previous chapter must be completed
  return previousChapter.lessons.every(
    (lesson) => lesson.progress?.status === 'completed',
  );
}

function LessonStatusIcon({ status, failed }: { status: string; failed?: boolean }) {
  if (status === 'completed') {
    return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />;
  }
  if (failed) {
    return <AlertTriangle className="size-4 shrink-0 text-destructive" />;
  }
  if (status === 'in_progress') {
    return <PlayIcon className="size-4 shrink-0 text-amber-500" />;
  }
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />;
}

function ChapterStartControls({
  chapter,
  courseId,
}: {
  chapter: StudentChapterProgress;
  courseId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (chapter.started_at) {
    return (
      <p className="px-2 pb-2 text-[11px] text-muted-foreground">
        Started {formatDate(chapter.started_at)}
      </p>
    );
  }

  return (
    <div className="px-2 pb-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        className="h-9 w-full text-xs md:h-8"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startChapter(
              chapter.id,
              `/dashboard/courses/${courseId}`,
            );
            if (result.error) setError(result.error);
          })
        }
      >
        {pending ? 'Starting…' : 'Start now'}
      </Button>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function TocBody({
  courseId,
  progress,
  activeLessonId,
  onNavigate,
}: {
  courseId: string;
  progress: StudentCourseProgress;
  activeLessonId: string | null;
  onNavigate?: () => void;
}) {
  const chapters = useMemo(() => sortStructure(progress.chapters), [progress.chapters]);

  const defaultOpen = useMemo(() => {
    const active = chapters.find((chapter) =>
      chapter.lessons.some((lesson) => lesson.id === activeLessonId),
    );
    return active ? [active.id] : chapters[0] ? [chapters[0].id] : [];
  }, [chapters, activeLessonId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Course Content
          </span>
          <span className="text-xs font-medium">{progress.overall_percent}%</span>
        </div>
        <Progress value={progress.overall_percent} className="h-2" />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <Accordion
          type="multiple"
          defaultValue={defaultOpen}
          className="w-full px-2 py-2"
        >
          {chapters.map((chapter, chapterIndex) => {
            const total = chapter.lessons.length;
            const done = chapter.lessons.filter(
              (lesson) => lessonStatus(lesson) === 'completed',
            ).length;
            const chapterUnlocked = isChapterUnlocked(chapters, chapterIndex);
            const isFirstLockedChapter = !chapterUnlocked && (chapterIndex === 0 || isChapterUnlocked(chapters, chapterIndex - 1));
            // Unlocking a chapter only exposes the Start action; lessons stay locked until started.
            const lessonsUnlocked = chapterUnlocked && !!chapter.started_at;

            return (
              <AccordionItem key={chapter.id} value={chapter.id} className="border-b-0">
                <AccordionTrigger className={cn(
                  'min-h-9 sm:min-h-10 gap-2 rounded-md px-2 py-1.5 text-left hover:no-underline',
                  chapterUnlocked ? 'hover:bg-muted/60' : 'opacity-60 cursor-not-allowed',
                )}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {chapterIndex + 1}. {chapter.title}
                      </p>
                      {!chapterUnlocked && (
                        <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {done}/{total} lessons
                      {!chapterUnlocked && ' • Locked'}
                    </p>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pb-2">
                  {!chapterUnlocked && isFirstLockedChapter && (
                    <p className="mb-3 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                      Complete the previous chapter to unlock this content.
                    </p>
                  )}
                  
                  {chapterUnlocked && <ChapterStartControls chapter={chapter} courseId={courseId} />}

                  {chapterUnlocked && !chapter.started_at && (
                    <p className="mb-2 px-2 text-[11px] text-muted-foreground">
                      Start this chapter to unlock its lessons.
                    </p>
                  )}

                  <ul className="space-y-0.5">
                    {chapter.lessons.map((lesson, lessonIndex) => {
                      const Icon = LESSON_ICONS[lesson.lesson_type] ?? FileText;
                      const status = lessonStatus(lesson);
                      const isActive = lesson.id === activeLessonId;
                      const isSubmitted = status === 'completed';
                      const submittedAt =
                        lesson.lesson_type === 'assignment' && isSubmitted
                          ? lesson.progress?.completed_at ?? null
                          : null;
                      const due =
                        lesson.lesson_type === 'assignment' && lesson.due_at && !isSubmitted
                          ? dueState(lesson.due_at)
                          : null;

                      return (
                        <li key={lesson.id}>
                          {lessonsUnlocked ? (
                            <Link
                              href={`/dashboard/courses/${courseId}/lessons/${lesson.id}`}
                              onClick={onNavigate}
                              aria-current={isActive ? 'page' : undefined}
                              className={cn(
                                'flex min-h-9 sm:min-h-10 items-start gap-2 rounded-md px-2 py-1.5 text-xs sm:text-sm transition-colors',
                                isActive
                                  ? 'bg-primary/10 font-medium text-primary'
                                  : 'text-foreground/80 hover:bg-muted/60',
                              )}
                            >
                              <LessonStatusIcon
                                status={status}
                                failed={lesson.assessment?.failed}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <Icon
                                    className={cn(
                                      'size-3.5 shrink-0',
                                      isActive ? 'text-primary' : 'text-muted-foreground',
                                    )}
                                  />
                                  <span className="truncate">
                                    {chapterIndex + 1}.{lessonIndex + 1} {lesson.title}
                                  </span>
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-1">
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {LESSON_TYPE_LABELS[lesson.lesson_type] ??
                                      lesson.lesson_type}
                                  </Badge>
                                  {status === 'in_progress' && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                      {lesson.progress?.progress_percent ?? 0}%
                                    </Badge>
                                  )}
                                  {lesson.assessment?.failed && status !== 'completed' && (
                                    <Badge variant="destructive" className="gap-1 text-[10px] px-1 py-0">
                                      <AlertTriangle className="size-3" />
                                      Failed
                                    </Badge>
                                  )}
                                  {isSubmitted && lesson.lesson_type === 'assignment' && (
                                    <Badge variant="secondary" className="gap-1 text-[10px] px-1 py-0">
                                      <CheckCircle2 className="size-3" />
                                      Submitted{submittedAt ? ` ${formatDate(submittedAt)}` : ''}
                                    </Badge>
                                  )}
                                  {due && lesson.due_at && (
                                    <Badge
                                      variant={due.overdue ? 'destructive' : 'secondary'}
                                      className="gap-1 text-[10px] px-1 py-0"
                                    >
                                      {due.overdue && (
                                        <AlertTriangle className="size-3" />
                                      )}
                                      Due {formatDate(lesson.due_at)} · {due.label}
                                    </Badge>
                                  )}
                                </span>
                              </span>
                            </Link>
                          ) : (
                            <div className={cn(
                              'flex min-h-9 sm:min-h-10 items-start gap-2 rounded-md px-2 py-1.5 text-xs sm:text-sm',
                              'text-muted-foreground/60 opacity-60 cursor-not-allowed'
                            )}>
                              <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <Icon
                                    className="size-3.5 shrink-0 text-muted-foreground/50"
                                  />
                                  <span className="truncate">
                                    {chapterIndex + 1}.{lessonIndex + 1} {lesson.title}
                                  </span>
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-1">
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {LESSON_TYPE_LABELS[lesson.lesson_type] ??
                                      lesson.lesson_type}
                                  </Badge>
                                </span>
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}

                    {total === 0 && (
                      <li className="px-2 py-2 text-xs text-muted-foreground">
                        No lessons yet
                      </li>
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}

          {chapters.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              No chapters published yet.
            </p>
          )}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

export function CourseToc({
  courseId,
  progress,
}: {
  courseId: string;
  progress: StudentCourseProgress | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeLessonId = useMemo(() => {
    const match = pathname.match(/\/lessons\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  if (!progress) return null;

  return (
    <>
      {/* Mobile: drawer toggle */}
      <div className="shrink-0 border-b border-border/60 bg-background/80 px-3 py-1.5 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-full justify-start gap-2 text-xs sm:text-sm">
              <ListTree className="size-3.5 sm:size-4" />
              Course Content
              <span className="ml-auto text-xs text-muted-foreground">
                {progress.overall_percent}%
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Course Content</SheetTitle>
            </SheetHeader>
            <TocBody
              courseId={courseId}
              progress={progress}
              activeLessonId={activeLessonId}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: persistent sidebar */}
      <aside className="hidden h-full w-72 shrink-0 overflow-hidden border-r border-border/60 md:block lg:w-80">
        <div className="h-full min-h-0">
          <TocBody
            courseId={courseId}
            progress={progress}
            activeLessonId={activeLessonId}
          />
        </div>
      </aside>
    </>
  );
}
