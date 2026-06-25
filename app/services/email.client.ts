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

    if (restaurant.cuisineType) {
      emailBody += `   ${labels.cuisine}: ${restaurant.cuisineType}\n`;
    }

    if (restaurant.rating) {
      emailBody += `   ${labels.rating}: ${'⭐'.repeat(Math.floor(restaurant.rating))} (${restaurant.rating}/5)\n`;
    }

    if (restaurant.priceRange) {
      emailBody += `   ${labels.price}: ${restaurant.priceRange}\n`;
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

/**
 * Send restaurant list via email using mailto (opens user's email client)
 */
export function sendRestaurantListViaMailto(
  restaurants: Restaurant[],
  toEmail: string,
  labels: EmailLabels = defaultLabels,
  locale?: string
): void {
  const subject = encodeURIComponent(labels.subject);
  const body = encodeURIComponent(formatRestaurantsForEmail(restaurants, labels, locale));

  const mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;
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
