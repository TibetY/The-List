/**
 * Cuisine glyphs — the one place emoji is allowed to speak in the UI. Each
 * cuisine gets a single food glyph; unknown cuisines fall back to the plate.
 * Tints come from the deliberately tiny tile-tint family (3 values, assigned by
 * a stable hash) so a wall of cuisine tiles reads calm rather than carnival.
 */
import type { listTokens } from '~/listTheme';

type Tokens = (typeof listTokens)['light'];

const CUISINE_EMOJI: Record<string, string> = {
  Italian: '🍝',
  Chinese: '🥟',
  Japanese: '🍣',
  Mexican: '🌮',
  Indian: '🍛',
  Thai: '🍲',
  French: '🥐',
  American: '🍔',
  Mediterranean: '🫒',
  Korean: '🍜',
  Vietnamese: '🍜',
  Greek: '🥙',
  Spanish: '🥘',
  Turkish: '🧆',
  Lebanese: '🥙',
  Ethiopian: '🫓',
  Caribbean: '🍤',
  Brazilian: '🥩',
  Peruvian: '🐟',
  German: '🥨',
  Portuguese: '🐙',
  Filipino: '🍢',
  Indonesian: '🍢',
  Malaysian: '🍜',
  Moroccan: '🍲',
  Persian: '🍚',
  Seafood: '🦞',
  Steakhouse: '🥩',
  BBQ: '🍖',
  Pizza: '🍕',
  Burgers: '🍔',
  Sushi: '🍣',
  Ramen: '🍜',
  Fusion: '🍱',
  Other: '🍽️',
  Restaurant: '🍽️',
};

/** The food glyph for a cuisine (plate for anything unmapped). */
export function cuisineEmoji(cuisine: string): string {
  return CUISINE_EMOJI[cuisine] ?? '🍽️';
}

/** Stable tile tint for a cuisine, cycling the 3-tint family by name hash. */
export function cuisineTint(cuisine: string, tokens: Tokens): string {
  let h = 0;
  for (let i = 0; i < cuisine.length; i++) h = (h * 31 + cuisine.charCodeAt(i)) | 0;
  const tints = [tokens.tileTint, tokens.tileTint2, tokens.tileTint3];
  return tints[Math.abs(h) % tints.length];
}
