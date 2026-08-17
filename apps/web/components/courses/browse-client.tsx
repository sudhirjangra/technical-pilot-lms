'use client';

import { PublicCourse } from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export function CourseBrowseClient({ courses }: { courses: PublicCourse[] }) {
  const [search, setSearch] = useState('');

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
  });

  return (
    <section className="min-h-dvh container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Browse our available courses</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">← Home</Button>
        </Link>
      </div>

      <Input
        placeholder="Search courses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 max-w-md"
      />

      {filtered.length === 0 && <p className="text-muted-foreground">No courses available.</p>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((course) => (
          <Link key={course.id} href={`/courses/${course.slug}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              {course.thumbnail_url && (
                <div className="relative h-40 bg-muted rounded-t-lg overflow-hidden">
                  <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  {course.categories && (
                    <Badge variant="outline">{course.categories.name}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {course.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                )}
                <div className="flex items-center gap-2">
                  {course.discount_price ? (
                    <>
                      <span className="text-lg font-bold">₹{course.discount_price}</span>
                      <span className="text-sm text-muted-foreground line-through">₹{course.price}</span>
                    </>
                  ) : (
                    <span className="text-lg font-bold">₹{course.price}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
