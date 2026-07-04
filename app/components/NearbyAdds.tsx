import { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { NearMe } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { PlaceCandidate } from '~/types/restaurant';
import type { listTokens } from '~/listTheme';
import RestaurantThumb from '~/components/RestaurantThumb';

type Tokens = (typeof listTokens)['light'];
type Status = 'idle' | 'locating' | 'loading' | 'ready' | 'empty' | 'denied' | 'unsupported';

interface NearbyAddsProps {
  tokens: Tokens;
  serifFont: string;
  onPick: (candidate: PlaceCandidate) => void;
}

function initialOf(name: string): string {
  return (name.replace(/^The /i, '')[0] || '?').toUpperCase();
}

/** Short distance label ("120 m" / "1.3 km"). */
function formatDistance(m: number | null | undefined): string {
  if (m == null) return '';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/**
 * "Nearby, right now" — zero-typing adds. On request, uses the browser's
 * geolocation to fetch nearby food/drink venues (via /api/nearby-place) and lists
 * them nearest-first with distance labels; tapping one adds it. Opt-in (we never
 * ask for location until the user taps), token-driven for both moods.
 */
export default function NearbyAdds({ tokens: t, serifFont, onPick }: NearbyAddsProps) {
  const { t: tr } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<PlaceCandidate[]>([]);

  const request = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus('loading');
        try {
          const res = await fetch(
            `/api/nearby-place?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          const data = (await res.json()) as PlaceCandidate[];
          const list = Array.isArray(data) ? data : [];
          setResults(list);
          setStatus(list.length ? 'ready' : 'empty');
        } catch {
          setStatus('empty');
        }
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const heading = (
    <Box sx={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: t.faint, mb: 1 }}>
      {tr('nearby.title')}
    </Box>
  );

  // Idle: a single tappable affordance.
  if (status === 'idle') {
    return (
      <Box
        component="button"
        type="button"
        onClick={request}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          border: `1px solid ${t.pillBorder}`,
          background: 'transparent',
          color: t.accent,
          borderRadius: '12px',
          fontFamily: "'DM Sans',sans-serif",
          fontSize: '13.5px',
          fontWeight: 600,
          padding: '9px 14px',
          cursor: 'pointer',
          '&:hover': { background: t.searchBg },
        }}
      >
        <NearMe sx={{ fontSize: 17 }} /> {tr('nearby.cta')}
      </Box>
    );
  }

  if (status === 'locating' || status === 'loading') {
    return (
      <Box>
        {heading}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: t.muted, fontSize: 13.5 }}>
          <CircularProgress size={16} sx={{ color: t.accent }} />
          {tr(status === 'locating' ? 'nearby.locating' : 'nearby.loading')}
        </Box>
      </Box>
    );
  }

  if (status === 'denied' || status === 'unsupported' || status === 'empty') {
    return (
      <Box>
        {heading}
        <Box sx={{ color: t.muted, fontSize: 13.5 }}>
          {tr(status === 'empty' ? 'nearby.empty' : 'nearby.denied')}
        </Box>
      </Box>
    );
  }

  // ready
  return (
    <Box>
      {heading}
      <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden', background: t.cardBg }}>
        {results.map((c, i) => (
          <Box
            key={`${c.name}-${c.lat}-${c.lng}-${i}`}
            role="button"
            tabIndex={0}
            onClick={() => onPick(c)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(c);
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              cursor: 'pointer',
              borderBottom: i === results.length - 1 ? 'none' : `1px solid ${t.borderSoft}`,
              '&:hover': { background: t.searchBg },
            }}
          >
            <Box sx={{ width: 34, height: 34, borderRadius: '9px', flex: 'none' }}>
              <RestaurantThumb
                image={undefined}
                alt={c.name}
                initial={initialOf(c.name)}
                serifFont={serifFont}
                tokens={t}
                initialFontSize={18}
                sx={{ width: '100%', height: '100%', borderRadius: '9px' }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ fontFamily: serifFont, fontSize: 15.5, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </Box>
              <Box sx={{ color: t.muted, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.cuisineType ? tr(`cuisines.${c.cuisineType}`, c.cuisineType) : tr('map.cuisineUnknown')}
              </Box>
            </Box>
            <Box component="span" sx={{ flex: 'none', fontFamily: "'DM Mono',monospace", fontSize: 12, color: t.faint }}>
              {formatDistance(c.distanceM)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
