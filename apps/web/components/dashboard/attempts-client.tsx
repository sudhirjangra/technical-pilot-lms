'use client';

import { Badge } from '@repo/shadcn/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { ClipboardList } from '@repo/shadcn/lucide';
import type { MyAssignmentAttempt } from '@/server/student/assignments.server';
import type { MyTestAttempt } from '@/server/student/tests.server';

type Attempt = MyAssignmentAttempt | MyTestAttempt;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AttemptsClient({ attempts }: { attempts: Attempt[] }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-sm text-muted-foreground">Your learning record</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Past attempts</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4 text-primary" />
            Assessment history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <ClipboardList className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No attempts yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Assessment</th>
                    <th className="px-3 py-3 font-medium">Course</th>
                    <th className="px-3 py-3 font-medium">Started</th>
                    <th className="px-3 py-3 font-medium">Submitted</th>
                    <th className="px-3 py-3 text-right font-medium">Score</th>
                    <th className="px-3 py-3 text-right font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={`${attempt.type}-${attempt.id}`} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <div className="font-medium">{attempt.testTitle}</div>
                        <div className="text-xs text-muted-foreground capitalize">{attempt.type}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{attempt.courseTitle}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(attempt.started_at)}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {attempt.completed_at ? formatDate(attempt.completed_at) : 'In progress'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {attempt.percentage != null ? `${attempt.percentage}%` : '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {attempt.passed === true ? (
                          <Badge variant="default">Passed</Badge>
                        ) : attempt.passed === false ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="outline">In progress</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
