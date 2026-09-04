import { AttemptsClient } from '@/components/dashboard/attempts-client';
import { getMyAssignmentAttempts } from '@/server/student/assignments.server';
import { getMyTestAttempts } from '@/server/student/tests.server';

export default async function MyAttemptsPage() {
  const [assignmentAttempts, testAttempts] = await Promise.all([
    getMyAssignmentAttempts(),
    getMyTestAttempts(),
  ]);

  const attempts = [...assignmentAttempts, ...testAttempts].sort(
    (left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime(),
  );

  return <AttemptsClient attempts={attempts} />;
}
