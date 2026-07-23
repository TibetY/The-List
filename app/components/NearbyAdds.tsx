import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { NearMe } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { PlaceCandidate } from '~/types/restaurant';
import type { listTokens } from '~/listTheme';
import RestaurantThumb from '~/components/RestaurantThumb';
import { formatDistance } from '~/utils/geo';
import { setCachedLocation } from '~/utils/userLocation.client';

type Tokens = (typeof listTokens)['light'];
type Status = 'idle' | 'locating' | 'loading' | 'ready' | 'empty' | 'denied' | 'unsupported';

interface NearbyAddsProps {
  tokens: Tokens;
  serifFont: string;
  onPick: (candidate: PlaceCandidate) => void;
  /** Visibly blocks picks while the host is busy (e.g. onboarding mid-batch),
   *  instead of silently dropping them. */
  disabled?: boolean;
}

function initialOf(name: string): string {
  return (name.replace(/^The /i, '')[0] || '?').toUpperCase();
}

/**
 * "Nearby, right now" — zero-typing adds. On request, uses the browser's
 * geolocation to fetch nearby food/drink venues (via /api/nearby-place) and lists
 * them nearest-first with distance labels; tapping one adds it. Opt-in (we never
 * ask for location until the user taps), token-driven for both moods.
 */
export default function NearbyAdds({ tokens: t, serifFont, onPick, disabled }: NearbyAddsProps) {
  const { t: tr } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  // Geolocation + fetch resolve after the host dialog may have closed — never
  // set state on an unmounted component.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const request = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!alive.current) return;
        setStatus('loading');
        // Cache it — plain text search can silently reuse this coordinate to
        // bias its own results without ever prompting for location itself.
        setCachedLocation(pos.coords.latitude, pos.coords.longitude);
        try {
          const res = await fetch(
            `/api/nearby-place?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          const data = (await res.json()) as PlaceCandidate[];
          if (!alive.current) return;
          const list = Array.isArray(data) ? data : [];
          setResults(list);
          setStatus(list.length ? 'ready' : 'empty');
        } catch {
          if (alive.current) setStatus('empty');
        }
      },
      () => {
        if (alive.current) setStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Picking removes the row (prevents accidental double-adds of the same place).
  const pick = (c: PlaceCandidate) => {
    if (disabled) return;
    setResults((prev) => prev.filter((x) => x !== c));
    onPick(c);
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
        disabled={disabled}
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
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || undefined}
            onClick={() => pick(c)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick(c);
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.55 : 1,
              borderBottom: i === results.length - 1 ? 'none' : `1px solid ${t.borderSoft}`,
              '&:hover': disabled ? {} : { background: t.searchBg },
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
