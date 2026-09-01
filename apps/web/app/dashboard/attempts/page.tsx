import { getMyTestAttempts } from '@/server/student/tests.server';
import { getMyAssignmentAttempts } from '@/server/student/assignments.server';
import { AttemptsHistoryClient } from '@/components/dashboard/attempts-history-client';

export default async function MyAttemptsPage() {
  const [testAttempts, assignmentAttempts] = await Promise.all([
    getMyTestAttempts(),
    getMyAssignmentAttempts(),
  ]);

  const attempts = [...testAttempts, ...assignmentAttempts].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );

  return <AttemptsHistoryClient attempts={attempts} />;
}
