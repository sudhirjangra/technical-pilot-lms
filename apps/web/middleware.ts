import {
  refreshAccessToken,
  validateSessionIfExist,
} from '@/server/auth.server';
import { decodeJwt } from 'jose';
import { auth } from './auth';

export default auth(async (req) => {
  try {
    if (req.auth && req.auth.user) {
      const user = req.auth.user;
      const expiresAt = decodeJwt(user.tokens.access_token).exp;
      if (typeof expiresAt === 'number' && expiresAt * 1000 <= Date.now() + 30_000) {
        await refreshAccessToken(user);
      }
    }
    if (req.auth && req.auth.user) {
      const { signedOut, disabled } = await validateSessionIfExist();
      if (signedOut) {
        return Response.redirect(new URL(disabled ? '/auth/sign-in?disabled=1' : '/auth/sign-in', req.url));
      }
    }

    if (req.auth && req.auth.user) {
      const user = req.auth.user;
      const pathname = req.nextUrl.pathname;

      if ((user.role === 'admin' || user.role === 'sub_admin') && pathname.startsWith('/dashboard')) {
        return Response.redirect(new URL('/admin', req.url));
      }

      if (user.role === 'student' && pathname.startsWith('/admin')) {
        return Response.redirect(new URL('/dashboard', req.url));
      }

      if (pathname.startsWith('/dashboard')) {
        const isProfileComplete = user.full_name && user.date_of_birth && user.phone;
        if (!isProfileComplete) {
          return Response.redirect(new URL('/auth/complete-profile', req.url));
        }
      }
    }
  } catch {
    // Allow request to proceed if API is unreachable
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
