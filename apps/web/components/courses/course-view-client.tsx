'use client';

import { PublicCourse } from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import Link from 'next/link';

export function CourseViewClient({
  course,
  isEnrolled,
  isLoggedIn,
}: {
  course: PublicCourse;
  isEnrolled: boolean;
  isLoggedIn: boolean;
}) {
  return (
    <section className="min-h-dvh container py-8 max-w-4xl mx-auto">
      <Link href="/courses" className="text-muted-foreground hover:underline text-sm">
        ← All Courses
      </Link>

      <div className="mt-6 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            {course.categories && (
              <Badge variant="outline">{course.categories.name}</Badge>
            )}
          </div>
          {course.description && (
            <p className="text-muted-foreground text-lg">{course.description}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {course.discount_price ? (
                  <>
                    <span className="text-3xl font-bold">₹{course.discount_price}</span>
                    <span className="text-lg text-muted-foreground line-through">₹{course.price}</span>
                    <Badge variant="default">
                      {Math.round((1 - course.discount_price / course.price) * 100)}% OFF
                    </Badge>
                  </>
                ) : (
                  <span className="text-3xl font-bold">₹{course.price}</span>
                )}
              </div>

              <div className="ml-auto">
                {isEnrolled ? (
                  <Link href={`/dashboard/courses/${course.id}`}>
                    <Button size="lg">Continue Learning</Button>
                  </Link>
                ) : isLoggedIn ? (
                  <Button size="lg">Enroll Now</Button>
                ) : (
                  <Link href="/auth/sign-in">
                    <Button size="lg" variant="outline">Sign in to Enroll</Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
