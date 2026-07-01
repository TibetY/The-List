import { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Check, ErrorOutline, Add } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { PlaceCandidate } from '~/types/restaurant';
import type { listTokens } from '~/listTheme';
import PlaceSearch from '~/components/PlaceSearch';
import RestaurantThumb from '~/components/RestaurantThumb';
import { buildEnrichedRestaurant, type PlaceSeed } from '~/services/placeEnrich.client';
import { createRestaurant } from '~/services/restaurants.client';

type Tokens = (typeof listTokens)['light'];

interface OnboardingProps {
  tokens: Tokens;
  serifFont: string;
  listId: string;
  userId: string;
  /** Refresh the dashboard after a batch of places has been added. */
  onCreated: () => void;
  /** Escape hatch to the blank manual form. */
  onAddManually: () => void;
}

/** A curated set of real places to seed a list with, by city. Names + addresses
 *  only — everything else is enriched from the web on add. */
interface StarterPack {
  id: string;
  labelKey: string;
  places: PlaceSeed[];
}

const STARTER_PACKS: StarterPack[] = [
  {
    id: 'ottawa',
    labelKey: 'onboarding.packOttawa',
    places: [
      { name: 'The Whalesbone', address: '430 Bank St, Ottawa, ON' },
      { name: 'Riviera', address: '62 Sparks St, Ottawa, ON' },
      { name: 'Play Food & Wine', address: '1 York St, Ottawa, ON' },
    ],
  },
  {
    id: 'toronto',
    labelKey: 'onboarding.packToronto',
    places: [
      { name: 'Alo', address: '163 Spadina Ave, Toronto, ON' },
      { name: 'Pai Northern Thai Kitchen', address: '18 Duncan St, Toronto, ON' },
      { name: 'Canoe', address: '66 Wellington St W, Toronto, ON' },
    ],
  },
  {
    id: 'montreal',
    labelKey: 'onboarding.packMontreal',
    places: [
      { name: 'Joe Beef', address: '2491 Notre-Dame St W, Montreal, QC' },
      { name: "Schwartz's", address: '3895 Saint-Laurent Blvd, Montreal, QC' },
      { name: 'Au Pied de Cochon', address: '536 Duluth Ave E, Montreal, QC' },
    ],
  },
];

type Phase = 'pending' | 'done' | 'error';
interface SeedingCard {
  key: string;
  name: string;
  phase: Phase;
  image?: string;
}

/** Initial letter for a card's fallback thumb (mirrors decorate()). */
function initialOf(name: string): string {
  return (name.replace(/^The /i, '')[0] || '?').toUpperCase();
}

/**
 * First-run empty state for an editable, brand-new list. Turns "zero places" into
 * a populated list in a tap or two: search any place, or seed a whole city, and
 * watch the cards resolve their photos live. Enrichment + create is headless
 * (buildEnrichedRestaurant), so no form stands between the user and a living list.
 */
