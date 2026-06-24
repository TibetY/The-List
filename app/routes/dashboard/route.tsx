import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { LoaderFunction, ActionFunction, LinksFunction, redirect, json } from '@remix-run/node';
import leafletStylesHref from 'leaflet/dist/leaflet.css?url';
import {
  useLoaderData,
  useRevalidator,
  useSearchParams,
  useNavigate,
} from '@remix-run/react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  ThemeProvider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import {
  Add,
  Email,
  Logout,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAddAlt1,
  Person,
} from '@mui/icons-material';
import { createSupabaseServerClient } from '~/supabase.server';
import { getRestaurants } from '~/services/restaurants.server';
import {
  getLists,
  getListMembers,
  getInviteLink,
  ensureDefaultList,
} from '~/services/lists.server';
import { getProfile } from '~/services/profiles.server';
import type {
  Restaurant,
  RestaurantList,
  ListMember,
  InviteLink,
  Profile,
} from '~/types/restaurant';
import RestaurantFormDialog from '~/components/RestaurantFormDialog';
import DeleteConfirmDialog from '~/components/DeleteConfirmDialog';
import EmailDialog from '~/components/EmailDialog';
import ListSwitcher from '~/components/ListSwitcher';
import ShareListDialog from '~/components/ShareListDialog';
import { uploadRestaurantImage } from '~/services/storage.client';
import {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  setRestaurantStatus,
} from '~/services/restaurants.client';
import { createList } from '~/services/lists.client';
import { geocodeAddress } from '~/services/geocode.client';
import type { RestaurantMapProps } from '~/components/RestaurantMap';

// Leaflet touches `window` at import time, so it must never load on the server.
// `import.meta.env.SSR` is inlined as a constant per build, so the real import
// is dead code in the SSR bundle (Rollup tree-shakes it out entirely) and only
// the browser bundle ever pulls in Leaflet.
const RestaurantMap = lazy<React.ComponentType<RestaurantMapProps>>(() =>
  import.meta.env.SSR
    ? Promise.resolve({ default: () => null })
    : import('~/components/RestaurantMap')
);

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: leafletStylesHref },
];
import { sendRestaurantListViaMailto } from '~/services/email.client';
import { listTokens, makeListTheme, getStoredMode, storeMode, type ListMode } from '~/listTheme';

/**
 * Turn whatever was thrown into a human-readable message. Supabase/PostgREST
 * errors are plain objects (not Error instances), so `error.message` alone is
 * lost behind a generic fallback — pull message/details/hint/code off them so
 * the banner shows the real cause (missing table, RLS recursion, bad key, …).
 */
function describeError(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [o.message, o.details, o.hint].filter(Boolean);
    if (parts.length) {
      return parts.join(' — ') + (o.code ? ` (${o.code})` : '');
    }
  }
  if (e instanceof Error) return e.message;
  return 'Could not load your lists. Please try again.';
}

type LoaderData = {
  userId: string;
  lists: RestaurantList[];
  activeList: RestaurantList | null;
  restaurants: Restaurant[];
  members: ListMember[];
  inviteLink: InviteLink | null;
  profile: Profile | null;
  error: string | null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const requestedListId = new URL(request.url).searchParams.get('list');

  try {
    let lists = await getLists(supabase, user.id);
    // Recover accounts that predate the new-user bootstrap trigger: give them a
    // default list once, then reload.
    if (lists.length === 0) {
      await ensureDefaultList(supabase);
      lists = await getLists(supabase, user.id);
    }
    const activeList =
      lists.find((l) => l.id === requestedListId) ||
      lists.find((l) => l.isDefault) ||
      lists[0] ||
      null;

    let restaurants: Restaurant[] = [];
    let members: ListMember[] = [];
    let inviteLink: InviteLink | null = null;
    if (activeList) {
      restaurants = await getRestaurants(supabase, activeList.id);
      members = await getListMembers(supabase, activeList.id);
      if (activeList.role === 'owner') {
        inviteLink = await getInviteLink(supabase, activeList.id);
      }
    }
    const profile = await getProfile(supabase, user.id);

    return json<LoaderData>(
      {
        userId: user.id,
        lists,
        activeList,
        restaurants,
        members,
        inviteLink,
        profile,
        error: null,
      },
      { headers }
    );
  } catch (error) {
    console.error('Error loading dashboard:', error);
    return json<LoaderData>(
      {
        userId: user.id,
        lists: [],
        activeList: null,
        restaurants: [],
        members: [],
        inviteLink: null,
        profile: null,
        error: describeError(error),
      },
      { headers }
    );
  }
};

