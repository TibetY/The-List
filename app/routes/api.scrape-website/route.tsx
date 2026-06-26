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
  address: string | null;
  email: string | null;
  phone: string | null;
}

const EMPTY_RESULT: ScrapeResult = {
  image: null,
  cuisineType: null,
  reservationPlatform: null,
  reservationUrl: null,
  address: null,
  email: null,
  phone: null,
};

/**
 * Best-effort metadata fetch for a restaurant's own website — used to
 * pre-fill the add/edit form (photo, cuisine, address, contact info,
 * reservation link). Never throws: a broken/slow/unreachable site just
 * yields an empty result so the form degrades gracefully instead of failing
 * to save.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const targetUrl = params.get('url');
  if (!targetUrl || !isSafeExternalUrl(targetUrl)) {
    return json(EMPTY_RESULT);
  }

  try {
    const html = await fetchWithLimits(targetUrl);
    let result = scrapeHtml(html, targetUrl);

    // Enrich from the reservation page for anything the main site didn't expose
    // (Resy/OpenTable listings usually carry full address/phone/cuisine in
    // JSON-LD). Use the link we discovered, or one the caller already knows.
    const passed = params.get('reservation');
    const reservationUrl =
      result.reservationUrl ?? (passed && isSafeExternalUrl(passed) ? passed : null);
    if (reservationUrl && reservationUrl !== targetUrl && isIncomplete(result)) {
      try {
        const resHtml = await fetchWithLimits(reservationUrl);
        result = mergeMissing(result, scrapeHtml(resHtml, reservationUrl));
      } catch {
        // Best-effort enrichment — ignore a failed reservation-page fetch.
      }
    }
    return json(result);
  } catch {
    return json(EMPTY_RESULT);
  }
}

/** True while there's still a contact/cuisine/image field worth enriching. */
function isIncomplete(r: ScrapeResult): boolean {
  return !r.address || !r.phone || !r.cuisineType || !r.image || !r.email;
}

/** Fill only the null fields of `primary` from `extra` (primary always wins). */
function mergeMissing(primary: ScrapeResult, extra: ScrapeResult): ScrapeResult {
  return {
    image: primary.image ?? extra.image,
    cuisineType: primary.cuisineType ?? extra.cuisineType,
    reservationPlatform: primary.reservationPlatform ?? extra.reservationPlatform,
    reservationUrl: primary.reservationUrl ?? extra.reservationUrl,
    address: primary.address ?? extra.address,
    email: primary.email ?? extra.email,
    phone: primary.phone ?? extra.phone,
  };
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

type CheerioRoot = ReturnType<typeof load>;
type JsonLdEntry = Record<string, unknown>;

function scrapeHtml(html: string, baseUrl: string): ScrapeResult {
  if (!html) return EMPTY_RESULT;
  const $ = load(html);

  const image =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    null;

  const restaurantEntry = findRestaurantJsonLd($);
  const cuisineType = extractCuisine(restaurantEntry) ?? findCuisineFallback($);
  const reservation = findReservationLink($, baseUrl);

  return {
    image: image ? resolveUrl(image, baseUrl) : null,
    cuisineType,
    reservationPlatform: reservation?.platform ?? null,
    reservationUrl: reservation?.url ?? null,
    address: extractAddress(restaurantEntry),
    email: extractEmail(restaurantEntry) ?? findMailto($),
    phone: extractPhone(restaurantEntry) ?? findTel($),
  };
}

/** Finds the first JSON-LD entry whose @type looks like a Restaurant, shared by
 *  the cuisine/address/email/phone extractors so the markup is only parsed once. */
function findRestaurantJsonLd($: CheerioRoot): JsonLdEntry | null {
  let found: JsonLdEntry | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    let data: unknown;
    try {
      data = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    for (const entry of Array.isArray(data) ? data : [data]) {
      if (isRestaurantEntry(entry)) {
        found = entry as JsonLdEntry;
        return;
      }
    }
  });
  return found;
}

function isRestaurantEntry(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const type = (entry as JsonLdEntry)['@type'];
  return (
    (typeof type === 'string' && type.toLowerCase().includes('restaurant')) ||
    (Array.isArray(type) &&
      type.some((t) => typeof t === 'string' && t.toLowerCase().includes('restaurant')))
  );
}

function extractCuisine(entry: JsonLdEntry | null): string | null {
  if (!entry) return null;
  const cuisine = entry.servesCuisine;
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

/** Many sites skip JSON-LD entirely, so fall back to a whole-word match of a
 *  known cuisine name against the title/description meta tags. */
function findCuisineFallback($: CheerioRoot): string | null {
  const text = [
    $('title').first().text(),
    $('meta[name="description"]').attr('content') ?? '',
    $('meta[property="og:description"]').attr('content') ?? '',
  ].join(' ');
  if (!text.trim()) return null;
  for (const cuisine of cuisineTypes) {
    if (cuisine === 'Other') continue;
    const re = new RegExp(`\\b${escapeRegExp(cuisine)}\\b`, 'i');
    if (re.test(text)) return cuisine;
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAddress(entry: JsonLdEntry | null): string | null {
  const addr = entry?.address;
  if (!addr || typeof addr !== 'object') return null;
  const a = addr as JsonLdEntry;
  const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode].filter(
    (p): p is string => typeof p === 'string' && p.trim() !== ''
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function extractEmail(entry: JsonLdEntry | null): string | null {
  const value = entry?.email;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function extractPhone(entry: JsonLdEntry | null): string | null {
  const value = entry?.telephone;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function findMailto($: CheerioRoot): string | null {
  const href = $('a[href^="mailto:" i]').first().attr('href');
  if (!href) return null;
  const email = href.replace(/^mailto:/i, '').split('?')[0].trim();
  return email || null;
}

function findTel($: CheerioRoot): string | null {
  const href = $('a[href^="tel:" i]').first().attr('href');
  if (!href) return null;
  const phone = href.replace(/^tel:/i, '').trim();
  return phone || null;
}

function findReservationLink(
  $: CheerioRoot,
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
