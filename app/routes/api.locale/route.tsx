import type { ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { localeCookie } from '~/cookies.server';
import { supportedLngs } from '~/i18n';
import { safeRedirect } from '~/utils/safeRedirect';

/**
 * Persists the chosen UI language in a cookie, then bounces back to the page the
 * user came from. The LanguageSwitcher posts here.
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const lng = String(formData.get('lng') ?? '');
  const redirectTo = safeRedirect(formData.get('redirectTo'), '/');

  if (!supportedLngs.includes(lng as (typeof supportedLngs)[number])) {
    return json({ ok: false }, { status: 400 });
  }

  return redirect(redirectTo, {
    headers: { 'Set-Cookie': await localeCookie.serialize(lng) },
  });
}
