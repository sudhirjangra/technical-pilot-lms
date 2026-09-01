'use client';

import Link from 'next/link';
import { Badge } from '@repo/shadcn/badge';
import { Card, CardContent } from '@repo/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/shadcn/table';
import { ClipboardList, Timer } from '@repo/shadcn/lucide';

type Attempt = {
  id: string;
  type: 'test' | 'assignment';
  testTitle: string;
  lessonId?: string | null;
  courseId?: string | null;
  courseTitle: string;
  started_at: string;
  completed_at?: string | null;
  percentage?: number | null;
  passed?: boolean | null;
};

export function AttemptsHistoryClient({ attempts }: { attempts: Attempt[] }) {
  return (
    <section className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <h1 className="text-xl font-bold sm:text-2xl">My Attempts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your test and assignment attempt history across all courses.
      </p>

      {attempts.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              You haven&apos;t attempted any tests or assignments yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6 gap-0 py-0">
          <div className="w-full overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-2 text-xs uppercase">Course</TableHead>
                  <TableHead className="px-3 py-2 text-xs uppercase">Title</TableHead>
                  <TableHead className="px-3 py-2 text-xs uppercase">Type</TableHead>
                  <TableHead className="px-3 py-2 text-xs uppercase">Submitted</TableHead>
                  <TableHead className="px-3 py-2 text-center text-xs uppercase">Score</TableHead>
                  <TableHead className="px-3 py-2 text-center text-xs uppercase">Result</TableHead>
                  <TableHead className="px-3 py-2 text-right text-xs uppercase">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={`${a.type}-${a.id}`}>
                    <TableCell className="max-w-[180px] truncate py-2">{a.courseTitle}</TableCell>
                    <TableCell className="max-w-[200px] truncate py-2">{a.testTitle}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {a.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {a.completed_at
                        ? new Date(a.completed_at).toLocaleDateString()
                        : a.started_at
                          ? `Started ${new Date(a.started_at).toLocaleDateString()}`
                          : '—'}
                    </TableCell>
                    <TableCell className="py-2 text-center font-mono">
                      {a.percentage !== null && a.percentage !== undefined ? `${Math.round(a.percentage)}%` : '—'}
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      {a.passed === true ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">Pass</span>
                      ) : a.passed === false ? (
                        <span className="font-medium text-destructive">Fail</span>
                      ) : (
                        <span className="text-muted-foreground">
                          <Timer className="inline size-3.5" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      {a.courseId && a.lessonId ? (
                        <Link
                          href={`/dashboard/courses/${a.courseId}/lessons/${a.lessonId}`}
                          className="text-xs text-primary underline-offset-2 hover:underline"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </section>
  );
}
