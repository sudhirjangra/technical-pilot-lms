// Public, browser-safe environment values only. Do not import server-only secrets here.
export const clientEnv = {
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
};
