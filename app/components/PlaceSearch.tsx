import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Search, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { PlaceCandidate } from '~/types/restaurant';
import type { listTokens } from '~/listTheme';
import RestaurantThumb from '~/components/RestaurantThumb';
import { formatDistance } from '~/utils/geo';
import { getSilentLocation } from '~/utils/userLocation.client';

type Tokens = (typeof listTokens)['light'];

interface PlaceSearchProps {
  tokens: Tokens;
  serifFont: string;
  /** Called when a candidate is chosen (click / Enter). */
  onPick: (candidate: PlaceCandidate) => void;
  placeholder?: string;
  focusOnMount?: boolean;
  /** Clear the field after a pick (onboarding adds several in a row). */
  clearOnPick?: boolean;
}

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

/** Initial letter for a candidate's fallback thumb (mirrors decorate()). */
function initialOf(name: string): string {
  return (name.replace(/^The /i, '')[0] || '?').toUpperCase();
}

/**
 * Search-first place picker. Debounced queries hit /api/search-place; results
 * render as tappable rows (thumb / name / address / cuisine). Fully driven by the
 * brand tokens, so it reads correctly in both moods. Manual entry always remains
 * available in whatever form hosts this — this is an accelerator, not a gate.
 */
export default function PlaceSearch({
  tokens: t,
  serifFont,
  onPick,
  placeholder,
  focusOnMount,
  clearOnPick,
}: PlaceSearchProps) {
  const { t: tr } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  // Resolved once per mount, never re-triggers the search effect below — this
  // never prompts for permission (see getSilentLocation), so it's safe to
  // fire on every place-search instance without surprising the user.
  const biasRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSilentLocation().then((loc) => {
      if (!cancelled) biasRef.current = loc;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim();
  const open = q.length >= MIN_QUERY;

  useEffect(() => {
    if (q.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const lang =
          typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';
        const bias = biasRef.current;
        const biasParams = bias ? `&lat=${bias.lat}&lng=${bias.lng}` : '';
        const res = await fetch(
          `/api/search-place?query=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}${biasParams}`,
          { signal: controller.signal }
        );
        const data = (await res.json()) as PlaceCandidate[];
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [q]);

  // A fresh result set invalidates the previously-highlighted row.
  useEffect(() => setActive(-1), [results]);

  // Focus programmatically (rather than the autoFocus attribute) so we keep the
  // convenience without tripping the a11y rule against it.
  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  const choose = (candidate: PlaceCandidate) => {
    onPick(candidate);
    if (clearOnPick) {
      setQuery('');
      setResults([]);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* input */}
      <Box
        component="label"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: t.searchBg,
          border: `1px solid ${t.border}`,
          borderRadius: '14px',
          padding: '11px 14px',
          cursor: 'text',
          transition: 'border-color .15s, box-shadow .15s',
          '&:focus-within': {
            borderColor: t.accent,
            boxShadow: `0 0 0 3px ${t.ring}`,
          },
        }}
      >
        <Search aria-hidden sx={{ fontSize: 19, color: t.faint, flex: 'none' }} />
        <Box
          component="input"
          ref={inputRef}
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? tr('search.placeholder')}
          aria-label={tr('search.label')}
          role="combobox"
          aria-expanded={open}
          aria-controls="place-search-results"
          sx={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: t.ink,
            fontFamily: "'DM Sans',sans-serif",
            // ≥16px on phones — iOS auto-zooms (and stays zoomed) on smaller inputs.
            fontSize: { xs: '16px', sm: '15px' },
            width: '100%',
            '::placeholder': { color: t.faint },
          }}
        />
        {loading ? (
          <CircularProgress size={16} sx={{ color: t.faint, flex: 'none' }} />
        ) : query ? (
          <Box
            component="button"
            type="button"
            aria-label={tr('search.clear')}
            onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
            onClick={() => setQuery('')}
            sx={{ display: 'flex', border: 'none', background: 'transparent', cursor: 'pointer', color: t.faint, p: 0, flex: 'none' }}
          >
            <Close sx={{ fontSize: 17 }} />
          </Box>
        ) : null}
      </Box>

      {/* results panel */}
      {open && (
        <Box
          id="place-search-results"
          role="listbox"
          sx={{
            mt: '8px',
            border: `1px solid ${t.border}`,
            borderRadius: '14px',
            overflow: 'hidden',
            background: t.cardBg,
            boxShadow: t.shadow2,
          }}
        >
          {loading && results.length === 0 ? (
            [0, 1, 2].map((i) => <SkeletonRow key={i} tokens={t} last={i === 2} />)
          ) : results.length === 0 ? (
            <Box sx={{ padding: '16px', color: t.muted, fontSize: 14 }}>
              {tr('search.noResults')}
            </Box>
          ) : (
            results.map((c, i) => (
              <Box
                key={`${c.name}-${c.lat}-${c.lng}-${i}`}
                role="option"
                aria-selected={active === i}
                tabIndex={0}
                onClick={() => choose(c)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    choose(c);
                  }
                }}
                onMouseEnter={() => setActive(i)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: i === results.length - 1 ? 'none' : `1px solid ${t.borderSoft}`,
                  background: active === i ? t.searchBg : 'transparent',
                }}
              >
                <Box sx={{ width: 38, height: 38, borderRadius: '10px', flex: 'none' }}>
                  <RestaurantThumb
                    image={undefined}
                    alt={c.name}
                    initial={initialOf(c.name)}
                    serifFont={serifFont}
                    tokens={t}
                    initialFontSize={20}
                    sx={{ width: '100%', height: '100%', borderRadius: '10px' }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ fontFamily: serifFont, fontSize: 16, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </Box>
                  <Box sx={{ color: t.muted, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.address}
                  </Box>
                </Box>
                {c.distanceM != null && (
                  <Box
                    component="span"
                    sx={{ flex: 'none', fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: t.faint }}
                  >
                    {formatDistance(c.distanceM)}
                  </Box>
                )}
                {c.cuisineType && (
                  <Box
                    component="span"
                    sx={{
                      flex: 'none',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: t.accent,
                      border: `1px solid ${t.accent}`,
                      borderRadius: '999px',
                      padding: '2px 9px',
                    }}
                  >
                    {tr(`cuisines.${c.cuisineType}`, c.cuisineType)}
                  </Box>
                )}
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}

/** A shimmering placeholder row shown while results load. */
function SkeletonRow({ tokens: t, last }: { tokens: Tokens; last: boolean }) {
  const bar = (w: number | string, h: number) => (
    <Box sx={{ width: w, height: h, borderRadius: '6px', background: t.skeleton }} />
  );
  return (
    <Box
      aria-hidden
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        borderBottom: last ? 'none' : `1px solid ${t.borderSoft}`,
      }}
    >
      <Box sx={{ width: 38, height: 38, borderRadius: '10px', background: t.skeleton, flex: 'none' }} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {bar('55%', 12)}
        {bar('80%', 10)}
      </Box>
    </Box>
  );
}
