'use client';

import { StudentEnrollment } from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import Link from 'next/link';

interface DashboardUser {
  email?: string | null;
  full_name?: string | null;
  role?: string;
}

export function DashboardClient({
  enrollments,
  user,
}: {
  enrollments: StudentEnrollment[];
  user: DashboardUser;
}) {
  return (
    <section className="container py-8 space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.full_name ?? user.email?.split('@')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s a summary of your learning progress.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Enrolled Courses
            </p>
            <p className="text-3xl font-bold mt-1">{enrollments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Active
            </p>
            <p className="text-3xl font-bold mt-1">
              {enrollments.filter((e) => e.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="hidden sm:block">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Completed
            </p>
            <p className="text-3xl font-bold mt-1">
              {enrollments.filter((e) => e.status === 'completed').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Courses */}
      <Card className="water-surface">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold">
            My Courses ({enrollments.length})
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/courses">Browse more</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t enrolled in any courses yet.
              </p>
              <Button asChild>
                <Link href="/courses">Browse Courses</Link>
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.map((en) => (
                <Link
                  key={en.id}
                  href={`/dashboard/courses/${en.course_id}`}
                  className="block"
                >
                  <Card className="water-surface h-full transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40 cursor-pointer">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">
                          {en.courses?.title ?? 'Unknown Course'}
                        </h3>
                        <Badge
                          variant={
                            en.status === 'active' ? 'default' : 'secondary'
                          }
                          className="shrink-0 text-xs"
                        >
                          {en.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enrolled:{' '}
                        {new Date(en.enrolled_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
