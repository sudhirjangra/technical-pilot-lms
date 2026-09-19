import { auth } from '@/auth';
import { CourseBrowseClient } from '@/components/courses/browse-client';
import {
  getPublicCategories,
  getPublishedCourses,
  getMyEnrollments,
} from '@/server/student/courses.server';
import { getMyActiveCoupon } from '@/server/student/referrals.server';

export default async function CoursesPage() {
  const [courses, categories, session] = await Promise.all([
    getPublishedCourses(),
    getPublicCategories(),
    auth(),
  ]);

  let enrolledCourseIds: string[] = [];
  let activeCoupon = null;
  if (session?.user) {
    const [enrollments, coupon] = await Promise.all([
      getMyEnrollments(),
      getMyActiveCoupon(),
    ]);
    enrolledCourseIds = enrollments.map((e) => e.course_id);
    activeCoupon = coupon;
  }

  const available = courses.filter((c) => !enrolledCourseIds.includes(c.id));
  return (
    <CourseBrowseClient
      courses={available}
      categories={categories}
      activeCoupon={activeCoupon}
    />
  );
}
