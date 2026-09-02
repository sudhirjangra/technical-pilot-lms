import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: () => <div data-testid="pdf-page" />,
  pdfjs: { version: 'test', GlobalWorkerOptions: {} },
}));
vi.mock('./pdf-document', () => ({
  PDFDocument: () => <div data-testid="pdf-page" />,
}));

import { PDFViewer } from './pdf-viewer';

describe('PDFViewer', () => {
  it('does not render a fake watermark overlay on the viewer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    );

    render(<PDFViewer lessonId="lesson-1" studentEmail="student@example.com" />);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-page')).toBeTruthy();
    });

    expect(screen.queryByText('CONTENT RESERVED')).toBeNull();
    expect(screen.queryByText('student@example.com')).toBeNull();
  });
});
