'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from '@repo/shadcn/lucide';
import { Alert, AlertDescription } from '@repo/shadcn/alert';

const PDFDocument = dynamic(
  () => import('./pdf-document').then((module) => module.PDFDocument),
  { ssr: false },
);

interface PDFViewerProps {
  lessonId: string;
  studentEmail?: string;
}

/**
 * PDF viewer component with watermark overlay.
 * Shows "Content Reserved" watermark 2x per page, light visible.
 * Loads protected PDF bytes through the application proxy.
 */
export function PDFViewer({ lessonId, studentEmail }: PDFViewerProps) {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/lessons/${lessonId}/pdf-url`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load PDF');
        setPdfData(await response.arrayBuffer());
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setLoading(false);
      });
    return () => controller.abort();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-muted bg-muted/20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !pdfData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error || 'PDF could not be loaded'}</AlertDescription>
      </Alert>
    );
  }

  return <PDFDocument pdfData={pdfData} />;
}
