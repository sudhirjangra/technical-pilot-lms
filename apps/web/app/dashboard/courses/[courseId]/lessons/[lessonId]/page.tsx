import { auth } from '@/auth';
import { LessonPlaceholder } from '@/components/dashboard/lesson-placeholder';
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

  const lesson = progress?.chapters
    .flatMap((chapter) => chapter.lessons)
    .find((item) => item.id === lessonId);

  const lessonType = lesson?.lesson_type ?? 'video';

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
        ) : (
          <LessonPlaceholder lessonType={lessonType} title={lesson?.title} />
        )}
      </div>
    </section>
  );
}
