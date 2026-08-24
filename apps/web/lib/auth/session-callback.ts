import { Session } from 'next-auth';
import { AdapterSession, AdapterUser } from 'next-auth/adapters';
import { JWT } from 'next-auth/jwt';

/**
 * Maps the JWT token data to the NextAuth session object.
 *
 * @param session - The current session object.
 * @param token - The JWT token containing user information.
 * @returns The updated session with detailed user data from the token.
 */
export const sessionCallback = ({
  session,
  token,
}: {
  session: {
    user: AdapterUser;
  } & AdapterSession &
    Session;
  token: JWT;
}): Session => {
  if (token) {
    const { user } = token;
    return {
      ...session,
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
      },
    };
  }
  return session;
};
