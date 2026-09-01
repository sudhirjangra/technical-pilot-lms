import { createServerSupabaseClient } from '@repo/supabase/server';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { encode } from 'next-auth/jwt';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) return redirect('/auth/sign-in?error=oauth_failed');

  const supabase = await createServerSupabaseClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return redirect('/auth/sign-in?error=oauth_failed');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/auth/sign-in?error=oauth_failed');

  try {
    const response = await fetch(`${process.env.API_URL}/auth/supabase-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
        provider: 'google',
        provider_id: user.user_metadata?.provider_id ?? user.identities?.[0]?.identity_id,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) return redirect('/auth/sign-in?disabled=1');
      return redirect('/auth/sign-in?error=sync_failed');
    }

    const data: any = await response.json();

    // Use NextAuth's own encode so the JWE matches what NextAuth expects
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const sessionToken = await encode({
      token: {
        user: {
          id: data.data.id,
          email: data.data.email,
          role: data.data.role,
          full_name: data.data.full_name,
          date_of_birth: data.data.date_of_birth,
          phone: data.data.phone,
          avatar_url: data.data.avatar_url,
          is_active: data.data.is_active !== false,
          created_at: data.data.created_at,
          updated_at: data.data.updated_at,
          tokens: data.tokens,
          profile_complete: !!(data.data.full_name && data.data.date_of_birth && data.data.phone),
        },
      },
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
      maxAge: 60 * 60 * 24 * 30,
    });

    const cookieValue = `${cookieName}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${isProduction ? '; Secure' : ''}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: next,
        'Set-Cookie': cookieValue,
      },
    });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return redirect('/auth/sign-in?error=oauth_failed');
  }
}