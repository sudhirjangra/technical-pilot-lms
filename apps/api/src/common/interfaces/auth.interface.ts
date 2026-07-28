import { Database } from '@repo/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Device = Database['public']['Tables']['devices']['Row'];

export interface MessageResponse {
  message: string;
}

export interface AuthTokensInterface {
  access_token: string;
  refresh_token: string;
}

export interface LoginUserInterface {
  data: Omit<Profile, 'id'> & { id: string };
  tokens: {
    session_token: string;
    access_token: string;
    refresh_token: string;
    session_refresh_time: string;
  };
}

export interface RefreshTokenInterface {
  access_token: string;
  refresh_token: string;
  access_token_refresh_time: string;
  session_token: string;
}

export interface RegisterUserInterface {
  data: { id: string; email: string };
}

export interface SignInResponse {
  message: string;
  data: Omit<Profile, 'id'> & { id: string };
  tokens: {
    access_token: string;
    refresh_token: string;
    session_token: string;
    session_refresh_time: string;
  };
}

export interface SessionsResponse {
  data: Device[];
}

export interface SessionResponse {
  data: Device;
}

export interface RefreshTokenResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  access_token_refresh_time: string;
  session_token: string;
}
