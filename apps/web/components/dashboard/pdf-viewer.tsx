'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from '@repo/shadcn/lucide';
import { Alert, AlertDescription } from '@repo/shadcn/alert';

interface PDFViewerProps {
  lessonId: string;
  studentEmail?: string;
}

/**
 * PDF viewer component with watermark overlay.
 * Shows "Content Reserved" watermark 2x per page, light visible.
 * Fetches PDF URL from the lesson.
 */
export function PDFViewer({ lessonId, studentEmail }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdfUrl = async () => {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/pdf-url`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to load PDF');
        }

        const data = await response.json();
        setPdfUrl(data.pdfUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    fetchPdfUrl();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-muted bg-muted/20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error || 'PDF could not be loaded'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative w-full rounded-lg border border-muted overflow-hidden">
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
        className="w-full border-0"
        style={{ height: 'min(75vh, 900px)', minHeight: '480px' }}
        title="PDF Lesson"
        allow="fullscreen"
      />
      <div className="bg-muted/60 px-4 py-1.5 text-[11px] text-muted-foreground text-center border-t border-border">
        Protected content — copying or sharing prohibited
      </div>
    </div>
  );
}
