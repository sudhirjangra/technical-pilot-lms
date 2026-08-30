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

  try {
    // Call backend API to get the PDF URL
    const apiRes = await fetch(`${env.API_URL}/lessons/${lessonId}/pdf-url`, {
      headers: { Authorization: `Bearer ${session.user.tokens.access_token}` },
      cache: 'no-store',
    });

    if (!apiRes.ok) {
      const error = await apiRes.json().catch(() => ({ error: 'Failed to fetch PDF' }));
      return NextResponse.json(error, { status: apiRes.status });
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('PDF URL fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

