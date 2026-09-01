import {
  refreshAccessToken,
  validateSessionIfExist,
} from '@/server/auth.server';
import { auth } from './auth';

export default auth(async (req) => {
  try {
    if (req.auth && req.auth.user) {
      const user = req.auth.user;
      const session_refresh_time = new Date(
        user.tokens.session_refresh_time,
      ).getTime();
      const now = Date.now();
      if (session_refresh_time <= now) {
        await refreshAccessToken(user);
      }
    }
    if (req.auth && req.auth.user) {
      const { signedOut } = await validateSessionIfExist();
      if (signedOut) {
        return Response.redirect(new URL('/auth/sign-in?disabled=1', req.url));
      }
    }

    if (req.auth && req.auth.user) {
      const user = req.auth.user;
      const pathname = req.nextUrl.pathname;

      if (user.role === 'admin' && pathname.startsWith('/dashboard')) {
        return Response.redirect(new URL('/admin', req.url));
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
