import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from './pdf-document';

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: () => <div data-testid="pdf-page" />,
  pdfjs: { version: 'test', GlobalWorkerOptions: {} },
}));

describe('PDFDocument', () => {
  it('triggers download with the full Blob and sanitized filename', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
    const revokeObjectURLMock = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    const testBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]); // %PDF-1.7
    const blob = new Blob([testBytes], { type: 'application/pdf' });

    let clickedDownloadLink: HTMLAnchorElement | null = null;
    const originalAppend = document.body.appendChild.bind(document.body);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        clickedDownloadLink = node;
      }
      return originalAppend(node);
    });

    render(
      <PDFDocument
        pdfData={blob}
        lessonTitle="SACAA Technical General web visit"
        lessonId="b30eb33b-d2a5-47d1-a799-a0400f6c07af"
      />,
    );

    const downloadButton = screen.getByRole('button', { name: /Download PDF/i });
    fireEvent.click(downloadButton);

    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
    expect(clickedDownloadLink).not.toBeNull();
    expect((clickedDownloadLink as unknown as HTMLAnchorElement).download).toBe(
      'sacaa-technical-general-web-visit.pdf',
    );
    expect((clickedDownloadLink as unknown as HTMLAnchorElement).href).toBe(
      'blob:http://localhost/test-uuid',
    );

    // Object URL revocation must NOT be called synchronously (which cancels browser download)
    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    appendChildSpy.mockRestore();
  });
});
