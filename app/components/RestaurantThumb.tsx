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
        background: t.monoGrad,
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
