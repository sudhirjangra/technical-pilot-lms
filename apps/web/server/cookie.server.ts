'use server';

import { cookies } from 'next/headers';

export const setCookie = async ({
  name,
  value,
}: {
  name: string;
  value: string;
}) => {
  const cookie = await cookies();
  if (!cookie) return;
  cookie.set({
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
};