export const action: ActionFunction = async ({ request }) => {
  const { supabase, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();
  if (formData.get('intent') === 'logout') {
    await supabase.auth.signOut();
    return redirect('/login', { headers });
  }
  return json({ success: true });
};

/** Display-decorated restaurant used by the dashboard views. */
type DecoratedRestaurant = Restaurant & {
  initial: string;
  costStr: string;
  rated: boolean;
  ratingStr: string;
  meta: string;
  cuisine: string;
  isBeen: boolean;
  isWant: boolean;
  px: number;
  py: number;
};

type ViewMode = 'tile' | 'list' | 'map';
type FilterMode = 'all' | 'been' | 'want';

const STAR_FULL = '★★★★★';
const STAR_EMPTY = '☆☆☆☆☆';

/** Stable pseudo-random map coordinates derived from the restaurant id/name. */
function mapPosition(seed: string): { px: number; py: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const a = Math.abs(h);
  return { px: 8 + (a % 84), py: 12 + (Math.floor(a / 84) % 72) };
}

function decorate(r: Restaurant): DecoratedRestaurant {
  const rating = Math.round(r.rating ?? 0);
  const rated = rating > 0;
  const cuisine = r.cuisineType || 'Restaurant';
  const status = r.status ?? 'want';
  return {
    ...r,
    initial: (r.name.replace(/^The /i, '')[0] || '?').toUpperCase(),
    costStr: r.priceRange || '',
    rated,
    ratingStr: rated
      ? STAR_FULL.slice(0, rating) + STAR_EMPTY.slice(0, 5 - rating)
      : '',
    cuisine,
    meta: cuisine,
    isBeen: status === 'been',
    isWant: status === 'want',
    ...mapPosition(r.id || r.name),
  };
}

export default function Dashboard() {
  const data = useLoaderData<LoaderData>();
  const {
    userId,
    lists,
    activeList,
    restaurants: initialRestaurants,
    members,
    inviteLink,
    profile,
    error,
  } = data;
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [mode, setMode] = useState<ListMode>('light');
  // The Leaflet map is client-only; render it after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Load the saved theme after mount (avoids SSR/client hydration mismatch).
  useEffect(() => setMode(getStoredMode()), []);
  const changeMode = (m: ListMode) => {
    setMode(m);
    storeMode(m);
  };
  const [view, setView] = useState<ViewMode>('tile');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);

  const t = listTokens[mode];
  const muiTheme = useMemo(() => makeListTheme(mode), [mode]);

  const role = activeList?.role ?? 'viewer';
  const canEdit = role === 'owner' || role === 'editor';
  const canManage = role === 'owner';

  const decorated = useMemo(() => restaurants.map(decorate), [restaurants]);

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

  const total = decorated.length;
  const beenCount = decorated.filter((r) => r.isBeen).length;
  const wantCount = decorated.filter((r) => r.isWant).length;
  // How many of the currently-shown places can't be plotted (no coordinates).
  const mapMissingCount = filtered.filter(
    (r) => typeof r.lat !== 'number' || typeof r.lng !== 'number'
  ).length;

  const shownMembers = members.slice(0, 3);
  const extraMembers = members.length - shownMembers.length;

  // --- handlers ------------------------------------------------------------
  const handleAddRestaurant = () => {
    if (!canEdit) return;
    setSelectedRestaurant(null);
    setFormOpen(true);
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    if (!canEdit) return;
    setSelectedRestaurant(restaurant);
    setFormOpen(true);
  };

  const handleSaveRestaurant = async (
    restaurantData: Partial<Restaurant>,
    imageFile?: File
  ) => {
    if (!activeList) return;
    try {
      let imageUrl = restaurantData.image;
      if (imageFile) {
        imageUrl = await uploadRestaurantImage(imageFile, userId);
      }
      const dataToSave: Partial<Restaurant> = { ...restaurantData, image: imageUrl };

      // Geocode the address for the map, but only when it actually changed
      // (keeps us within Nominatim's rate limits and avoids needless lookups).
      const newAddress = (restaurantData.address ?? '').trim();
      const addressChanged = newAddress !== (selectedRestaurant?.address ?? '').trim();
      if (newAddress && addressChanged) {
        const point = await geocodeAddress(newAddress);
        dataToSave.lat = point?.lat;
        dataToSave.lng = point?.lng;
      } else if (!newAddress) {
        dataToSave.lat = undefined;
        dataToSave.lng = undefined;
      } else {
        // Address unchanged — preserve the previously geocoded coordinates.
        dataToSave.lat = selectedRestaurant?.lat;
        dataToSave.lng = selectedRestaurant?.lng;
      }

      if (selectedRestaurant?.id) {
        await updateRestaurant(selectedRestaurant.id, dataToSave, activeList.id, userId);
        setSnackbar({ open: true, message: 'Restaurant updated successfully!', severity: 'success' });
      } else {
        await createRestaurant(dataToSave, activeList.id, userId);
        setSnackbar({ open: true, message: 'Restaurant added successfully!', severity: 'success' });
      }
      revalidator.revalidate();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving restaurant:', error);
      setSnackbar({ open: true, message: 'Failed to save restaurant. Please try again.', severity: 'error' });
      throw error;
    }
  };

  const handleToggleStatus = async (r: DecoratedRestaurant) => {
    if (!canEdit || !r.id) return;
    try {
      await setRestaurantStatus(r.id, r.isBeen ? 'want' : 'been');
      revalidator.revalidate();
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({ open: true, message: 'Failed to update status.', severity: 'error' });
    }
  };

  const handleDeleteClick = (id: string) => {
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) {
      setRestaurantToDelete({ id, name: restaurant.name });
      setDeleteOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!restaurantToDelete) return;
    try {
      await deleteRestaurant(restaurantToDelete.id);
      setSnackbar({ open: true, message: 'Restaurant deleted successfully!', severity: 'success' });
      revalidator.revalidate();
      setDeleteOpen(false);
      setRestaurantToDelete(null);
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      setSnackbar({ open: true, message: 'Failed to delete restaurant. Please try again.', severity: 'error' });
    }
  };

  const handleSendEmail = async (email: string) => {
    sendRestaurantListViaMailto(restaurants, email);
    setSnackbar({ open: true, message: 'Opening email client...', severity: 'success' });
  };

  const handleSelectList = (listId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('list', listId);
    setSearchParams(params);
  };

  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    try {
      const id = await createList(name, userId);
      setNewListOpen(false);
      setNewListName('');
      const params = new URLSearchParams(searchParams);
      params.set('list', id);
      setSearchParams(params);
      setSnackbar({ open: true, message: 'List created!', severity: 'success' });
    } catch (error) {
      console.error('Error creating list:', error);
      setSnackbar({ open: true, message: 'Failed to create list.', severity: 'error' });
    }
  };

  const handleLogout = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'intent';
    input.value = 'logout';
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  };

  // --- style helpers --------------------------------------------------------
  const seg = (val: ViewMode) => ({
    background: view === val ? t.segBg : 'transparent',
    color: view === val ? t.segFg : t.segIdle,
  });
  const pill = (val: FilterMode) => ({
    background: filter === val ? t.pBg : 'transparent',
    color: filter === val ? t.pFg : t.pIdle,
  });
  const themeBtn = (m: ListMode) => ({
    background: mode === m ? t.accent : 'transparent',
    color: mode === m ? t.accentText : t.faint,
  });

  const segBtnStyle = {
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
    fontSize: '13.5px',
    fontWeight: 500,
    padding: '7px 18px',
    borderRadius: '999px',
  } as const;

  const filterBtnStyle = {
    border: `1px solid ${t.pillBorder}`,
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    padding: '7px 15px',
    borderRadius: '999px',
  } as const;

  const dropChipStyle = {
    border: `1px solid ${t.pillBorder}`,
    fontSize: '13px',
    color: t.chip,
    padding: '7px 14px',
    borderRadius: '999px',
  } as const;

  const serif = "'Instrument Serif',serif";

  const renderAvatar = (m: ListMember, idx: number) => {
    const name = m.profile?.displayName?.trim();
    const initial = (name?.[0] ?? '?').toUpperCase();
    const bg = idx === 0 ? t.accent : idx === 1 ? t.avatar2 : t.avatar3;
    const fg = idx === 0 ? t.accentText : idx === 1 ? '#fff' : t.muted;
    return (
      <Box
        key={m.id}
        title={name || 'Member'}
        role="img"
        aria-label={name || 'Member'}
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: m.profile?.avatarUrl ? `center/cover url(${m.profile.avatarUrl})` : bg,
          color: fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          border: `2px solid ${t.panelBg}`,
          ml: idx === 0 ? 0 : '-9px',
        }}
      >
        {!m.profile?.avatarUrl && initial}
      </Box>
    );
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: t.pageBg,
          color: t.ink,
          fontFamily: "'DM Sans',sans-serif",
          transition: 'background .25s',
          '& *::-webkit-scrollbar': { width: 10, height: 10 },
          '& *::-webkit-scrollbar-thumb': {
            background: 'rgba(120,110,95,.3)',
            borderRadius: 8,
          },
        }}
      >
        {/* Visually-hidden page heading for screen-reader / landmark navigation
            (the visible list title is a button, not a heading). */}
        <Box
          component="h1"
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            p: 0,
            m: '-1px',
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {(activeList?.name ?? 'My List') + ' — The List'}
        </Box>

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
            <Box component="span" sx={{ fontFamily: serif, fontSize: 26, letterSpacing: '.01em' }}>
              The List
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* search */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: '8px',
                background: t.searchBg,
                border: `1px solid ${t.border}`,
                borderRadius: '999px',
                padding: '8px 14px',
                width: 180,
                color: t.faint,
                fontSize: '13.5px',
              }}
            >
              <Box aria-hidden sx={{ width: 13, height: 13, border: `1.6px solid ${t.faint}`, borderRadius: '50%', flex: 'none' }} />
              <Box
                component="input"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search places…"
                aria-label="Search places"
                sx={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: t.ink,
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '13.5px',
                  width: '100%',
                  '::placeholder': { color: t.faint },
                }}
              />
            </Box>

            {/* theme toggle */}
            <Box sx={{ display: 'flex', background: t.searchBg, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '3px' }}>
              <Box component="button" onClick={() => changeMode('light')} title="Light" aria-label="Light theme"
                sx={{ border: 'none', cursor: 'pointer', width: 30, height: 26, borderRadius: '999px', fontSize: 13, ...themeBtn('light') }}>☀</Box>
              <Box component="button" onClick={() => changeMode('dark')} title="Dark" aria-label="Dark theme"
                sx={{ border: 'none', cursor: 'pointer', width: 30, height: 26, borderRadius: '999px', fontSize: 13, ...themeBtn('dark') }}>☾</Box>
            </Box>

            {/* add */}
            {canEdit && (
              <Tooltip title="Add a place">
                <Box
                  component="button"
                  onClick={handleAddRestaurant}
                  aria-label="Add restaurant"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: t.accent,
                    color: t.accentText,
                    fontFamily: "'DM Sans',sans-serif",
                    fontWeight: 600,
                    fontSize: '13.5px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                  }}
                >
                  <Add sx={{ fontSize: 17 }} /> Add
                </Box>
              </Tooltip>
            )}

            {/* share */}
            <Tooltip title="Share & members">
              <IconButton onClick={() => setShareOpen(true)} aria-label="Share and members" sx={{ color: t.muted }}>
                <PersonAddAlt1 />
              </IconButton>
            </Tooltip>

            {/* avatar stack → account menu */}
            <Box
              component="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => setMenuAnchor(e.currentTarget)}
              aria-label="Account menu"
              aria-haspopup="true"
              sx={{ display: 'flex', border: 'none', background: 'transparent', cursor: 'pointer', p: 0 }}
            >
              {shownMembers.length > 0
                ? shownMembers.map((m, i) => renderAvatar(m, i))
                : (
                  <Box sx={{ width: 30, height: 30, borderRadius: '50%', background: t.accent, color: t.accentText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                    {(profile?.displayName?.[0] ?? '?').toUpperCase()}
                  </Box>
                )}
              {extraMembers > 0 && (
                <Box sx={{ width: 30, height: 30, borderRadius: '50%', background: t.avatar3, color: t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, border: `2px solid ${t.panelBg}`, ml: '-9px' }}>
                  +{extraMembers}
                </Box>
              )}
            </Box>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { setMenuAnchor(null); navigate('/profile'); }}>
                <ListItemIcon><Person fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); setShareOpen(true); }}>
                <ListItemIcon><PersonAddAlt1 fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>Share &amp; members</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); setEmailOpen(true); }} disabled={restaurants.length === 0}>
                <ListItemIcon><Email fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>Email list</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); handleLogout(); }}>
                <ListItemIcon><Logout fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>Sign out</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* body container */}
        <Box sx={{ flexGrow: 1, width: '100%', maxWidth: 1320, mx: 'auto', padding: { xs: '24px 18px 0', md: '30px 40px 0' } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} role="alert">
              Couldn&apos;t load your lists: {error}. If this persists, confirm the
              database schema has been applied and the Supabase key is correct.
            </Alert>
          )}
          {/* title + view toggle */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <ListSwitcher
                lists={lists}
                activeList={activeList}
                serifFont={serif}
                onSelect={handleSelectList}
                onCreate={() => setNewListOpen(true)}
              />
              <Box component="p" sx={{ color: t.muted, fontSize: 15, mt: '8px', mb: 0 }}>
                {total} places · {beenCount} been · {wantCount} want to try
                {activeList && role !== 'owner' && ` · ${role}`}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', background: t.searchBg, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '4px' }}>
              <Box component="button" onClick={() => setView('tile')} sx={{ ...segBtnStyle, ...seg('tile') }}>Tile</Box>
              <Box component="button" onClick={() => setView('list')} sx={{ ...segBtnStyle, ...seg('list') }}>List</Box>
              <Box component="button" onClick={() => setView('map')} sx={{ ...segBtnStyle, ...seg('map') }}>Map</Box>
            </Box>
          </Box>

          {/* filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mt: '22px', flexWrap: 'wrap' }}>
            <Box component="button" onClick={() => setFilter('all')} sx={{ ...filterBtnStyle, ...pill('all') }}>All</Box>
            <Box component="button" onClick={() => setFilter('been')} sx={{ ...filterBtnStyle, ...pill('been') }}>Been</Box>
            <Box component="button" onClick={() => setFilter('want')} sx={{ ...filterBtnStyle, ...pill('want') }}>Want to try</Box>
            <Box sx={{ width: '1px', height: 22, background: t.divider, mx: '4px' }} />
            <Box sx={dropChipStyle}>Cuisine ▾</Box>
            <Box sx={dropChipStyle}>Cost ▾</Box>
            <Box sx={dropChipStyle}>Rating ▾</Box>
            <Box sx={{ ml: 'auto', fontSize: 13, color: t.faint }}>{filtered.length} showing</Box>
          </Box>

          {/* empty state */}
          {filtered.length === 0 ? (
            <Box
              sx={{
                mt: '24px',
                mb: '40px',
                textAlign: 'center',
                py: { xs: 6, md: 10 },
                px: 3,
                borderRadius: '16px',
                border: `1px solid ${t.border}`,
                background: t.cardBg,
              }}
            >
              <Box sx={{ fontFamily: serif, fontSize: 30, mb: 1 }}>
                {searchQuery || filter !== 'all' ? 'No matches' : 'This list is empty'}
              </Box>
              <Box sx={{ color: t.muted, fontSize: 15, mb: 3, maxWidth: 420, mx: 'auto' }}>
                {searchQuery || filter !== 'all'
                  ? 'Try a different search or filter.'
                  : canEdit
                  ? 'Add your first restaurant to start building the list.'
                  : 'Nothing here yet.'}
              </Box>
              {!searchQuery && filter === 'all' && canEdit && (
                <Box
                  component="button"
                  onClick={handleAddRestaurant}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: t.accent,
                    color: t.accentText,
                    fontFamily: "'DM Sans',sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    padding: '10px 20px',
                    borderRadius: '999px',
                  }}
                >
                  <Add sx={{ fontSize: 18 }} /> Add your first restaurant
                </Box>
              )}
            </Box>
          ) : (
            <>
              {/* TILE */}
              {view === 'tile' && (
                <Box sx={{ padding: '24px 0 40px' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                    {filtered.map((r) => (
                      <Box
                        key={r.id}
                        onClick={() => handleEditRestaurant(r)}
                        sx={{
                          border: `1px solid ${t.border}`,
                          borderRadius: '16px',
                          overflow: 'hidden',
                          background: t.cardBg,
                          cursor: canEdit ? 'pointer' : 'default',
                          transition: 'transform .15s, box-shadow .15s',
                          '&:hover': canEdit
                            ? { transform: 'translateY(-3px)', boxShadow: '0 12px 28px rgba(0,0,0,.12)' }
                            : {},
                          '&:hover .card-actions, &:focus-within .card-actions': { opacity: 1 },
                        }}
                      >
                        <Box sx={{ position: 'relative', height: 158, background: t.monoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {r.image ? (
                            <Box component="img" src={r.image} alt={r.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Box component="span" sx={{ fontFamily: serif, fontSize: 68, color: t.monoInitial, lineHeight: 1 }}>{r.initial}</Box>
                          )}
                          <Box
                            component={canEdit ? 'button' : 'span'}
                            type={canEdit ? 'button' : undefined}
                            onClick={canEdit ? (e: React.MouseEvent) => { e.stopPropagation(); handleToggleStatus(r); } : undefined}
                            title={canEdit ? 'Toggle been / want' : undefined}
                            aria-label={canEdit ? `${r.name}: mark as ${r.isBeen ? 'want to try' : 'been'}` : undefined}
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              background: r.isBeen ? t.beenBg : t.wantBg,
                              color: r.isBeen ? t.beenFg : t.wantFg,
                              fontSize: '11.5px',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              border: 'none',
                              padding: '5px 11px',
                              borderRadius: '999px',
                              cursor: canEdit ? 'pointer' : 'default',
                            }}
                          >
                            {r.isBeen ? '✓ Been' : 'Want to try'}
                          </Box>
                          {canEdit && (
                            <Box className="card-actions" sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: '6px', opacity: 0, transition: 'opacity .15s' }}>
                              <CardAction label={`Edit ${r.name}`} onClick={() => handleEditRestaurant(r)} tokens={t}>
                                <EditIcon sx={{ fontSize: 15 }} />
                              </CardAction>
                              <CardAction label={`Delete ${r.name}`} onClick={() => r.id && handleDeleteClick(r.id)} tokens={t} danger>
                                <DeleteIcon sx={{ fontSize: 15 }} />
                              </CardAction>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ padding: '14px 16px 16px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                            <Box component="span" sx={{ fontFamily: serif, fontSize: 20 }}>{r.name}</Box>
                            <Box component="span" sx={{ color: t.cost, fontSize: 14, fontWeight: 600, letterSpacing: '.03em' }}>{r.costStr}</Box>
                          </Box>
                          <Box sx={{ color: t.muted, fontSize: 13, mt: '4px' }}>{r.meta}</Box>
                          <Box sx={{ mt: '11px', height: 18 }}>
                            {r.rated ? (
                              <Box component="span" sx={{ color: t.rating, fontSize: 15, letterSpacing: '2px' }}>{r.ratingStr}</Box>
                            ) : (
                              <Box component="span" sx={{ color: t.notRated, fontSize: 13, fontStyle: 'italic' }}>Not rated yet</Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* LIST */}
              {view === 'list' && (
                <Box sx={{ padding: '24px 0 40px' }}>
                  <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                    {filtered.map((r) => (
                      <Box
                        key={r.id}
                        onClick={() => handleEditRestaurant(r)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '13px 18px',
                          borderBottom: `1px solid ${t.borderSoft}`,
                          background: t.cardBg,
                          cursor: canEdit ? 'pointer' : 'default',
                          '&:hover': canEdit ? { filter: 'brightness(0.98)' } : {},
                          '&:hover .row-actions, &:focus-within .row-actions': { opacity: 1 },
                          '&:last-of-type': { borderBottom: 'none' },
                        }}
                      >
                        <Box sx={{ width: 46, height: 46, borderRadius: '11px', background: t.monoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden' }}>
                          {r.image ? (
                            <Box component="img" src={r.image} alt={r.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Box component="span" sx={{ fontFamily: serif, fontSize: 24, color: t.monoInitial }}>{r.initial}</Box>
                          )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ fontFamily: serif, fontSize: 18 }}>{r.name}</Box>
                          <Box sx={{ color: t.muted, fontSize: 13, mt: '1px' }}>{r.meta}</Box>
                        </Box>
                        <Box sx={{ width: 90, color: t.cost, fontSize: 14, fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>{r.costStr}</Box>
                        <Box sx={{ width: 110, color: t.rating, fontSize: 14, letterSpacing: '1px', display: { xs: 'none', sm: 'block' } }}>{r.ratingStr}</Box>
                        <Box
                          component={canEdit ? 'button' : 'span'}
                          type={canEdit ? 'button' : undefined}
                          onClick={canEdit ? (e: React.MouseEvent) => { e.stopPropagation(); handleToggleStatus(r); } : undefined}
                          aria-label={canEdit ? `${r.name}: mark as ${r.isBeen ? 'want to try' : 'been'}` : undefined}
                          sx={{
                            width: 96,
                            textAlign: 'center',
                            background: r.isBeen ? t.beenBg : t.wantBg,
                            color: r.isBeen ? t.beenFg : t.wantFg,
                            fontSize: '11.5px',
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            border: 'none',
                            padding: '5px 0',
                            borderRadius: '999px',
                            flex: 'none',
                            cursor: canEdit ? 'pointer' : 'default',
                          }}
                        >
                          {r.isBeen ? '✓ Been' : 'Want to try'}
                        </Box>
                        {canEdit && (
                          <Box className="row-actions" sx={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity .15s' }}>
                            <CardAction label={`Edit ${r.name}`} onClick={() => handleEditRestaurant(r)} tokens={t} solid>
                              <EditIcon sx={{ fontSize: 15 }} />
                            </CardAction>
                            <CardAction label={`Delete ${r.name}`} onClick={() => r.id && handleDeleteClick(r.id)} tokens={t} solid danger>
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </CardAction>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* MAP */}
              {view === 'map' && (
                <Box sx={{ padding: '24px 0 40px', display: 'flex', gap: '18px', flexDirection: { xs: 'column', md: 'row' } }}>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Box
                      sx={{
                        flex: 1,
                        position: 'relative',
                        height: 540,
                        borderRadius: '16px',
                        border: `1px solid ${t.border}`,
                        overflow: 'hidden',
                        background: t.mapBg,
                      }}
                    >
                      {mounted ? (
                        <Suspense
                          fallback={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.muted }}>
                              Loading map…
                            </Box>
                          }
                        >
                          <RestaurantMap
                            restaurants={filtered}
                            accent={t.accent}
                            canEdit={canEdit}
                            onSelect={handleEditRestaurant}
                          />
                        </Suspense>
                      ) : null}
                    </Box>
                    {mapMissingCount > 0 && (
                      <Box sx={{ color: t.faint, fontSize: 12.5 }}>
                        {mapMissingCount} {mapMissingCount === 1 ? 'place has' : 'places have'} no address yet — add one to show {mapMissingCount === 1 ? 'it' : 'them'} on the map.
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ width: { xs: '100%', md: 330 }, flex: 'none', height: 540, overflowY: 'auto', border: `1px solid ${t.border}`, borderRadius: '16px', background: t.cardBg }}>
                    {filtered.map((r) => (
                      <Box
                        key={r.id}
                        onClick={() => handleEditRestaurant(r)}
                        sx={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${t.borderSoft}`, cursor: canEdit ? 'pointer' : 'default', '&:hover': canEdit ? { filter: 'brightness(0.98)' } : {} }}
                      >
                        <Box sx={{ width: 34, height: 34, borderRadius: '9px', background: t.monoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden' }}>
                          {r.image ? (
                            <Box component="img" src={r.image} alt={r.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Box component="span" sx={{ fontFamily: serif, fontSize: 18, color: t.monoInitial }}>{r.initial}</Box>
                          )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ fontSize: 14, fontWeight: 500 }}>{r.name}</Box>
                          <Box sx={{ color: t.muted, fontSize: 12 }}>{r.cuisine}</Box>
                        </Box>
                        <Box component="span" sx={{ color: t.cost, fontSize: 13, fontWeight: 600 }}>{r.costStr}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* footer */}
        <Box
          component="footer"
          sx={{
            borderTop: `1px solid ${t.border}`,
            background: t.footerBg,
            padding: { xs: '20px 18px', md: '24px 40px' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '9px', color: t.muted, fontSize: 13 }}>
            <Box aria-hidden sx={{ width: 16, height: 16, background: t.accent, borderRadius: '50% 50% 50% 2px', transform: 'rotate(45deg)' }} />
            <Box component="span" sx={{ fontFamily: serif, fontSize: 16, color: t.ink }}>The List</Box>
            <Box component="span" sx={{ ml: '6px' }}>a shared table for a few good friends</Box>
          </Box>
          <Box sx={{ color: t.faint, fontSize: '12.5px' }}>Ottawa &amp; beyond · {total} spots and counting</Box>
        </Box>

        {/* mobile FAB */}
        {canEdit && (
          <Box
            component="button"
            onClick={handleAddRestaurant}
            aria-label="Add restaurant"
            sx={{
              display: { xs: 'flex', sm: 'none' },
              alignItems: 'center',
              justifyContent: 'center',
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 56,
              height: 56,
              border: 'none',
              cursor: 'pointer',
              borderRadius: '50%',
              background: t.accent,
              color: t.accentText,
              boxShadow: '0 8px 24px rgba(0,0,0,.3)',
              zIndex: 1000,
            }}
          >
            <Add sx={{ fontSize: 26 }} />
          </Box>
        )}

        {/* dialogs */}
        <RestaurantFormDialog
          open={formOpen}
          restaurant={selectedRestaurant}
          onClose={() => setFormOpen(false)}
          onSave={handleSaveRestaurant}
        />
        <DeleteConfirmDialog
          open={deleteOpen}
          restaurantName={restaurantToDelete?.name || ''}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
        />
        <EmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} onSend={handleSendEmail} />
        <ShareListDialog
          open={shareOpen}
          list={activeList}
          members={members}
          inviteLink={inviteLink}
          currentUserId={userId}
          canManage={canManage}
          onClose={() => setShareOpen(false)}
          onChanged={() => revalidator.revalidate()}
        />

        {/* new list dialog */}
        <Dialog open={newListOpen} onClose={() => setNewListOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>New list</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="List name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(); }}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNewListOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button onClick={handleCreateList} variant="contained" disabled={!newListName.trim()}>Create</Button>
          </DialogActions>
        </Dialog>

        {/* snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

/** Small circular hover action button used on cards and list rows. */
function CardAction({
  children,
  label,
  onClick,
  tokens,
  danger,
  solid,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tokens: (typeof listTokens)['light'];
  danger?: boolean;
  solid?: boolean;
}) {
  return (
    <IconButton
      size="small"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{
        width: 28,
        height: 28,
        background: solid ? tokens.searchBg : 'rgba(255,255,255,0.9)',
        border: `1px solid ${tokens.border}`,
        color: danger ? '#C0492B' : tokens.chip,
        '&:hover': {
          background: solid ? tokens.pillBorder : '#fff',
          color: danger ? '#C0492B' : tokens.accent,
        },
      }}
    >
      {children}
    </IconButton>
  );
}
