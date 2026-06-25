import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { load } from 'cheerio';
import { cuisineTypes } from '~/types/restaurant';

const FETCH_TIMEOUT_MS = 6000;
const MAX_BODY_BYTES = 1.5 * 1024 * 1024;

interface ScrapeResult {
  image: string | null;
  cuisineType: string | null;
  reservationPlatform: 'resy' | 'opentable' | null;
  reservationUrl: string | null;
}

const EMPTY_RESULT: ScrapeResult = {
  image: null,
  cuisineType: null,
  reservationPlatform: null,
  reservationUrl: null,
};

/**
 * Best-effort metadata fetch for a restaurant's own website — used to
 * pre-fill the add/edit form (photo, cuisine, reservation link). Never
 * throws: a broken/slow/unreachable site just yields an empty result so the
 * form degrades gracefully instead of failing to save.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const targetUrl = new URL(request.url).searchParams.get('url');
  if (!targetUrl || !isSafeExternalUrl(targetUrl)) {
    return json(EMPTY_RESULT);
  }

  try {
    const html = await fetchWithLimits(targetUrl);
    return json(scrapeHtml(html, targetUrl));
  } catch {
    return json(EMPTY_RESULT);
  }
}

/** Rejects anything that isn't a plausible public http(s) URL. Basic SSRF guard. */
function isSafeExternalUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::1') {
    return false;
  }
  // Literal private/loopback/link-local IPv4 ranges.
  if (
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^169\.254\./.test(hostname)
  ) {
    return false;
  }
  return true;
}

async function fetchWithLimits(targetUrl: string): Promise<string> {
  const response = await fetch(targetUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'TheFoodiedex-LinkPreview/1.0' },
  });
  if (!response.ok || !response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let bytesRead = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (bytesRead >= MAX_BODY_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return html;
}

function scrapeHtml(html: string, baseUrl: string): ScrapeResult {
  if (!html) return EMPTY_RESULT;
  const $ = load(html);

  const image =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    null;

  const cuisineType = findCuisine($);
  const reservation = findReservationLink($, baseUrl);

  return {
    image: image ? resolveUrl(image, baseUrl) : null,
    cuisineType,
    reservationPlatform: reservation?.platform ?? null,
    reservationUrl: reservation?.url ?? null,
  };
}

function findCuisine($: ReturnType<typeof load>): string | null {
  let found: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    let data: unknown;
    try {
      data = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    for (const entry of Array.isArray(data) ? data : [data]) {
      const cuisine = extractCuisineFromJsonLd(entry);
      if (cuisine) {
        found = cuisine;
        return;
      }
    }
  });
  return found;
}

function extractCuisineFromJsonLd(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const obj = entry as Record<string, unknown>;
  const type = obj['@type'];
  const typeMatches =
    (typeof type === 'string' && type.toLowerCase().includes('restaurant')) ||
    (Array.isArray(type) &&
      type.some((t) => typeof t === 'string' && t.toLowerCase().includes('restaurant')));
  if (!typeMatches) return null;

  const cuisine = obj.servesCuisine;
  const candidates = Array.isArray(cuisine) ? cuisine : [cuisine];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const match = cuisineTypes.find(
      (known) => known.toLowerCase() === candidate.trim().toLowerCase()
    );
    if (match) return match;
  }
  return null;
}

function findReservationLink(
  $: ReturnType<typeof load>,
  baseUrl: string
): { platform: 'resy' | 'opentable'; url: string } | null {
  let result: { platform: 'resy' | 'opentable'; url: string } | null = null;
  $('a[href]').each((_, el) => {
    if (result) return;
    const href = $(el).attr('href');
    if (!href) return;
    const resolved = resolveUrl(href, baseUrl);
    if (!resolved) return;
    let hostname: string;
    try {
      hostname = new URL(resolved).hostname.toLowerCase();
    } catch {
      return;
    }
    if (hostname.includes('resy.com')) {
      result = { platform: 'resy', url: resolved };
    } else if (hostname.includes('opentable.com')) {
      result = { platform: 'opentable', url: resolved };
    }
  });
  return result;
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}
