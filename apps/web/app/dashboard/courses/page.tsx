import { auth } from '@/auth';
import { getMyEnrollments } from '@/server/student/courses.server';
import { MyCoursesClient } from '@/components/dashboard/my-cources-client';
import { redirect } from 'next/navigation';

export default async function MyCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const enrollments = await getMyEnrollments();
  return <MyCoursesClient enrollments={enrollments} />;
}