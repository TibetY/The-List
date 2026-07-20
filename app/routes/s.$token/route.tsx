import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import type { LoaderFunction, ActionFunction, LinksFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Link, Form } from '@remix-run/react';
import leafletStylesHref from 'leaflet/dist/leaflet.css?url';
import { Box, Button, ThemeProvider } from '@mui/material';
import { Bookmark } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { createSupabaseServerClient } from '~/supabase.server';
import { getSharedList, forkSharedList, type SharedList } from '~/services/sharedList.server';
import { decorate } from '~/utils/decorateRestaurant';
import type { Restaurant } from '~/types/restaurant';
import RestaurantThumb from '~/components/RestaurantThumb';
import RestaurantDetailDialog from '~/components/RestaurantDetailDialog';
import Stars from '~/components/Stars';
import PlaceCard, { BookingPill } from '~/components/PlaceCard';
import LanguageSwitcher from '~/components/LanguageSwitcher';
import {
  listTokens,
  makeListTheme,
  getStoredMode,
  storeMode,
  type ListMode,
} from '~/listTheme';
import type { RestaurantMapProps } from '~/components/RestaurantMap';

const RestaurantMap = lazy<React.ComponentType<RestaurantMapProps>>(() =>
  import.meta.env.SSR
    ? Promise.resolve({ default: () => null })
    : import('~/components/RestaurantMap')
);

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: leafletStylesHref },
];

type LoaderData = {
  token: string;
  signedIn: boolean;
  shared: SharedList | null;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const token = params.token ?? '';
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const shared = await getSharedList(supabase, token);
  return json<LoaderData>({ token, signedIn: !!user, shared }, { headers });
};

export const action: ActionFunction = async ({ request, params }) => {
  const token = params.token ?? '';
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Must be signed in to fork — send them to sign up / log in and back here.
  if (!user) {
    return redirect(`/login?next=${encodeURIComponent(`/s/${token}`)}`, { headers });
  }
  try {
    const newListId = await forkSharedList(supabase, token);
    return redirect(`/dashboard?list=${newListId}&forked=1`, { headers });
  } catch (error) {
    // The link likely expired between viewing and forking; reloading shows the
    // unavailable state if so.
    console.error('Error forking shared list:', error);
    return redirect(`/s/${encodeURIComponent(token)}`, { headers });
  }
};

const activateOnKey = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

type ViewMode = 'tile' | 'list' | 'map';
type FilterMode = 'all' | 'been' | 'want';
type SortMode = 'recent' | 'rating' | 'name' | 'price';
const SORT_MODES: SortMode[] = ['recent', 'rating', 'name', 'price'];

