import { auth } from '@/auth';
import { VideoPlayer } from '@/components/video-player';
import { redirect } from 'next/navigation';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const { courseId, lessonId } = await params;

  return (
    <section className="min-h-dvh container py-8 max-w-4xl mx-auto">
      <a
        href={`/dashboard/courses/${courseId}`}
        className="text-muted-foreground hover:underline text-sm"
      >
        ← Course Progress
      </a>

      <div className="mt-6">
        <VideoPlayer lessonId={lessonId} userEmail={session.user.email ?? ''} />
      </div>
    </section>
  );
}
