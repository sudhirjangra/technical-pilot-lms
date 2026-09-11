import { getMyReferralSummary } from '@/server/student/referrals.server';
import { ReferralsClient } from '@/components/dashboard/referrals-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refer & Earn | Technical Pilot LMS',
  description: 'Invite friends to Technical Pilot LMS and earn reward credit points.',
};

export default async function ReferralsPage() {
  const { data } = await getMyReferralSummary();

  return (
    <div className="container px-4 py-6 sm:px-6 sm:py-8">
      <ReferralsClient initialData={data} />
    </div>
  );
}
