import type { Restaurant } from '~/types/restaurant';

/** Localized labels for the plain-text email, passed in by the caller (which
 *  has access to the i18n `t` function; this module can't use React hooks). */
export interface EmailLabels {
  subject: string;
  heading: string;
  cuisine: string;
  rating: string;
  price: string;
  website: string;
  notes: string;
  social: string;
  address: string;
  phone: string;
  status: string;
  reservation: string;
  visits: string;
  statusBeen: string;
  statusWant: string;
  total: (count: number) => string;
  generated: (date: string) => string;
}

const defaultLabels: EmailLabels = {
  subject: 'My Restaurant List',
  heading: 'MY RESTAURANT LIST',
  cuisine: 'Cuisine',
  rating: 'Rating',
  price: 'Price',
  website: 'Website',
  notes: 'Notes',
  social: 'Social Media',
  address: 'Address',
  phone: 'Phone',
  status: 'Status',
  reservation: 'Reservation',
  visits: 'Times visited',
  statusBeen: 'Been',
  statusWant: 'Want to try',
  total: (count) => `Total Restaurants: ${count}`,
  generated: (date) => `Generated from The Foodiedex on ${date}`,
};

/**
 * Format restaurants into a readable email text.
 */
export function formatRestaurantsForEmail(
  restaurants: Restaurant[],
  labels: EmailLabels = defaultLabels,
  locale?: string
): string {
  let emailBody = `${labels.heading}\n`;
  emailBody += '='.repeat(50) + '\n\n';

  restaurants.forEach((restaurant, index) => {
    emailBody += `${index + 1}. ${restaurant.name.toUpperCase()}\n`;

    emailBody += `   ${labels.status}: ${
      restaurant.status === 'been' ? labels.statusBeen : labels.statusWant
    }\n`;

    if (restaurant.cuisineType) {
      emailBody += `   ${labels.cuisine}: ${restaurant.cuisineType}\n`;
    }

    if (restaurant.rating) {
      emailBody += `   ${labels.rating}: ${'⭐'.repeat(Math.floor(restaurant.rating))} (${restaurant.rating}/5)\n`;
    }

    if (restaurant.priceRange) {
      emailBody += `   ${labels.price}: ${restaurant.priceRange}\n`;
    }

    if ((restaurant.visitCount ?? 0) > 0) {
      emailBody += `   ${labels.visits}: ${restaurant.visitCount}\n`;
    }

    // Per-location address / phone / reservation. Fall back to the deprecated
    // top-level mirrors for older rows that predate `locations`.
    const locations = restaurant.locations ?? [];
    const firstAddress =
      locations.find((l) => l.address?.trim())?.address ?? restaurant.address;
    if (firstAddress) {
      emailBody += `   ${labels.address}: ${firstAddress}\n`;
    }
    const firstPhone =
      locations.find((l) => l.phone?.trim())?.phone ?? restaurant.phone;
    if (firstPhone) {
      emailBody += `   ${labels.phone}: ${firstPhone}\n`;
    }
    const firstReservation =
      locations.find((l) => l.reservationUrl?.trim())?.reservationUrl ??
      restaurant.reservationUrl;
    if (firstReservation) {
      emailBody += `   ${labels.reservation}: ${firstReservation}\n`;
    }

    if (restaurant.url) {
      emailBody += `   ${labels.website}: ${restaurant.url}\n`;
    }

    if (restaurant.comment) {
      emailBody += `   ${labels.notes}: ${restaurant.comment}\n`;
    }

    // Social media links
    const socialLinks = [];
    if (restaurant.socialMedia?.facebook) socialLinks.push(`Facebook: ${restaurant.socialMedia.facebook}`);
    if (restaurant.socialMedia?.instagram) socialLinks.push(`Instagram: ${restaurant.socialMedia.instagram}`);
    if (restaurant.socialMedia?.twitter) socialLinks.push(`Twitter: ${restaurant.socialMedia.twitter}`);
    if (restaurant.socialMedia?.tiktok) socialLinks.push(`TikTok: ${restaurant.socialMedia.tiktok}`);

    if (socialLinks.length > 0) {
      emailBody += `   ${labels.social}:\n`;
      socialLinks.forEach(link => {
        emailBody += `     - ${link}\n`;
      });
    }

    emailBody += '\n';
  });

  emailBody += '\n---\n';
  emailBody += `${labels.total(restaurants.length)}\n`;
  emailBody += `${labels.generated(new Date().toLocaleDateString(locale))}\n`;

  return emailBody;
}

/** Outcome of an email attempt so the caller can show the right feedback. */
export type EmailOutcome = 'mailto' | 'copied';

// Most mail clients and browsers cap the length of a mailto: URL (commonly
// ~2000 chars). Past this we copy the list to the clipboard instead of opening
// a half-truncated draft.
const MAILTO_MAX_LENGTH = 1800;

/**
 * Send restaurant list via email using mailto (opens user's email client). If
 * the list is too long to fit in a mailto URL, the plain-text list is copied to
 * the clipboard instead and `'copied'` is returned so the caller can explain.
 */
export async function sendRestaurantListViaMailto(
  restaurants: Restaurant[],
  toEmail: string,
  labels: EmailLabels = defaultLabels,
  locale?: string
): Promise<EmailOutcome> {
  const text = formatRestaurantsForEmail(restaurants, labels, locale);
  const subject = encodeURIComponent(labels.subject);
  const body = encodeURIComponent(text);
  const mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${body}`;

  if (mailtoLink.length > MAILTO_MAX_LENGTH) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }

  window.location.href = mailtoLink;
  return 'mailto';
}

/**
 * Copy restaurant list to clipboard
 */
export async function copyRestaurantListToClipboard(
  restaurants: Restaurant[],
  labels: EmailLabels = defaultLabels,
  locale?: string
): Promise<void> {
  const text = formatRestaurantsForEmail(restaurants, labels, locale);
  await navigator.clipboard.writeText(text);
}
