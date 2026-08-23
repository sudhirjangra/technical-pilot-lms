import { auth } from '@/auth';
import { env } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

type Context = { params: Promise<{ lessonId: string }> };

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lessonId } = await params;
  const apiRes = await fetch(`${env.API_URL}/progress/lesson/${lessonId}`, {
    headers: { Authorization: `Bearer ${session.user.tokens.access_token}` },
    cache: 'no-store',
  });

  const body = await apiRes.json().catch(() => null);
  return NextResponse.json(body, { status: apiRes.status });
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lessonId } = await params;
  const dto = await req.json().catch(() => ({}));

  const apiRes = await fetch(`${env.API_URL}/progress/${lessonId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${session.user.tokens.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
    cache: 'no-store',
  });

  const body = await apiRes.json().catch(() => null);
  return NextResponse.json(body, { status: apiRes.status });
}
