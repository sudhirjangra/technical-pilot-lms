import { env, isAuthorized, jwtCallback, sessionCallback } from '@/lib';
import { authorizeSignIn } from '@/server/auth.server';
import NextAuth, { User as NextAuthUser } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const {
  handlers,
  signIn,
  signOut,
  auth,
  unstable_update: update,
} = NextAuth({
  /**
   * @description Authentication providers
   */
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Identifier', type: 'string' },
        password: { label: 'Password', type: 'password' },
      },
      /**
       * @description Authorization logic for credentials provider
       * @param credentials - Credentials object (contains identifier and password)
       */
      async authorize(credentials) {
        return await authorizeSignIn({
          identifier: credentials.identifier as string,
          password: credentials.password as string,
        });
      },
    }),
    // Supabase OAuth provider - accepts tokens from Supabase OAuth callback
    Credentials({
      name: 'Supabase',
      credentials: {
        access_token: { label: 'Access Token', type: 'text' },
        refresh_token: { label: 'Refresh Token', type: 'text' },
        session_token: { label: 'Session Token', type: 'text' },
        session_refresh_time: { label: 'Session Refresh Time', type: 'text' },
        user_id: { label: 'User ID', type: 'text' },
        email: { label: 'Email', type: 'text' },
        role: { label: 'Role', type: 'text' },
        full_name: { label: 'Full Name', type: 'text' },
        date_of_birth: { label: 'Date of Birth', type: 'text' },
        phone: { label: 'Phone', type: 'text' },
        avatar_url: { label: 'Avatar URL', type: 'text' },
      },
      authorize: async (credentials): Promise<NextAuthUser | null> => {
        if (!credentials?.access_token || !credentials?.user_id) {
          return null;
        }
        const userId = credentials.user_id as string;
        const role = credentials.role as 'admin' | 'sub_admin' | 'student';
        // Return user with additional fields that will be available in JWT callback
        return {
          id: userId,
          email: credentials.email as string,
          role,
          name: credentials.full_name as string | undefined,
          image: credentials.avatar_url as string | undefined,
          // Additional fields stored in user object for JWT callback
          full_name: credentials.full_name as string | undefined,
          date_of_birth: credentials.date_of_birth as string | undefined,
          phone: credentials.phone as string | undefined,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tokens: {
            access_token: credentials.access_token as string,
            refresh_token: credentials.refresh_token as string,
            session_token: credentials.session_token as string,
            session_refresh_time: credentials.session_refresh_time as string,
          },
        } as NextAuthUser & {
          full_name?: string;
          date_of_birth?: string;
          phone?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          tokens: {
            access_token: string;
            refresh_token: string;
            session_token: string;
            session_refresh_time: string;
          };
        };
      },
    }),
  ],

  /**
   * @description Callback functions for token and session management
   */
  callbacks: {
    /**
     * @description Custom JWT callback to extend the token with additional fields
     * @param token - Current JWT token
     * @param user - User object (only available on sign-in)
     * @param trigger - Trigger type (e.g., "signIn", "update")
     * @param session - Current session object (on update)
     */
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in with Supabase OAuth, user object contains tokens
      if (trigger === 'signIn' && user) {
        return {
          ...token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            date_of_birth: user.date_of_birth,
            phone: user.phone,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
            tokens: user.tokens,
            profile_complete: !!(user.full_name && user.date_of_birth && user.phone),
          },
        };
      }

      return jwtCallback({ token, user, trigger, session });
    },

    /**
     * @description Custom session callback to include token data in the session
     * @param session - Current session
     * @param token - Current JWT token
     */
    async session({ session, token }) {
      return sessionCallback({ session, token });
    },

    /**
     * @description Redirect callback - redirect to profile completion if profile is incomplete
     */
    async redirect({ url, baseUrl }) {
      // If redirecting to dashboard, check if profile is complete
      if (url.startsWith('/dashboard') || url.startsWith(baseUrl + '/dashboard')) {
        // We can't access token here directly, so we'll handle this in middleware
        return url;
      }
      // Allow all other redirects
      return url;
    },

    /**
     * @description Authorization logic for middleware
     * @param request - Request object
     * @param auth - Auth object (contains token/session info)
     */
    async authorized({ request, auth }) {
      return isAuthorized({ request, auth });
    },
  },

  /**
   * @description JWT session strategy settings
   */
  session: {
    strategy: 'jwt',
    maxAge: env.AUTH_SESSION_AGE, // Total session lifetime (in seconds)
    updateAge: 86400 * 5, // Revalidate session every 5 days
  },

  /**
   * @description Secret used to sign the JWT and encrypt session data
   */
  secret: env.AUTH_SECRET,

  /**
   * @description Use secure cookies in production only
   */
  useSecureCookies: env.NODE_ENV === 'production',

  /**
   * @description Required when behind a proxy (e.g., Vercel or Cloudflare)
   */
  redirectProxyUrl: env.AUTH_URL,

  /**
   * @description Custom pages for authentication flow
   */
  pages: {
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-out',
    error: '/auth/sign-in',
    verifyRequest: '/auth/confirm-email',
    newUser: '/auth/sign-up',
  },
});
