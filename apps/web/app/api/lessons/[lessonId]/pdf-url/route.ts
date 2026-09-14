import { auth } from '@/auth';
import { env } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

type Context = { params: Promise<{ lessonId: string }> };

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
  }

  const isDownload =
    _req.nextUrl.searchParams.get('download') === 'true' ||
    _req.nextUrl.searchParams.get('download') === '1';
  const titleParam = _req.nextUrl.searchParams.get('title');
  const safeTitle = titleParam
    ? titleParam
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    : 'lesson-notes';
  const filename = `${safeTitle || 'lesson-notes'}.pdf`;

  try {
    // Proxy PDF bytes so the browser never receives a Supabase URL or object key.
    const apiRes = await fetch(`${env.API_URL}/lessons/${lessonId}/pdf-url`, {
      headers: { Authorization: `Bearer ${session.user.tokens.access_token}` },
      cache: 'no-store',
    });

    if (!apiRes.ok) {
      const error = await apiRes.json().catch(() => ({ error: 'Failed to fetch PDF' }));
      return NextResponse.json(error, { status: apiRes.status });
    }

    const pdfBuffer = await apiRes.arrayBuffer();
    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'PDF content is empty' }, { status: 502 });
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.byteLength),
        'Content-Disposition': isDownload ? `attachment; filename="${filename}"` : 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('PDF URL fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

