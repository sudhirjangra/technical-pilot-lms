'use client';

import { PublicCourse } from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import {
  GraduationCap,
  Search,
  SlidersHorizontal,
  Tag,
} from '@repo/shadcn/lucide';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export function CourseBrowseClient({ courses }: { courses: PublicCourse[] }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    courses.forEach((c) => {
      if (c.categories) cats.set(c.categories.id, c.categories.name);
    });
    return Array.from(cats.entries()).map(([id, name]) => ({ id, name }));
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return courses.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' || c.categories?.id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, search, selectedCategory]);

  return (
    <section className="min-h-dvh container max-w-7xl py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse Courses</h1>
        <p className="text-muted-foreground mt-1">Discover courses to build your skills.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            <SlidersHorizontal className="my-2.5 size-4 shrink-0 text-muted-foreground" />
            <Button
              variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="shrink-0"
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="shrink-0"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="mb-3 size-10 text-muted-foreground/50" />
            <h2 className="font-semibold">No courses found</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {courses.length === 0
                ? 'No courses available right now. Check back soon!'
                : 'Try a different search or filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const effectivePrice = course.discount_price ?? course.price;
            const isFree = Number(effectivePrice) === 0;

            return (
              <Link key={course.id} href={`/courses/${course.slug}`} className="group block">
                <Card className="h-full overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/30">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {course.thumbnail_url ? (
                      <Image
                        src={course.thumbnail_url}
                        alt={course.title}
                        width={400}
                        height={225}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                        <GraduationCap className="size-12" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-semibold leading-snug">
                        {course.title}
                      </h3>
                      {course.categories && (
                        <Badge variant="outline" className="shrink-0 text-[10px] gap-0.5">
                          <Tag className="size-2.5" />
                          {course.categories.name}
                        </Badge>
                      )}
                    </div>
                    {course.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        {isFree ? (
                          <span className="font-bold text-green-600">Free</span>
                        ) : course.discount_price ? (
                          <>
                            <span className="text-lg font-bold">₹{course.discount_price}</span>
                            <span className="text-sm text-muted-foreground line-through">₹{course.price}</span>
                          </>
                        ) : (
                          <span className="text-lg font-bold">₹{course.price}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-primary group-hover:underline">
                        View details →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
