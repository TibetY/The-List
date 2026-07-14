import { Box } from '@mui/material';
import type { listTokens } from '~/listTheme';

type Tokens = (typeof listTokens)['light'];

interface StarsProps {
  /** 0–5, may be fractional (ratings are stored at 0.5 precision). */
  value: number;
  tokens: Tokens;
  size?: number;
  letterSpacing?: string;
}

/**
 * Read-only star rating that honours half (and any fractional) stars. Two
 * identical ★★★★★ layers — same glyph, so identical widths: a muted base and an
 * accent layer clipped to the rating fraction. Purely typographic, matching the
 * brand's text-star look (no icon set, renders everywhere).
 */
export default function Stars({ value, tokens: t, size = 15, letterSpacing = '2px' }: StarsProps) {
  const clamped = Math.max(0, Math.min(5, value || 0));
  const pct = (clamped / 5) * 100;
  const layer = {
    fontSize: size,
    letterSpacing,
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
  };
  return (
    <Box
      component="span"
      role="img"
      aria-label={`${clamped} / 5`}
      sx={{ position: 'relative', display: 'inline-block' }}
    >
      <Box component="span" aria-hidden sx={{ ...layer, color: t.notRated }}>
        ★★★★★
      </Box>
      <Box
        component="span"
        aria-hidden
        sx={{ ...layer, position: 'absolute', left: 0, top: 0, width: `${pct}%`, overflow: 'hidden', color: t.rating }}
      >
        ★★★★★
      </Box>
    </Box>
  );
}
