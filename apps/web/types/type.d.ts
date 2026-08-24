import 'next-auth';
import { User } from 'next-auth';

/**
 * Module augmentation for next-auth to extend User, Session, and JWT interfaces.
 */
declare module 'next-auth' {
  /**
   * The shape of the user object returned in the session callback.
   * Aligned with profiles table structure.
   *
   * @interface User
   * @property {string} id - Unique identifier for the user.
   * @property {string} email - User's email address.
   * @property {string} role - User role: admin, sub_admin, or student.
   * @property {string | null} [full_name] - User's full name.
   * @property {string | null} [phone] - User's phone number.
   * @property {string | null} [avatar_url] - User's avatar URL.
   * @property {boolean} is_active - Whether the user account is active.
   * @property {Date} created_at - Date when the user was created.
   * @property {Date} updated_at - Date when the user was last updated.
   * @property {Object} tokens - Authentication tokens.
   * @property {string} tokens.access_token - Access token.
   * @property {string} tokens.refresh_token - Refresh token.
   * @property {string} tokens.session_token - Session token.
   * @property {Date} tokens.session_refresh_time - Session refresh time.
   */
  interface User {
    id: string;
    email: string;
    role: 'admin' | 'sub_admin' | 'student';
    full_name?: string | null;
    date_of_birth?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    tokens: {
      access_token: string;
      refresh_token: string;
      session_token: string;
      session_refresh_time: Date;
    };
  }

  /**
   * Returned by `useSession`, `auth`, contains information about the active session.
   *
   * @interface Session
   * @property {User} user - The authenticated user.
   */
  interface Session {
    user: User;
  }
}

// The `JWT` interface can be found in the `next-auth/jwt` submodule
import 'next-auth/jwt';

/**
 * Module augmentation for next-auth/jwt to extend JWT interface.
 *
 * @interface JWT
 * @property {User} user - The user object stored in the JWT.
 */
declare module 'next-auth/jwt' {
  interface JWT {
    user: User;
  }
}
