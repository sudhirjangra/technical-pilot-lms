import { auth } from '@/auth';
import { getCourseBySlug, checkEnrollment } from '@/server/student/courses.server';
import { getMyReferralSummary } from '@/server/student/referrals.server';
import { CourseViewClient } from '@/components/courses/course-view-client';
import { notFound } from 'next/navigation';

export default async function CourseViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return notFound();

  const session = await auth();
  const isEnrolled = session?.user ? await checkEnrollment(course.id) : false;
  const referralSummary = session?.user && !isEnrolled ? await getMyReferralSummary() : null;

  return (
    <CourseViewClient
      course={course}
      isEnrolled={isEnrolled}
      isLoggedIn={!!session?.user}
      email={session?.user?.email}
      availableCoupon={referralSummary?.data?.available_coupon ?? null}
    />
  );
}
