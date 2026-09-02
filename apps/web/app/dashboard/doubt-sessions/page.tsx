import { auth } from '@/auth';
import { getUpcomingSlots, getMyBookings } from '@/server/doubt-sessions.server';
import { getMyQueries } from '@/server/student-queries.server';
import { StudentDoubtClient } from '@/components/dashboard/doubt-client';
import { redirect } from 'next/navigation';

export default async function StudentDoubtPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const [slots, bookings, queries] = await Promise.all([
    getUpcomingSlots(),
    getMyBookings(),
    getMyQueries(),
  ]);

  return <StudentDoubtClient slots={slots} bookings={bookings} queries={queries} />;
}
