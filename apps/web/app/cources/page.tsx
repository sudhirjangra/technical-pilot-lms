import { auth } from '@/auth';
import { MyCourcesClient } from '@/components/dashboard/my-cources-client';
import { getMyEnrollments } from '@/server/student/courses.server';
import { redirect } from 'next/navigation';

export default async function CourcesPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const enrollments = await getMyEnrollments();
  return <MyCourcesClient enrollments={enrollments} />;
}