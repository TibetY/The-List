/**
 * Public origin (scheme + host) for links we put in emails — confirmation and
 * password-reset. `new URL(request.url).origin` is unreliable behind
 * Netlify/serverless proxies: it often resolves to an internal host or
 * `localhost`, which is why confirmation links can come back pointing at
 * localhost. Prefer an explicit `SITE_URL` env var, then the `X-Forwarded-*`
 * headers the proxy sets, and only fall back to the request origin. Always
 * returns a value with no trailing slash.
 */
export function getSiteUrl(request: Request): string {
  const configured = process.env.SITE_URL ?? process.env.PUBLIC_SITE_URL;
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? url.host;
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
    url.protocol.replace(':', '');
  return `${proto}://${host}`;
}
