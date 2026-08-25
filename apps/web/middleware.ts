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
      await validateSessionIfExist();
    }

    // Check if user needs to complete profile
    if (req.auth && req.auth.user && req.nextUrl.pathname.startsWith('/dashboard')) {
      const user = req.auth.user;
      const isProfileComplete = user.full_name && user.date_of_birth && user.phone;
      if (!isProfileComplete) {
        const completeProfileUrl = new URL('/auth/complete-profile', req.url);
        return Response.redirect(completeProfileUrl);
      }
    }
  } catch {
    // Allow request to proceed if API is unreachable
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
