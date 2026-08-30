import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PDFViewer } from './pdf-viewer';

describe('PDFViewer', () => {
  it('does not render a fake watermark overlay on the viewer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ pdfUrl: 'https://example.com/demo.pdf' }),
      }),
    );

    render(<PDFViewer lessonId="lesson-1" studentEmail="student@example.com" />);

    await waitFor(() => {
      expect(screen.getByTitle('PDF Lesson')).toBeTruthy();
    });

    expect(screen.queryByText('CONTENT RESERVED')).toBeNull();
    expect(screen.queryByText('student@example.com')).toBeNull();
  });
});
