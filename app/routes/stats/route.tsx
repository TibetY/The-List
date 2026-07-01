import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import type { LoaderFunction, LinksFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import leafletStylesHref from 'leaflet/dist/leaflet.css?url';
import { Box, Button, ThemeProvider } from '@mui/material';
import { ArrowBack, Download } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { createSupabaseServerClient } from '~/supabase.server';
import { getLists, ensureDefaultList } from '~/services/lists.server';
import { getRestaurants } from '~/services/restaurants.server';
import { getProfile } from '~/services/profiles.server';
import type { Restaurant } from '~/types/restaurant';
import { computeFoodStats, type LabelCount } from '~/utils/foodStats';
import { downloadShareCard, type ShareSize } from '~/utils/shareCard.client';
import {
  listTokens,
  makeListTheme,
  getStoredMode,
  storeMode,
  type ListMode,
} from '~/listTheme';
import LanguageSwitcher from '~/components/LanguageSwitcher';
import type { RestaurantMapProps } from '~/components/RestaurantMap';

const RestaurantMap = lazy<React.ComponentType<RestaurantMapProps>>(() =>
  import.meta.env.SSR
    ? Promise.resolve({ default: () => null })
    : import('~/components/RestaurantMap')
);

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: leafletStylesHref }];

type LoaderData = {
  restaurants: Restaurant[];
  listId: string | null;
  listName: string;
  displayName: string | null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login?next=/stats');

  const requestedListId = new URL(request.url).searchParams.get('list');
  let lists = await getLists(supabase, user.id);
  if (lists.length === 0) {
    await ensureDefaultList(supabase);
    lists = await getLists(supabase, user.id);
  }
  const activeList =
    lists.find((l) => l.id === requestedListId) ||
    lists.find((l) => l.isDefault) ||
    lists[0] ||
    null;

  const restaurants = activeList ? await getRestaurants(supabase, activeList.id) : [];
  const profile = await getProfile(supabase, user.id);

  return json<LoaderData>(
    {
      restaurants,
      listId: activeList?.id ?? null,
      listName: activeList?.name ?? 'My List',
      displayName: profile?.displayName ?? null,
    },
    { headers }
  );
};

