'use client';

import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Progress } from '@repo/shadcn/progress';
import Link from 'next/link';

interface LessonProgress {
  id: string;
  title: string;
  sort_order: number;
  lesson_type: string;
  progress: {
    status: string;
    progress_percent: number;
    last_position_seconds: number;
  } | null;
}

interface ChapterProgress {
  id: string;
  title: string;
  sort_order: number;
  lessons: LessonProgress[];
}

export function CourseProgressClient({
  progress,
}: {
  courseId: string;
  progress: { chapters: ChapterProgress[]; overall_percent: number } | null;
}) {
  if (!progress) {
    return (
      <section className="min-h-dvh container py-8">
        <p className="text-muted-foreground">Unable to load course progress. You may not be enrolled.</p>
        <Link href="/dashboard">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="min-h-dvh container py-8 max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-muted-foreground hover:underline text-sm">
        ← Dashboard
      </Link>

      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Course Progress</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{progress.overall_percent}% complete</span>
            <Progress value={progress.overall_percent} className="w-32" />
          </div>
        </div>

        {progress.chapters.map((chapter, ci) => (
          <Card key={chapter.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{ci + 1}. {chapter.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {chapter.lessons.map((lesson, li) => {
                const status = lesson.progress?.status ?? 'not_started';
                return (
                  <div key={lesson.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-6">{li + 1}.</span>
                      <span className="text-sm">{lesson.title}</span>
                      <Badge variant="outline" className="text-xs">{lesson.lesson_type}</Badge>
                    </div>
                    <Badge
                      variant={status === 'completed' ? 'default' : status === 'in_progress' ? 'secondary' : 'outline'}
                    >
                      {status === 'not_started' ? 'Not Started' : status === 'in_progress' ? `${lesson.progress?.progress_percent ?? 0}%` : 'Done'}
                    </Badge>
                  </div>
                );
              })}
              {chapter.lessons.length === 0 && (
                <p className="text-sm text-muted-foreground px-3">No lessons</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
