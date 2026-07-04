import { useState } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { listTokens } from '~/listTheme';

type Tokens = (typeof listTokens)['light'];

interface RestaurantThumbProps {
  image?: string;
  alt: string;
  initial: string;
  serifFont: string;
  tokens: Tokens;
  initialFontSize?: number;
  sx?: SxProps<Theme>;
}

/**
 * Restaurant thumbnail used by every card/popup/dialog. Falls back to the
 * initial-letter placeholder when there's no image, or when the image URL
 * fails to load (broken/expired scraped images are common — without this,
 * a failed <img> renders a broken-image icon instead of the placeholder).
 */
export default function RestaurantThumb({
  image,
  alt,
  initial,
  serifFont,
  tokens: t,
  initialFontSize = 68,
  sx,
}: RestaurantThumbProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Box
      sx={{
        position: 'relative',
        // Editorial diagonal-stripe placeholder (the refined card look); the
        // serif initial sits over it when there's no photo.
        background: `repeating-linear-gradient(135deg, ${t.thumbStripeA} 0 9px, ${t.thumbStripeB} 9px 18px)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {image && !failed ? (
        <Box
          component="img"
          src={image}
          alt={alt}
          onError={() => setFailed(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      ) : (
        <Box component="span" sx={{ fontFamily: serifFont, fontSize: initialFontSize, color: t.monoInitial, lineHeight: 1 }}>
          {initial}
        </Box>
      )}
    </Box>
  );
}