export default function SharedListPage() {
  const { token, signedIn, shared } = useLoaderData<LoaderData>();
  const { t: tr } = useTranslation();

  const [mode, setMode] = useState<ListMode>('light');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setMode(getStoredMode()), []);
  const changeMode = (m: ListMode) => {
    setMode(m);
    storeMode(m);
  };

  const [view, setView] = useState<ViewMode>('tile');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);

  const t = listTokens[mode];
  const muiTheme = useMemo(() => makeListTheme(mode), [mode]);
  const serif = "'Instrument Serif',serif";

  const decorated = useMemo(() => (shared?.restaurants ?? []).map(decorate), [shared]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return decorated.filter((r) => {
      const matchesStatus =
        filter === 'all' ||
        (filter === 'been' && r.isBeen) ||
        (filter === 'want' && r.isWant);
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [decorated, filter, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case 'rating':
        arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'name':
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price':
        arr.sort((a, b) => (a.priceRange?.length ?? 0) - (b.priceRange?.length ?? 0));
        break;
      default:
        arr.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        break;
    }
    return arr;
  }, [filtered, sort]);

  const total = decorated.length;
  const beenCount = decorated.filter((r) => r.isBeen).length;
  const wantCount = decorated.filter((r) => r.isWant).length;

  const openDetail = (r: Restaurant) => {
    setSelected(r);
    setDetailOpen(true);
  };

  const segBtn = (val: ViewMode) => ({
    background: view === val ? t.segBg : 'transparent',
    color: view === val ? t.segFg : t.segIdle,
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
    fontSize: '13.5px',
    fontWeight: 500,
    padding: '7px 18px',
    borderRadius: '999px',
  });
  const pill = (val: FilterMode) => ({
    background: filter === val ? t.pBg : 'transparent',
    color: filter === val ? t.pFg : t.pIdle,
    border: `1px solid ${t.pillBorder}`,
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    padding: '7px 15px',
    borderRadius: '999px',
  });

  // ---- Unavailable (missing / revoked / expired) -------------------------
  if (!shared) {
    return (
      <ThemeProvider theme={muiTheme}>
        <Box
          data-theme={mode}
          sx={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 2,
            px: 3,
            background: t.pageBg,
            color: t.ink,
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          <Box sx={{ fontFamily: serif, fontSize: 34 }}>{tr('shared.unavailableTitle')}</Box>
          <Box sx={{ color: t.muted, maxWidth: 420 }}>{tr('shared.unavailableBody')}</Box>
          <Button component={Link} to="/" variant="contained" sx={{ mt: 1 }}>
            {tr('errors.backHome')}
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <Box
              aria-hidden
              sx={{
                width: 27,
                height: 27,
                background: t.accent,
                borderRadius: '50% 50% 50% 3px',
                transform: 'rotate(45deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <Box sx={{ width: 9, height: 9, background: t.panelBg, borderRadius: '50%', transform: 'rotate(-45deg)' }} />
            </Box>
            <Box component={Link} to="/" sx={{ fontFamily: serif, fontSize: { xs: 20, sm: 26 }, letterSpacing: '.01em', color: t.ink, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {tr('brand')}
            </Box>
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

        {/* body */}
        <Box sx={{ flexGrow: 1, width: '100%', maxWidth: 1320, mx: 'auto', padding: { xs: '24px 18px 0', md: '30px 40px 0' } }}>
          {/* title + save-a-copy */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Box component="h1" sx={{ fontFamily: serif, fontSize: { xs: 34, md: 44 }, fontWeight: 400, m: 0, lineHeight: 1.05 }}>
                {shared.list.name}
              </Box>
              <Box component="p" sx={{ color: t.muted, fontSize: 15, mt: '8px', mb: 0 }}>
                {shared.ownerName ? tr('shared.byline', { name: shared.ownerName }) + ' · ' : ''}
                {tr('dashboard.stats', { total, been: beenCount, want: wantCount })}
              </Box>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', mt: '8px', color: t.faint, fontSize: 12.5 }}>
                {tr('shared.readOnly')}
              </Box>
            </Box>
            {/* Save a copy: signed-in posts the fork; signed-out routes via auth. */}
            {signedIn ? (
              <Form method="post">
                <input type="hidden" name="intent" value="fork" />
                <Button type="submit" variant="contained" startIcon={<Bookmark sx={{ fontSize: 18 }} />}>
                  {tr('shared.saveCopy')}
                </Button>
              </Form>
            ) : (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button component={Link} to={`/signup?next=${encodeURIComponent(`/s/${token}`)}`} variant="contained" startIcon={<Bookmark sx={{ fontSize: 18 }} />}>
                  {tr('shared.createAccountToSave')}
                </Button>
                <Box component={Link} to={`/login?next=${encodeURIComponent(`/s/${token}`)}`} sx={{ color: t.accent, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  {tr('shared.signInToSave')}
                </Box>
              </Box>
            )}
          </Box>

          {/* controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mt: '22px', flexWrap: 'wrap' }}>
            <Box
              component="input"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder={tr('dashboard.searchPlaceholder')}
              aria-label={tr('dashboard.searchLabel')}
              sx={{
                background: t.searchBg, border: `1px solid ${t.border}`, borderRadius: '999px',
                padding: '8px 16px', color: t.ink, fontFamily: "'DM Sans',sans-serif", fontSize: '13.5px',
                outline: 'none', minWidth: { xs: '100%', sm: 200 }, '::placeholder': { color: t.faint },
              }}
            />
            <Box role="group" aria-label={tr('dashboard.filterStatusLabel')} sx={{ display: 'flex', gap: '10px' }}>
              <Box component="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} sx={pill('all')}>{tr('dashboard.filterAll')}</Box>
              <Box component="button" aria-pressed={filter === 'been'} onClick={() => setFilter('been')} sx={pill('been')}>{tr('dashboard.filterBeen')}</Box>
              <Box component="button" aria-pressed={filter === 'want'} onClick={() => setFilter('want')} sx={pill('want')}>{tr('dashboard.filterWant')}</Box>
            </Box>
            <Box
              component="select"
              value={sort}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as SortMode)}
              aria-label={tr('dashboard.sort_recent')}
              sx={{
                background: 'transparent', border: `1px solid ${t.pillBorder}`, borderRadius: '999px',
                padding: '7px 14px', color: t.chip, fontFamily: "'DM Sans',sans-serif", fontSize: '13px', cursor: 'pointer',
              }}
            >
              {SORT_MODES.map((m) => (
                <option key={m} value={m}>{tr(`dashboard.sort_${m}`)}</option>
              ))}
            </Box>
            <Box sx={{ ml: { sm: 'auto' }, display: 'flex', background: t.searchBg, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '4px' }}>
              <Box component="button" aria-pressed={view === 'tile'} onClick={() => setView('tile')} sx={segBtn('tile')}>{tr('dashboard.viewTile')}</Box>
              <Box component="button" aria-pressed={view === 'list'} onClick={() => setView('list')} sx={segBtn('list')}>{tr('dashboard.viewList')}</Box>
              <Box component="button" aria-pressed={view === 'map'} onClick={() => setView('map')} sx={segBtn('map')}>{tr('dashboard.viewMap')}</Box>
            </Box>
          </Box>

          {/* content */}
          {sorted.length === 0 ? (
            <Box sx={{ mt: '24px', mb: '40px', textAlign: 'center', py: { xs: 6, md: 10 }, px: 3, borderRadius: '16px', border: `1px solid ${t.border}`, background: t.cardBg }}>
              <Box sx={{ fontFamily: serif, fontSize: 30, mb: 1 }}>{tr('dashboard.noMatchesTitle')}</Box>
              <Box sx={{ color: t.muted, fontSize: 15 }}>{tr('dashboard.emptyTryFilter')}</Box>
            </Box>
          ) : view === 'map' ? (
            <Box sx={{ padding: '24px 0 40px', display: 'flex', gap: '18px', flexDirection: { xs: 'column', md: 'row' } }}>
              <Box sx={{ flex: 1, height: 540, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', background: t.mapBg }}>
                {mounted ? (
                  <Suspense fallback={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.muted }}>{tr('dashboard.loadingMap')}</Box>}>
                    <RestaurantMap restaurants={sorted} accent={t.accent} onSelect={openDetail} />
                  </Suspense>
                ) : null}
              </Box>
              <Box sx={{ width: { xs: '100%', md: 330 }, flex: 'none', height: 540, overflowY: 'auto', border: `1px solid ${t.border}`, borderRadius: '16px', background: t.cardBg }}>
                {sorted.map((r) => (
                  <Box key={r.id} role="button" tabIndex={0} aria-label={r.name} onClick={() => openDetail(r)} onKeyDown={activateOnKey(() => openDetail(r))}
                    sx={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${t.borderSoft}`, cursor: 'pointer', '&:hover': { filter: 'brightness(0.98)' } }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '9px', flex: 'none' }}>
                      <RestaurantThumb image={r.image} alt={r.name} initial={r.initial} serifFont={serif} tokens={t} initialFontSize={18} sx={{ width: '100%', height: '100%', borderRadius: '9px' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ fontSize: 14, fontWeight: 500 }}>{r.name}</Box>
                      <Box sx={{ color: t.muted, fontSize: 12 }}>{r.cuisine}</Box>
                    </Box>
                    <Box component="span" sx={{ color: t.cost, fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{r.costStr}</Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : view === 'list' ? (
            <Box sx={{ padding: '24px 0 40px' }}>
              <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                {sorted.map((r) => (
                  <Box key={r.id} onClick={() => openDetail(r)}
                    sx={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '13px 18px', borderBottom: `1px solid ${t.borderSoft}`, background: t.cardBg, cursor: 'pointer', '&:hover': { filter: 'brightness(0.98)' }, '&:last-of-type': { borderBottom: 'none' } }}>
                    <Box sx={{ width: 46, height: 46, borderRadius: '11px', flex: 'none' }}>
                      <RestaurantThumb image={r.image} alt={r.name} initial={r.initial} serifFont={serif} tokens={t} initialFontSize={24} sx={{ width: '100%', height: '100%', borderRadius: '11px' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box component="button" type="button" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openDetail(r); }}
                        sx={{ fontFamily: serif, fontSize: 18, border: 'none', background: 'transparent', p: 0, m: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </Box>
                      <Box sx={{ color: t.muted, fontSize: 13, mt: '1px' }}>{r.meta}</Box>
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, flex: 'none' }}>
                      <BookingPill locations={r.locations ?? []} tokens={t} />
                    </Box>
                    <Box sx={{ width: 90, color: t.cost, fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono',monospace", display: { xs: 'none', sm: 'block' } }}>{r.costStr}</Box>
                    <Box sx={{ width: 110, display: { xs: 'none', sm: 'block' } }}>
                      {r.rated ? <Stars value={r.rating ?? 0} tokens={t} size={14} letterSpacing="1px" /> : null}
                    </Box>
                    <StatusLabel been={r.isBeen} tokens={t} tr={tr} />
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ padding: { xs: '16px 0 40px', sm: '24px 0 40px' } }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(160px, 1fr))', sm: 'repeat(auto-fill, minmax(240px, 1fr))' }, gap: { xs: '12px', sm: '20px' } }}>
                {sorted.map((r) => (
                  <PlaceCard key={r.id} r={r} tokens={t} serifFont={serif} onView={openDetail} />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <RestaurantDetailDialog
          open={detailOpen}
          restaurant={selected}
          canEdit={false}
          tokens={t}
          serifFont={serif}
          onClose={() => setDetailOpen(false)}
          onEdit={() => undefined}
          onDelete={() => undefined}
        />
      </Box>
    </ThemeProvider>
  );
}

/** Non-interactive been/want label (the public view never toggles status). */
function StatusLabel({ been, tokens: t, tr }: { been: boolean; tokens: (typeof listTokens)['light']; tr: (k: string) => string }) {
  return (
    <Box component="span" sx={{ background: been ? t.beenBg : t.wantBg, color: been ? t.beenFg : t.wantFg, fontSize: '11.5px', fontWeight: 600, padding: '5px 11px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
      {been ? tr('dashboard.statusBeen') : tr('dashboard.statusWant')}
    </Box>
  );
}

