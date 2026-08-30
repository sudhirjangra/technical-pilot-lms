import { auth } from '@/auth';
import { LessonPlaceholder } from '@/components/dashboard/lesson-placeholder';
import { LessonProgressActions } from '@/components/dashboard/lesson-progress-actions';
import { PDFViewer } from '@/components/dashboard/pdf-viewer';
import { TestViewer } from '@/components/dashboard/test-viewer';
import { VideoPlayer } from '@/components/video-player';
import { getCourseProgress } from '@/server/student/courses.server';
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
  const progress = await getCourseProgress(courseId);

  const orderedLessons = progress?.chapters
    .flatMap((chapter) => chapter.lessons)
    .sort((left, right) => left.sort_order - right.sort_order) ?? [];

  const lessonIndex = orderedLessons.findIndex((item) => item.id === lessonId);
  const lesson = orderedLessons[lessonIndex];
  const prevLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < orderedLessons.length - 1
    ? orderedLessons[lessonIndex + 1]
    : null;

  const lessonType = lesson?.lesson_type ?? 'video';
  const allowProgressControls = lessonType === 'video' || lessonType === 'pdf';

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

      <div className="mt-4 sm:mt-6">
        {lessonType === 'video' ? (
          <VideoPlayer lessonId={lessonId} />
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
    </section>
  );
}
