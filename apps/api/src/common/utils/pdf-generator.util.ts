/**
 * Clean text utility for stripping HTML tags and decoding entities.
 */
function cleanHtmlText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Escapes characters for PDF literal string syntax.
 */
function escapePdfText(text: string): string {
  return (
    text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      // Replace non-ascii with closest ascii equivalents or spaces
      .replace(/[^\x20-\x7E]/g, ' ')
  );
}

/**
 * Wraps a single paragraph into multiple lines fitting the page width.
 */
function wrapParagraph(text: string, maxCharsPerLine = 78): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export interface GeneratePdfOptions {
  courseTitle: string;
  chapterTitle: string;
  lessonTitle: string;
  content: string;
}

/**
 * Generates a standard, valid PDF 1.4 document buffer from text/HTML notes.
 */
export function generateNotePdf(options: GeneratePdfOptions): Buffer {
  const { courseTitle, chapterTitle, lessonTitle, content } = options;

  const rawText = cleanHtmlText(content);
  const paragraphs = rawText.split(/\n+/);

  const linesToRender: Array<{ text: string; isBlank?: boolean }> = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      linesToRender.push({ text: '', isBlank: true });
    } else {
      const wrapped = wrapParagraph(trimmed, 80);
      for (const line of wrapped) {
        linesToRender.push({ text: line });
      }
      linesToRender.push({ text: '', isBlank: true });
    }
  }

  // A4 dimensions: 595.28 x 841.89 pt
  // Margins: Left 50, Right 545, Top 780, Bottom 60
  const linesPerPage = 40;
  const pagesData: string[][] = [];

  let currentPageLines: string[] = [];
  for (const item of linesToRender) {
    if (currentPageLines.length >= linesPerPage) {
      pagesData.push(currentPageLines);
      currentPageLines = [];
    }
    currentPageLines.push(item.text);
  }
  if (currentPageLines.length > 0 || pagesData.length === 0) {
    pagesData.push(currentPageLines);
  }

  const totalPages = pagesData.length;

  // Build PDF 1.4 structure
  const objects: string[] = [];
  const offsets: number[] = [];

  // Object 1: Catalog (will point to Pages at obj 2)
  // Object 2: Pages (will list Page objects)
  // Object 3: Font Helvetica
  // Object 4: Font Helvetica-Bold
  // Object 5: Font Helvetica-Oblique
  // Next objects: Page objects and Content stream objects

  const fontHelveticaObj = 3;
  const fontHelveticaBoldObj = 4;
  const fontHelveticaObliqueObj = 5;

  let nextObjNum = 6;
  const pageObjNums: number[] = [];
  const pageContentsMap: Array<{
    pageObjNum: number;
    contentObjNum: number;
    stream: string;
  }> = [];

  for (let i = 0; i < totalPages; i++) {
    const pageObjNum = nextObjNum++;
    const contentObjNum = nextObjNum++;
    pageObjNums.push(pageObjNum);

    const lines = pagesData[i] || [];
    const isFirstPage = i === 0;

    let stream = '';

    // Header bar on first page or subsequent pages
    if (isFirstPage) {
      // Course & Chapter Subtitle
      stream += `BT\n/F3 10 Tf\n50 800 Td\n(${escapePdfText(courseTitle.toUpperCase())} | ${escapePdfText(chapterTitle)}) Tj\nET\n`;
      // Main Lesson Title
      stream += `BT\n/F2 18 Tf\n50 775 Td\n(${escapePdfText(lessonTitle)}) Tj\nET\n`;
      // Horizontal Rule
      stream += `0.7 0.7 0.7 RG\n1 w\n50 760 m 545 760 l S\n`;
    } else {
      stream += `BT\n/F3 9 Tf\n50 810 Td\n(${escapePdfText(lessonTitle)} — ${escapePdfText(courseTitle)}) Tj\nET\n`;
      stream += `0.8 0.8 0.8 RG\n0.5 w\n50 802 m 545 802 l S\n`;
    }

    // Body content
    const startY = isFirstPage ? 735 : 780;
    const lineHeight = 15;

    stream += `BT\n/F1 10.5 Tf\n`;
    stream += `50 ${startY} Td\n`;
    stream += `${lineHeight} TL\n`;

    let firstLine = true;
    for (const line of lines) {
      if (firstLine) {
        stream += `(${escapePdfText(line)}) Tj\n`;
        firstLine = false;
      } else {
        stream += `T* (${escapePdfText(line)}) Tj\n`;
      }
    }
    stream += `ET\n`;

    // Footer
    stream += `0.8 0.8 0.8 RG\n0.5 w\n50 50 m 545 50 l S\n`;
    stream += `BT\n/F1 8 Tf\n50 38 Td\n(Technical Pilot LMS — Protected Student Material) Tj\nET\n`;
    stream += `BT\n/F1 8 Tf\n500 38 Td\n(Page ${i + 1} of ${totalPages}) Tj\nET\n`;

    pageContentsMap.push({ pageObjNum, contentObjNum, stream });
  }

  // Assemble objects:
  // Obj 1: Catalog
  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  // Obj 2: Pages
  const kidsStr = pageObjNums.map((num) => `${num} 0 R`).join(' ');
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>\nendobj\n`;

  // Obj 3: Font Helvetica
  objects[fontHelveticaObj] =
    `${fontHelveticaObj} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  // Obj 4: Font Helvetica-Bold
  objects[fontHelveticaBoldObj] =
    `${fontHelveticaBoldObj} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  // Obj 5: Font Helvetica-Oblique
  objects[fontHelveticaObliqueObj] =
    `${fontHelveticaObliqueObj} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj\n`;

  // Page and Content objects
  for (const item of pageContentsMap) {
    objects[item.pageObjNum] =
      `${item.pageObjNum} 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 595.28 841.89]\n  /Resources <<\n    /Font <<\n      /F1 ${fontHelveticaObj} 0 R\n      /F2 ${fontHelveticaBoldObj} 0 R\n      /F3 ${fontHelveticaObliqueObj} 0 R\n    >>\n  >>\n  /Contents ${item.contentObjNum} 0 R\n>>\nendobj\n`;

    const streamBytes = Buffer.from(item.stream, 'utf-8');
    objects[item.contentObjNum] =
      `${item.contentObjNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${item.stream}\nendstream\nendobj\n`;
  }

  let pdfOutput = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  offsets[0] = 0;

  for (let i = 1; i < nextObjNum; i++) {
    offsets[i] = Buffer.byteLength(pdfOutput, 'utf-8');
    pdfOutput += objects[i];
  }

  const xrefOffset = Buffer.byteLength(pdfOutput, 'utf-8');
  pdfOutput += `xref\n0 ${nextObjNum}\n0000000000 65535 f \n`;

  for (let i = 1; i < nextObjNum; i++) {
    const offsetStr = String(offsets[i]).padStart(10, '0');
    pdfOutput += `${offsetStr} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${nextObjNum} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdfOutput, 'utf-8');
}
