import { env } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  try {
    const apiRes = await fetch(
      `${env.API_URL}/auth/email-status?email=${encodeURIComponent(email)}`,
      {
        cache: 'no-store',
      },
    );

    const body = await apiRes.json().catch(() => null);
    return NextResponse.json(body, { status: apiRes.status });
  } catch (error) {
    console.error('Failed to check email status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
