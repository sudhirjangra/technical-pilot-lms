import { auth } from '@/auth';
import { getUpcomingSlots, getMyBookings } from '@/server/doubt-sessions.server';
import { StudentDoubtClient } from '@/components/dashboard/doubt-client';
import { redirect } from 'next/navigation';

export default async function StudentDoubtPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const [slots, bookings] = await Promise.all([
    getUpcomingSlots(),
    getMyBookings(),
  ]);

  return <StudentDoubtClient slots={slots} bookings={bookings} />;
}
