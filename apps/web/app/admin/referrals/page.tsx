import { auth } from '@/auth';
import { ReferralsAdminClient } from '@/components/admin/referrals-client';
import {
  getAdminConversionRequests,
  getAdminReferralOverview,
  getAdminReferrals,
  getAdminReferralSettings,
} from '@/server/admin/referrals.server';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Referrals & Rewards Management | Admin',
  description: 'Manage referral programs, review cash conversion requests, and configure reward settings.',
};

export default async function AdminReferralsPage() {
  const session = await auth();
  if (!session?.user || !['admin', 'sub_admin'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const [overviewRes, referralsRes, requestsRes, settingsRes] =
    await Promise.all([
      getAdminReferralOverview(),
      getAdminReferrals(1, 100),
      getAdminConversionRequests(),
      getAdminReferralSettings(),
    ]);

  return (
    <div className="container px-4 py-6 sm:px-6 sm:py-8">
      <ReferralsAdminClient
        initialOverview={overviewRes.data}
        initialReferrals={referralsRes.data?.referrals || []}
        initialRequests={requestsRes.data || []}
        initialSettings={settingsRes.data}
        isAdmin={session.user.role === 'admin'}
      />
    </div>
  );
}