export default function Onboarding({
  tokens: t,
  serifFont,
  listId,
  userId,
  onCreated,
  onAddManually,
}: OnboardingProps) {
  const { t: tr } = useTranslation();
  const [seeding, setSeeding] = useState<SeedingCard[]>([]);
  const [busy, setBusy] = useState(false);

  const patch = (key: string, next: Partial<SeedingCard>) =>
    setSeeding((prev) => prev.map((c) => (c.key === key ? { ...c, ...next } : c)));

  // Add a batch of places sequentially (respecting the geocode rate limit),
  // showing each card resolve from a skeleton to its photo. Revalidates once at
  // the end so the dashboard swaps to the real, populated list.
  const runSeeds = async (seeds: PlaceSeed[]) => {
    if (busy) return;
    setBusy(true);
    const cards: SeedingCard[] = seeds.map((s, i) => ({
      key: `${s.name}-${Date.now()}-${i}`,
      name: s.name,
      phase: 'pending',
    }));
    setSeeding((prev) => [...prev, ...cards]);
    for (let i = 0; i < seeds.length; i++) {
      try {
        const payload = await buildEnrichedRestaurant(seeds[i]);
        await createRestaurant(payload, listId, userId);
        patch(cards[i].key, { phase: 'done', image: payload.image });
      } catch {
        patch(cards[i].key, { phase: 'error' });
      }
    }
    setBusy(false);
    onCreated();
  };

  return (
    <Box
      className="animate-fade-in-up"
      sx={{ maxWidth: 680, mx: 'auto', mt: { xs: 3, md: 6 }, mb: 6, px: 1, textAlign: 'center' }}
    >
      <Box component="h2" sx={{ fontFamily: serifFont, fontWeight: 400, fontSize: { xs: 30, md: 40 }, color: t.ink, m: 0, lineHeight: 1.1 }}>
        {tr('onboarding.title')}
      </Box>
      <Box component="p" sx={{ color: t.muted, fontSize: 15.5, lineHeight: 1.6, mt: 1.5, mb: 3.5, maxWidth: 460, mx: 'auto' }}>
        {tr('onboarding.subtitle')}
      </Box>

      <Box sx={{ textAlign: 'left' }}>
        <PlaceSearch
          tokens={t}
          serifFont={serifFont}
          onPick={(c: PlaceCandidate) => runSeeds([c])}
          placeholder={tr('onboarding.searchPlaceholder')}
          focusOnMount
          clearOnPick
        />
      </Box>

      {/* resolving cards — the "your list is alive" moment */}
      {seeding.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' }, gap: '12px', mt: 3 }}>
          {seeding.map((c) => (
            <Box
              key={c.key}
              sx={{
                border: `1px solid ${t.border}`,
                borderRadius: '14px',
                overflow: 'hidden',
                background: t.cardBg,
                transition: 'box-shadow .5s ease',
                boxShadow: c.phase === 'done' ? `0 0 0 3px ${t.glow}` : 'none',
              }}
            >
              <Box sx={{ position: 'relative', height: 96, background: t.skeleton }}>
                {c.phase !== 'pending' && (
                  <RestaurantThumb
                    image={c.image}
                    alt={c.name}
                    initial={initialOf(c.name)}
                    serifFont={serifFont}
                    tokens={t}
                    initialFontSize={34}
                    sx={{ height: '100%' }}
                  />
                )}
                <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex' }}>
                  {c.phase === 'pending' && <CircularProgress size={16} sx={{ color: t.accent }} />}
                  {c.phase === 'done' && (
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: t.accent, color: t.accentText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check sx={{ fontSize: 14 }} />
                    </Box>
                  )}
                  {c.phase === 'error' && <ErrorOutline sx={{ fontSize: 18, color: t.error }} />}
                </Box>
              </Box>
              <Box sx={{ padding: '8px 10px 10px' }}>
                <Box sx={{ fontFamily: serifFont, fontSize: 15, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </Box>
                <Box sx={{ fontSize: 11.5, color: c.phase === 'error' ? t.error : t.muted, mt: '2px' }}>
                  {c.phase === 'pending'
                    ? tr('onboarding.resolving')
                    : c.phase === 'error'
                      ? tr('onboarding.addFailed')
                      : tr('onboarding.added')}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* city starter packs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', my: 3.5 }}>
        <Box sx={{ flex: 1, height: '1px', background: t.divider }} />
        <Box sx={{ color: t.faint, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {tr('onboarding.orStarter')}
        </Box>
        <Box sx={{ flex: 1, height: '1px', background: t.divider }} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: '12px', textAlign: 'left' }}>
        {STARTER_PACKS.map((pack) => (
          <Box
            key={pack.id}
            sx={{ border: `1px solid ${t.border}`, borderRadius: '14px', background: t.cardBg, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <Box sx={{ fontFamily: serifFont, fontSize: 18, color: t.ink }}>{tr(pack.labelKey)}</Box>
            <Box sx={{ color: t.muted, fontSize: 12.5, lineHeight: 1.5, flex: 1 }}>
              {pack.places.map((p) => p.name).join(' · ')}
            </Box>
            <Box
              component="button"
              type="button"
              disabled={busy}
              onClick={() => runSeeds(pack.places)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: `1px solid ${t.pillBorder}`,
                borderRadius: '10px',
                background: 'transparent',
                color: busy ? t.faint : t.accent,
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 600,
                fontSize: '13.5px',
                padding: '8px 12px',
                cursor: busy ? 'default' : 'pointer',
                '&:hover': busy ? {} : { background: t.searchBg },
              }}
            >
              <Add sx={{ fontSize: 17 }} /> {tr('onboarding.addThese')}
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        component="button"
        type="button"
        onClick={onAddManually}
        sx={{ mt: 3, border: 'none', background: 'transparent', color: t.muted, fontFamily: "'DM Sans',sans-serif", fontSize: '13.5px', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
      >
        {tr('onboarding.manual')}
      </Box>
    </Box>
  );
}
