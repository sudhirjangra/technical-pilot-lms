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
    <section className="min-h-dvh container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {user.full_name ?? user.email}
          </h1>
          <p className="text-muted-foreground">Your learning dashboard</p>
        </div>
        <div className="flex gap-2">
          <Link href="/courses">
            <Button variant="outline" size="sm">Browse Courses</Button>
          </Link>
          <Link href="/dashboard/doubt-sessions">
            <Button variant="outline" size="sm">Doubt Sessions</Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" size="sm">Profile</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Courses ({enrollments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You haven&apos;t enrolled in any courses yet.</p>
                <Link href="/courses">
                  <Button>Browse Courses</Button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments.map((en) => (
                  <Link key={en.id} href={`/dashboard/courses/${en.course_id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold">{en.courses?.title ?? 'Unknown'}</h3>
                          <Badge variant={en.status === 'active' ? 'default' : 'secondary'}>
                            {en.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Enrolled: {new Date(en.enrolled_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
