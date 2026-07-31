import { auth } from '@/auth';
import { getMyEnrollments } from '@/server/student/courses.server';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const enrollments = await getMyEnrollments();
  return <DashboardClient enrollments={enrollments} user={session.user} />;
}
