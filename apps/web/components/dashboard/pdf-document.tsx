'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from '@repo/shadcn/lucide';
import { Alert, AlertDescription } from '@repo/shadcn/alert';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFDocumentProps {
  pdfData: ArrayBuffer;
}

export function PDFDocument({ pdfData }: PDFDocumentProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(800);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    const element = viewerRef.current;
    if (!element) return;
    if (typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setPageWidth(Math.max(280, Math.min(900, entry.contentRect.width - 24)));
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={viewerRef} className="relative w-full overflow-hidden rounded-lg border border-muted bg-muted/30">
      <Document
        file={pdfData}
        onLoadSuccess={({ numPages: loadedPages }) => {
          setNumPages(loadedPages);
          setPageNumber(1);
        }}
        onLoadError={() => setNumPages(0)}
        loading={(
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        error={(
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>PDF could not be rendered</AlertDescription>
          </Alert>
        )}
        className="flex justify-center overflow-auto p-3"
      >
        <Page
          pageNumber={pageNumber}
          width={pageWidth}
          renderTextLayer
          renderAnnotationLayer
        />
      </Document>
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-border bg-background/80 px-3 py-2">
          <button
            type="button"
            aria-label="Previous page"
            title="Previous page"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            className="inline-flex size-10 items-center justify-center rounded-md border disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-20 text-center text-sm text-muted-foreground">
            {pageNumber} / {numPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            title="Next page"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((current) => Math.min(numPages, current + 1))}
            className="inline-flex size-10 items-center justify-center rounded-md border disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
      <div className="bg-muted/60 px-4 py-1.5 text-center text-[11px] text-muted-foreground">
        Protected content — copying or sharing prohibited
      </div>
    </div>
  );
}