export default function StatsPage() {
  const { restaurants, listId, listName } = useLoaderData<LoaderData>();
  const { t: tr } = useTranslation();

  const [mode, setMode] = useState<ListMode>('light');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setMode(getStoredMode()), []);
  const changeMode = (m: ListMode) => {
    setMode(m);
    storeMode(m);
  };

  const t = listTokens[mode];
  const muiTheme = useMemo(() => makeListTheme(mode), [mode]);
  const serif = "'Instrument Serif',serif";

  const stats = useMemo(() => computeFoodStats(restaurants), [restaurants]);
  const hasMap = useMemo(
    () =>
      restaurants.some((r) =>
        (r.locations ?? []).some((l) => typeof l.lat === 'number' && typeof l.lng === 'number')
      ),
    [restaurants]
  );

  const backHref = listId ? `/dashboard?list=${listId}` : '/dashboard';

  const share = (size: ShareSize) =>
    downloadShareCard(stats, {
      mode,
      size,
      listName,
      brand: tr('brand'),
      labels: {
        spots: tr('stats.spotsWord'),
        cuisines: tr('stats.cuisinesWord'),
        cities: tr('stats.citiesWord'),
        visited: tr('stats.visitedWord'),
        topCuisines: tr('stats.topCuisines'),
        tagline: tr('stats.tagline'),
      },
    });

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        data-theme={mode}
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: t.pageBg,
          color: t.ink,
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        {/* header */}
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: { xs: '14px 18px', md: '18px 40px' },
            borderBottom: `1px solid ${t.border}`,
            background: t.panelBg,
            gap: 2,
          }}
        >
          <Box
            component={Link}
            to={backHref}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: t.muted, textDecoration: 'none', fontSize: 14 }}
          >
            <ArrowBack sx={{ fontSize: 18 }} /> {tr('stats.back')}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <LanguageSwitcher />
            <Box sx={{ display: 'flex', background: t.searchBg, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '3px' }}>
              <Box component="button" onClick={() => changeMode('light')} aria-label={tr('dashboard.themeLight')} aria-pressed={mode === 'light'}
                sx={{ border: 'none', cursor: 'pointer', width: 30, height: 26, borderRadius: '999px', fontSize: 13, background: mode === 'light' ? t.accent : 'transparent', color: mode === 'light' ? t.accentText : t.faint }}>☀</Box>
              <Box component="button" onClick={() => changeMode('dark')} aria-label={tr('dashboard.themeDark')} aria-pressed={mode === 'dark'}
                sx={{ border: 'none', cursor: 'pointer', width: 30, height: 26, borderRadius: '999px', fontSize: 13, background: mode === 'dark' ? t.accent : 'transparent', color: mode === 'dark' ? t.accentText : t.faint }}>☾</Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, width: '100%', maxWidth: 980, mx: 'auto', padding: { xs: '28px 18px 48px', md: '44px 40px 64px' } }}>
          <Box component="p" sx={{ color: t.accent, fontSize: 13, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', m: 0, mb: 1 }}>
            {tr('stats.eyebrow', { name: listName })}
          </Box>

          {stats.total === 0 ? (
            <Box sx={{ mt: 4, py: { xs: 6, md: 10 }, textAlign: 'center', border: `1px solid ${t.border}`, borderRadius: '16px', background: t.cardBg }}>
              <Box sx={{ fontFamily: serif, fontSize: 30, mb: 1 }}>{tr('stats.emptyTitle')}</Box>
              <Box sx={{ color: t.muted, fontSize: 15, mb: 3 }}>{tr('stats.emptyBody')}</Box>
              <Button component={Link} to={backHref} variant="contained">{tr('stats.back')}</Button>
            </Box>
          ) : (
            <>
              {/* hero */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
                <Box component="h1" sx={{ fontFamily: serif, fontWeight: 400, fontSize: { xs: 72, md: 120 }, lineHeight: 0.95, m: 0, color: t.ink }}>
                  {stats.total}
                </Box>
                <Box component="span" sx={{ fontFamily: serif, fontSize: { xs: 30, md: 44 }, color: t.accent }}>
                  {tr('stats.spotsWord')}
                </Box>
              </Box>
              <Box sx={{ color: t.muted, fontSize: { xs: 15, md: 17 }, mt: 1.5 }}>
                {tr('stats.heroSub', {
                  cuisines: stats.cuisines.length,
                  cities: stats.cities.length,
                  visited: stats.beenCount,
                })}
              </Box>

              {/* stat tiles */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(5,1fr)' }, gap: '12px', mt: 4 }}>
                <StatTile tokens={t} serif={serif} value={stats.beenCount} label={tr('stats.been')} />
                <StatTile tokens={t} serif={serif} value={stats.wantCount} label={tr('stats.want')} />
                <StatTile tokens={t} serif={serif} value={stats.favoriteCount} label={tr('stats.favorites')} />
                <StatTile tokens={t} serif={serif} value={stats.averageRating ?? '—'} label={tr('stats.avgRating')} />
                <StatTile tokens={t} serif={serif} value={stats.totalMichelinStars} label={tr('stats.michelin')} />
              </Box>

              {/* breakdowns */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 3, md: 4 }, mt: 5 }}>
                <BarSection tokens={t} serif={serif} title={tr('stats.topCuisines')} rows={stats.cuisines.slice(0, 6)} />
                <BarSection tokens={t} serif={serif} title={tr('stats.cities')} rows={stats.cities.slice(0, 6)} emptyLabel={tr('stats.noCities')} />
                <BarSection tokens={t} serif={serif} title={tr('stats.priceRange')} rows={stats.priceTiers} mono />
                <MostVisited tokens={t} serif={serif} title={tr('stats.mostVisited')} rows={stats.topVisited} visitsLabel={(n) => tr('dashboard.visitsCount', { count: n })} emptyLabel={tr('stats.noVisits')} />
              </Box>

              {/* map */}
              {hasMap && (
                <Box sx={{ mt: 5 }}>
                  <SectionTitle tokens={t}>{tr('stats.onMap')}</SectionTitle>
                  <Box sx={{ mt: 2, height: 420, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', background: t.mapBg }}>
                    {mounted ? (
                      <Suspense fallback={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.muted }}>{tr('dashboard.loadingMap')}</Box>}>
                        <RestaurantMap restaurants={restaurants} accent={t.accent} onSelect={() => undefined} />
                      </Suspense>
                    ) : null}
                  </Box>
                </Box>
              )}

              {/* share */}
              <Box sx={{ mt: 5, padding: { xs: 3, md: 4 }, borderRadius: '18px', border: `1px solid ${t.border}`, background: t.cardBg }}>
                <Box sx={{ fontFamily: serif, fontSize: { xs: 24, md: 30 }, color: t.ink }}>{tr('stats.shareTitle')}</Box>
                <Box sx={{ color: t.muted, fontSize: 14.5, mt: 1, mb: 2.5, maxWidth: 520 }}>{tr('stats.shareBody')}</Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button onClick={() => share('square')} variant="contained" startIcon={<Download />}>{tr('stats.downloadSquare')}</Button>
                  <Button onClick={() => share('story')} variant="outlined" startIcon={<Download />}>{tr('stats.downloadStory')}</Button>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

type Tokens = (typeof listTokens)['light'];

function SectionTitle({ children, tokens: t }: { children: React.ReactNode; tokens: Tokens }) {
  return (
    <Box component="h2" sx={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: t.faint, m: 0 }}>
      {children}
    </Box>
  );
}

function StatTile({ tokens: t, serif, value, label }: { tokens: Tokens; serif: string; value: number | string; label: string }) {
  return (
    <Box sx={{ padding: '16px 18px', borderRadius: '14px', border: `1px solid ${t.border}`, background: t.cardBg }}>
      <Box sx={{ fontFamily: serif, fontSize: 34, lineHeight: 1, color: t.ink }}>{value}</Box>
      <Box sx={{ color: t.muted, fontSize: 12.5, mt: '6px' }}>{label}</Box>
    </Box>
  );
}

function BarSection({
  tokens: t,
  serif,
  title,
  rows,
  mono,
  emptyLabel,
}: {
  tokens: Tokens;
  serif: string;
  title: string;
  rows: LabelCount[];
  mono?: boolean;
  emptyLabel?: string;
}) {
  const max = rows[0]?.count ?? 1;
  return (
    <Box>
      <SectionTitle tokens={t}>{title}</SectionTitle>
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.length === 0 ? (
          <Box sx={{ color: t.faint, fontSize: 13.5 }}>{emptyLabel ?? '—'}</Box>
        ) : (
          rows.map((r) => (
            <Box key={r.label} sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Box sx={{ width: 120, flex: 'none', fontFamily: mono ? "'DM Mono',monospace" : serif, fontSize: mono ? 14 : 16, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.label}
              </Box>
              <Box sx={{ flex: 1, height: 10, borderRadius: '999px', background: t.skeleton, overflow: 'hidden' }}>
                <Box sx={{ width: `${Math.max(6, (r.count / max) * 100)}%`, height: '100%', background: t.accent, borderRadius: '999px' }} />
              </Box>
              <Box sx={{ width: 34, flex: 'none', textAlign: 'right', fontFamily: "'DM Mono',monospace", fontSize: 13, color: t.muted }}>{r.count}</Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

function MostVisited({
  tokens: t,
  serif,
  title,
  rows,
  visitsLabel,
  emptyLabel,
}: {
  tokens: Tokens;
  serif: string;
  title: string;
  rows: { name: string; visitCount: number }[];
  visitsLabel: (n: number) => string;
  emptyLabel: string;
}) {
  return (
    <Box>
      <SectionTitle tokens={t}>{title}</SectionTitle>
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.length === 0 ? (
          <Box sx={{ color: t.faint, fontSize: 13.5 }}>{emptyLabel}</Box>
        ) : (
          rows.map((r, i) => (
            <Box key={`${r.name}-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Box sx={{ fontFamily: serif, fontSize: 18, color: t.accent, width: 22, flex: 'none' }}>{i + 1}</Box>
              <Box sx={{ flex: 1, fontFamily: serif, fontSize: 16, color: t.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</Box>
              <Box sx={{ color: t.muted, fontSize: 12.5, flex: 'none' }}>{visitsLabel(r.visitCount)}</Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
