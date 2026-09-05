import { auth } from '@/auth';
import { env } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lessonId } = await params;
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
  const userAgent = req.headers.get('user-agent') || '';

  const apiRes = await fetch(`${env.API_URL}/videos/${lessonId}/otp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.user.tokens.access_token}`,
      'Content-Type': 'application/json',
      ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
      ...(userAgent ? { 'user-agent': userAgent } : {}),
    },
    body: JSON.stringify({}),
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    const body = await apiRes.json().catch(() => ({}));
    return NextResponse.json(body, { status: apiRes.status });
  }

  const { data } = await apiRes.json();
  return NextResponse.json(data, { status: 200 });
}
