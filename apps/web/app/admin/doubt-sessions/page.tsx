import { getAdminSlots } from '@/server/doubt-sessions.server';
import { DoubtSlotsClient } from '@/components/admin/doubt-slots-client';

export default async function AdminDoubtSessionsPage() {
  const slots = await getAdminSlots();
  return <DoubtSlotsClient slots={slots} />;
}
