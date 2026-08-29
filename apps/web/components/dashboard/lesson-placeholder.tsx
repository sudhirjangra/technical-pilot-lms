import { Badge } from '@repo/shadcn/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { ClipboardList, FileText, Timer } from '@repo/shadcn/lucide';
import type { ComponentType } from 'react';

const PLACEHOLDERS: Record<
  string,
  { label: string; icon: ComponentType<{ className?: string }>; blurb: string }
> = {
  pdf: {
    label: 'PDF Note',
    icon: FileText,
    blurb: 'This lesson is a downloadable PDF note. The PDF viewer is coming soon.',
  },
  assignment: {
    label: 'Assignment',
    icon: ClipboardList,
    blurb:
      'This lesson is an assignment. Submission and grading are handled in the assignment workspace, coming soon.',
  },
  test: {
    label: 'Test',
    icon: Timer,
    blurb: 'This lesson is a timed test. The test-taking experience is coming soon.',
  },
};

export function LessonPlaceholder({
  lessonType,
  title,
}: {
  lessonType: string;
  title?: string;
}) {
  const config = PLACEHOLDERS[lessonType] ?? {
    label: lessonType,
    icon: FileText,
    blurb: 'This content type is not available yet.',
  };
  const Icon = config.icon;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <CardTitle className="truncate text-base sm:text-lg">
            {title ?? config.label}
          </CardTitle>
          <Badge variant="outline" className="mt-1 text-[10px]">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{config.blurb}</p>
      </CardContent>
    </Card>
  );
}
