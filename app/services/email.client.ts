import type { Restaurant } from '~/types/restaurant';

/**
 * Format restaurants into a readable email text
 */
export function formatRestaurantsForEmail(restaurants: Restaurant[]): string {
  let emailBody = 'MY RESTAURANT LIST\n';
  emailBody += '='.repeat(50) + '\n\n';

  restaurants.forEach((restaurant, index) => {
    emailBody += `${index + 1}. ${restaurant.name.toUpperCase()}\n`;

    if (restaurant.cuisineType) {
      emailBody += `   Cuisine: ${restaurant.cuisineType}\n`;
    }

    if (restaurant.rating) {
      emailBody += `   Rating: ${'⭐'.repeat(Math.floor(restaurant.rating))} (${restaurant.rating}/5)\n`;
    }

    if (restaurant.priceRange) {
      emailBody += `   Price: ${restaurant.priceRange}\n`;
    }

    if (restaurant.url) {
      emailBody += `   Website: ${restaurant.url}\n`;
    }

    if (restaurant.comment) {
      emailBody += `   Notes: ${restaurant.comment}\n`;
    }

    // Social media links
    const socialLinks = [];
    if (restaurant.socialMedia?.facebook) socialLinks.push(`Facebook: ${restaurant.socialMedia.facebook}`);
    if (restaurant.socialMedia?.instagram) socialLinks.push(`Instagram: ${restaurant.socialMedia.instagram}`);
    if (restaurant.socialMedia?.twitter) socialLinks.push(`Twitter: ${restaurant.socialMedia.twitter}`);
    if (restaurant.socialMedia?.tiktok) socialLinks.push(`TikTok: ${restaurant.socialMedia.tiktok}`);

    if (socialLinks.length > 0) {
      emailBody += `   Social Media:\n`;
      socialLinks.forEach(link => {
        emailBody += `     - ${link}\n`;
      });
    }

    emailBody += '\n';
  });

  emailBody += '\n---\n';
  emailBody += `Total Restaurants: ${restaurants.length}\n`;
  emailBody += `Generated from The List on ${new Date().toLocaleDateString()}\n`;

  return emailBody;
}

/**
 * Send restaurant list via email using mailto (opens user's email client)
 */
export function sendRestaurantListViaMailto(restaurants: Restaurant[], toEmail: string): void {
  const subject = encodeURIComponent('My Restaurant List');
  const body = encodeURIComponent(formatRestaurantsForEmail(restaurants));

  const mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;
}

/**
 * Copy restaurant list to clipboard
 */
export async function copyRestaurantListToClipboard(restaurants: Restaurant[]): Promise<void> {
  const text = formatRestaurantsForEmail(restaurants);
  await navigator.clipboard.writeText(text);
}
