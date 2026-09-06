import { auth } from '@/auth';
import { AccessRevokedView } from '@/components/dashboard/access-revoked-view';
import { LessonPlaceholder } from '@/components/dashboard/lesson-placeholder';
import { LessonProgressActions } from '@/components/dashboard/lesson-progress-actions';
import { PDFViewer } from '@/components/dashboard/pdf-viewer';
import { TestViewer } from '@/components/dashboard/test-viewer';
import { VideoPlayer } from '@/components/video-player';
import { getCourseProgress, getMyEnrollments } from '@/server/student/courses.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent } from '@repo/shadcn/card';
import { Lock } from '@repo/shadcn/lucide';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const { courseId, lessonId } = await params;

  const enrollments = await getMyEnrollments();
  const enrollment = enrollments.find((e) => e.course_id === courseId);

  if (enrollment && enrollment.status === 'expired') {
    return (
      <AccessRevokedView
        courseTitle={enrollment.courses?.title}
        courseSlug={enrollment.courses?.slug}
      />
    );
  }

  const progress = await getCourseProgress(courseId);

  if (!progress && enrollment?.status === 'expired') {
    return (
      <AccessRevokedView
        courseTitle={enrollment?.courses?.title}
        courseSlug={enrollment?.courses?.slug}
      />
    );
  }

  // Lesson sort_order is scoped per chapter, so a global sort would interleave chapters.
  const orderedChapters = [...(progress?.chapters ?? [])].sort(
    (left, right) => left.sort_order - right.sort_order,
  );
  const orderedLessons = orderedChapters.flatMap((chapter) =>
    [...chapter.lessons]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((lesson) => ({ lesson, chapter })),
  );

  const lessonIndex = orderedLessons.findIndex((item) => item.lesson.id === lessonId);
  const current = orderedLessons[lessonIndex];
  const lesson = current?.lesson;
  const chapter = current?.chapter;
  const prevLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1]?.lesson : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < orderedLessons.length - 1
    ? orderedLessons[lessonIndex + 1]?.lesson
    : null;

  const lessonType = lesson?.lesson_type ?? 'video';
  const allowProgressControls = lessonType === 'video' || lessonType === 'pdf';
  const chapterStarted = !!chapter?.started_at;

  return (
    <section className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Course Progress
      </Link>

      {lesson && (
        <h1 className="mt-3 text-lg font-semibold sm:text-xl">{lesson.title}</h1>
      )}

      {chapter && !chapterStarted ? (
        <Card className="mt-4 sm:mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Lock className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">
              Start &ldquo;{chapter.title}&rdquo; to unlock this lesson
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Lessons in a chapter only become available once you start the chapter. Starting
              also anchors the due dates for its assignments.
            </p>
            <Button asChild size="sm">
              <Link href={`/dashboard/courses/${courseId}`}>Go to chapter</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-4 sm:mt-6">
            {lessonType === 'video' ? (
              <div className="space-y-4">
                <VideoPlayer lessonId={lessonId} />
                {lesson?.description && (
                  <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 sm:p-6">
                      <h3 className="text-sm font-semibold text-foreground/90 mb-2">Lesson Overview</h3>
                      <div
                        className="prose-article prose dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: lesson.description }}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : lessonType === 'pdf' ? (
              <PDFViewer lessonId={lessonId} studentEmail={session.user?.email} />
            ) : lessonType === 'test' ? (
              <TestViewer lessonId={lessonId} courseId={courseId} mode="test" />
            ) : lessonType === 'assignment' ? (
              <TestViewer lessonId={lessonId} courseId={courseId} mode="assignment" />
            ) : (
              <LessonPlaceholder lessonType={lessonType} title={lesson?.title} />
            )}
          </div>

          {allowProgressControls && (
            <LessonProgressActions
              courseId={courseId}
              lessonId={lessonId}
              prevLessonId={prevLesson?.id ?? null}
              nextLessonId={nextLesson?.id ?? null}
              lessonType={lessonType}
            />
          )}
        </>
      )}
    </section>
  );
}
