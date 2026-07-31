import {
  refreshAccessToken,
  validateSessionIfExist,
} from '@/server/auth.server';
import { auth } from './auth';

export default auth(async (req) => {
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
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
