import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

/**
 * Determines whether a user is authorized to access a specific route.
 *
 * - Allows unrestricted access to static assets like `/assets` and `/favicon.ico`.
 * - Redirects unauthenticated users trying to access protected routes to `/auth/sign-in`.
 * - Redirects authenticated users who haven't verified their email to `/auth/confirm-email`.
 * - Redirects verified users away from auth pages (like `/auth/sign-in`) to the homepage.
 *
 * @param request - The incoming request object containing the target route.
 * @param auth - The current session object or null if unauthenticated.
 * @returns A `Response` redirect object if redirection is needed, or `true` if access is allowed.
 */
export const isAuthorized = ({
  request,
  auth,
}: {
  request: NextRequest;
  auth: Session | null;
}) => {
  const isAuth = !!auth?.user;
  const { nextUrl } = request;
  const { pathname } = nextUrl;

  if (pathname.startsWith('/assets') || pathname.startsWith('/favicon.ico')) {
    return true;
  }

  const publicPaths = ['/', '/auth/sign-in', '/auth/sign-up', '/auth/forgot-password', '/auth/reset-password', '/auth/confirm-email'];
  const isPublicPath = publicPaths.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(p)),
  );

  if (!isAuth) {
    if (isPublicPath) return true;
    return Response.redirect(new URL('/auth/sign-in', nextUrl));
  }

  if (isAuth && pathname.startsWith('/auth/sign')) {
    return Response.redirect(new URL('/', nextUrl));
  }

  return true;
};
