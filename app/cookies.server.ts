import { createCookie } from '@remix-run/node';

/**
 * Persists the user's chosen UI language. remix-i18next reads this during
 * server-side locale detection; the LanguageSwitcher writes it via /api/locale.
 */
export const localeCookie = createCookie('lng', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365, // 1 year
});
