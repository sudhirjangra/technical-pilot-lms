'use client';

import { Button } from '@repo/shadcn/button';
import { OrbitalSpinner } from '@repo/shadcn/orbital-spinner';
import { ArrowLeft, ArrowRight, CheckCircle2 } from '@repo/shadcn/lucide';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface LessonProgress {
  status?: string;
  progress_percent?: number;
}

export function LessonProgressActions({
  courseId,
  lessonId,
  prevLessonId,
  nextLessonId,
  lessonType,
}: {
  courseId: string;
  lessonId: string;
  prevLessonId: string | null;
  nextLessonId: string | null;
  lessonType: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/progress/${lessonId}`, { cache: 'no-store' });
      if (res.ok) setProgress(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Poll every 5s while video is in_progress so progress_percent stays fresh
  useEffect(() => {
    if (lessonType !== 'video') return;
    const id = setInterval(fetchProgress, 5000);
    return () => clearInterval(id);
  }, [lessonType, fetchProgress]);

  const markComplete = async () => {
    if (progress?.status === 'completed') return;

    // Video: require 80% watch threshold
    if (lessonType === 'video') {
      const pct = progress?.progress_percent ?? 0;
      if (pct < 80) {
        alert(`Watch at least 80% before marking complete (current: ${pct}%).`);
        return;
      }
    }
    // PDF: no threshold — allow immediate completion

    setSaving(true);
    try {
      const resp = await fetch(`/api/progress/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', progress_percent: 100 }),
      });
      if (resp.ok) {
        setProgress({ status: 'completed', progress_percent: 100 });
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const isCompleted = progress?.status === 'completed';
  const canMarkComplete =
    (lessonType === 'video' || lessonType === 'pdf') &&
    !isCompleted &&
    !loading;

  // For video: show disabled state + tooltip when under threshold
  const videoBelowThreshold =
    lessonType === 'video' && (progress?.progress_percent ?? 0) < 80;

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        {prevLessonId && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/dashboard/courses/${courseId}/lessons/${prevLessonId}`}>
              <ArrowLeft className="mr-2 size-4" />
              Previous
            </a>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {canMarkComplete && (
          <Button
            size="sm"
            onClick={markComplete}
            disabled={saving || videoBelowThreshold}
            title={
              videoBelowThreshold
                ? `Watch at least 80% to mark complete (${progress?.progress_percent ?? 0}%)`
                : 'Mark this lesson as completed'
            }
          >
            {saving ? (
              <>
                <OrbitalSpinner className="mr-2 size-4" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Mark as completed
              </>
            )}
          </Button>
        )}

        {isCompleted && !saving && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            Completed
          </span>
        )}

        {nextLessonId && (
          <Button variant="default" size="sm" asChild>
            <a href={`/dashboard/courses/${courseId}/lessons/${nextLessonId}`}>
              Next
              <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
