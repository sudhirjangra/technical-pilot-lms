'use client';

import type { PublicCourse, StudentEnrollment } from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Progress } from '@repo/shadcn/progress';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Play,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from '@repo/shadcn/lucide';
import Image from 'next/image';
import Link from 'next/link';

interface DashboardUser {
  email?: string | null;
  full_name?: string | null;
  role?: string;
}

function CourseCard({ enrollment }: { enrollment: StudentEnrollment }) {
  const course = enrollment.courses;
  const isCompleted = enrollment.status === 'completed';

  return (
    <Link href={`/dashboard/courses/${enrollment.course_id}`} className="group block">
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/30">
        <div className="aspect-[16/8] overflow-hidden bg-muted">
          {course?.thumbnail_url ? (
            <Image
              src={course.thumbnail_url}
              alt={course.title}
              width={400}
              height={200}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
              <BookOpen className="size-10" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
              {course?.title ?? 'Unknown Course'}
            </h3>
            <Badge
              variant={isCompleted ? 'secondary' : 'default'}
              className="shrink-0 text-[10px]"
            >
              {isCompleted ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Enrolled{' '}
            {new Date(enrollment.enrolled_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
            {isCompleted ? (
              <><CheckCircle2 className="size-4" /> Review course</>
            ) : (
              <><Play className="size-4" /> Continue learning</>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AvailableCourseCard({ course }: { course: PublicCourse }) {
  const effectivePrice = course.discount_price ?? course.price;
  const isFree = Number(effectivePrice) === 0;

  return (
    <Link href={`/courses/${course.slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/30">
        <div className="aspect-[16/8] overflow-hidden bg-muted">
          {course.thumbnail_url ? (
            <Image
              src={course.thumbnail_url}
              alt={course.title}
              width={400}
              height={200}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
              <GraduationCap className="size-10" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
              {course.title}
            </h3>
            {course.categories && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {course.categories.name}
              </Badge>
            )}
          </div>
          {course.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{course.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isFree ? (
                <span className="text-sm font-bold text-green-600">Free</span>
              ) : course.discount_price ? (
                <>
                  <span className="text-sm font-bold">₹{course.discount_price}</span>
                  <span className="text-xs text-muted-foreground line-through">₹{course.price}</span>
                </>
              ) : (
                <span className="text-sm font-bold">₹{course.price}</span>
              )}
            </div>
            <ShoppingCart className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface DueItem {
  courseTitle: string;
  lessonTitle: string;
  dueAt: string;
  courseId: string;
}

export function DashboardClient({
  enrollments,
  availableCourses,
  upcomingDue = [],
  user,
}: {
  enrollments: StudentEnrollment[];
  availableCourses: PublicCourse[];
  upcomingDue?: DueItem[];
  user: DashboardUser;
}) {
  const activeCourses = enrollments.filter((e) => e.status === 'active');
  const completedCourses = enrollments.filter((e) => e.status === 'completed');
  const greeting = getGreeting();

  return (
    <section className="container max-w-7xl py-6 sm:py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}, {user.full_name ?? user.email?.split('@')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your learning overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Enrolled"
          value={enrollments.length}
        />
        <StatCard
          icon={Clock3}
          label="In Progress"
          value={activeCourses.length}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completedCourses.length}
        />
        <StatCard
          icon={TrendingUp}
          label="Completion Rate"
          value={enrollments.length > 0
            ? `${Math.round((completedCourses.length / enrollments.length) * 100)}%`
            : '—'
          }
        />
      </div>

      {/* Assignment Due Reminders */}
      {upcomingDue.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingDue.map((item, i) => {
              const daysLeft = Math.ceil((new Date(item.dueAt).getTime() - Date.now()) / 86_400_000);
              const isOverdue = daysLeft < 0;
              return (
                <Link key={i} href={`/dashboard/courses/${item.courseId}`} className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-amber-100/50 dark:hover:bg-amber-900/20">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.lessonTitle}</p>
                    <p className="text-xs text-muted-foreground">{item.courseTitle}</p>
                  </div>
                  <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="shrink-0 text-[10px]">
                    {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                  </Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Continue Learning */}
      {activeCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Play className="size-5 text-primary" />
              Continue Learning
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/courses">View all</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeCourses.slice(0, 3).map((enrollment) => (
              <CourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-5 text-green-600" />
            Completed
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {completedCourses.slice(0, 3).map((enrollment) => (
              <CourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        </div>
      )}

      {/* New Courses Available */}
      {availableCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              New Courses Available
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/courses">Browse all</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableCourses.slice(0, 6).map((course) => (
              <AvailableCourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {enrollments.length === 0 && availableCourses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="mb-3 size-12 text-muted-foreground/50" />
            <h2 className="font-semibold text-lg">Welcome aboard!</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              No courses available yet. Check back soon or contact your institution.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
