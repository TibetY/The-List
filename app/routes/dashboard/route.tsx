import { useState, useEffect, useMemo } from 'react';
import { LoaderFunction, ActionFunction, redirect, json } from '@remix-run/node';
import { useLoaderData, useRevalidator } from '@remix-run/react';
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
} from '@mui/material';
import {
  Add,
  Email,
  Logout,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { createSupabaseServerClient } from '~/supabase.server';
import { getRestaurants } from '~/services/restaurants.server';
import type { Restaurant } from '~/types/restaurant';
import RestaurantFormDialog from '~/components/RestaurantFormDialog';
import DeleteConfirmDialog from '~/components/DeleteConfirmDialog';
import EmailDialog from '~/components/EmailDialog';
import { uploadRestaurantImage } from '~/services/storage.client';
import {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from '~/services/restaurants.client';
import { sendRestaurantListViaMailto } from '~/services/email.client';
import { listTokens, makeListTheme, type ListMode } from '~/listTheme';

type LoaderData = {
  restaurants: Restaurant[];
  userId: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  try {
    const restaurants = await getRestaurants(supabase);
    return json<LoaderData>({ restaurants, userId: user.id }, { headers });
  } catch (error) {
    console.error('Error loading restaurants:', error);
    return json<LoaderData>({ restaurants: [], userId: user.id }, { headers });
  }
};

export const action: ActionFunction = async ({ request }) => {
  const { supabase, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'logout') {
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
  return {
    px: 8 + (a % 84),
    py: 12 + ((Math.floor(a / 84)) % 72),
  };
}

function decorate(r: Restaurant): DecoratedRestaurant {
  const rating = Math.round(r.rating ?? 0);
  const rated = rating > 0;
  const cuisine = r.cuisineType || 'Restaurant';
  const seed = r.id || r.name;
  return {
    ...r,
    initial: (r.name.replace(/^The /i, '')[0] || '?').toUpperCase(),
    costStr: r.priceRange || '',
    rated,
    ratingStr: rated ? STAR_FULL.slice(0, rating) + STAR_EMPTY.slice(0, 5 - rating) : '',
    cuisine,
    meta: cuisine,
    isBeen: rated,
    isWant: !rated,
    ...mapPosition(seed),
  };
}

export default function Dashboard() {
  const { restaurants: initialRestaurants, userId } = useLoaderData<LoaderData>();
  const revalidator = useRevalidator();

  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [mode, setMode] = useState<ListMode>('light');
  const [view, setView] = useState<ViewMode>('tile');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
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
  const userInitial = (userId?.[0] || 'M').toUpperCase();

  // --- handlers (data layer preserved) -------------------------------------
  const handleAddRestaurant = () => {
    setSelectedRestaurant(null);
    setFormOpen(true);
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormOpen(true);
  };

  const handleSaveRestaurant = async (
    restaurantData: Partial<Restaurant>,
    imageFile?: File
  ) => {
    try {
      let imageUrl = restaurantData.image;
      if (imageFile) {
        imageUrl = await uploadRestaurantImage(imageFile, userId);
      }
      const dataToSave = { ...restaurantData, image: imageUrl };

      if (selectedRestaurant?.id) {
        await updateRestaurant(selectedRestaurant.id, dataToSave, userId);
        setSnackbar({ open: true, message: 'Restaurant updated successfully!', severity: 'success' });
      } else {
        await createRestaurant(dataToSave, userId);
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

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        sx={{
          minHeight: '100vh',
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
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  background: t.panelBg,
                  borderRadius: '50%',
                  transform: 'rotate(-45deg)',
                }}
              />
            </Box>
            <Box component="span" sx={{ fontFamily: serif, fontSize: 26, letterSpacing: '.01em' }}>
              The List
            </Box>
          </Box>

          <Box
            component="nav"
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: '30px',
              fontSize: '14.5px',
              color: t.muted,
            }}
          >
            <Box component="span" sx={{ color: t.ink, fontWeight: 500 }}>Restaurants</Box>
            <Box component="span">Cities</Box>
            <Box component="span">Map</Box>
            <Box component="span">Wishlist</Box>
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
              <Box
                aria-hidden
                sx={{
                  width: 13,
                  height: 13,
                  border: `1.6px solid ${t.faint}`,
                  borderRadius: '50%',
                  flex: 'none',
                }}
              />
              <Box
                component="input"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
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
              <Box
                component="button"
                onClick={() => setMode('light')}
                title="Light"
                aria-label="Light theme"
                sx={{ border: 'none', cursor: 'pointer', width: 30, height: 26, borderRadius: '999px', fontSize: 13, ...themeBtn('light') }}
              >
                ☀
              </Box>
              <Box
                component="button"
                onClick={() => setMode('dark')}
                title="Dark"
                aria-label="Dark theme"
                sx={{ border: 'none', cursor: 'pointer', width: 30, height: 26, borderRadius: '999px', fontSize: 13, ...themeBtn('dark') }}
              >
                ☾
              </Box>
            </Box>

            {/* add */}
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

            {/* avatar stack (opens account menu) */}
            <Box
              component="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => setMenuAnchor(e.currentTarget)}
              aria-label="Account menu"
              aria-haspopup="true"
              sx={{ display: 'flex', border: 'none', background: 'transparent', cursor: 'pointer', p: 0 }}
            >
              <Box sx={{ width: 30, height: 30, borderRadius: '50%', background: t.accent, color: t.accentText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, border: `2px solid ${t.panelBg}` }}>
                {userInitial}
              </Box>
              <Box sx={{ width: 30, height: 30, borderRadius: '50%', background: t.avatar2, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, border: `2px solid ${t.panelBg}`, ml: '-9px' }}>
                J
              </Box>
              <Box sx={{ width: 30, height: 30, borderRadius: '50%', background: t.avatar3, color: t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, border: `2px solid ${t.panelBg}`, ml: '-9px' }}>
                +2
              </Box>
            </Box>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setEmailOpen(true);
                }}
                disabled={restaurants.length === 0}
              >
                <ListItemIcon><Email fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>Email list</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  handleLogout();
                }}
              >
                <ListItemIcon><Logout fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>Sign out</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* body container */}
        <Box sx={{ maxWidth: 1320, mx: 'auto', padding: { xs: '24px 18px 0', md: '30px 40px 0' } }}>
          {/* title + view toggle */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Box component="h1" sx={{ fontFamily: serif, fontSize: { xs: 34, md: 44 }, fontWeight: 400, lineHeight: 1.05, m: 0 }}>
                Restaurants &amp; Bars
              </Box>
              <Box component="p" sx={{ color: t.muted, fontSize: 15, mt: '8px', mb: 0 }}>
                {total} places · {beenCount} been · {wantCount} want to try
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
                {searchQuery || filter !== 'all' ? 'No matches' : 'Your list is empty'}
              </Box>
              <Box sx={{ color: t.muted, fontSize: 15, mb: 3, maxWidth: 420, mx: 'auto' }}>
                {searchQuery || filter !== 'all'
                  ? 'Try a different search or filter.'
                  : 'Add your first restaurant to start building the list.'}
              </Box>
              {!searchQuery && filter === 'all' && (
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
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '20px',
                    }}
                  >
                    {filtered.map((r) => (
                      <Box
                        key={r.id}
                        onClick={() => handleEditRestaurant(r)}
                        sx={{
                          border: `1px solid ${t.border}`,
                          borderRadius: '16px',
                          overflow: 'hidden',
                          background: t.cardBg,
                          cursor: 'pointer',
                          transition: 'transform .15s, box-shadow .15s',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 12px 28px rgba(0,0,0,.12)',
                          },
                          '&:hover .card-actions': { opacity: 1 },
                        }}
                      >
                        <Box sx={{ position: 'relative', height: 158, background: t.monoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {r.image ? (
                            <Box component="img" src={r.image} alt={r.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Box component="span" sx={{ fontFamily: serif, fontSize: 68, color: t.monoInitial, lineHeight: 1 }}>
                              {r.initial}
                            </Box>
                          )}
                          {r.isBeen ? (
                            <Box component="span" sx={{ position: 'absolute', top: 12, right: 12, background: t.beenBg, color: t.beenFg, fontSize: '11.5px', fontWeight: 600, padding: '5px 11px', borderRadius: '999px' }}>
                              ✓ Been
                            </Box>
                          ) : (
                            <Box component="span" sx={{ position: 'absolute', top: 12, right: 12, background: t.wantBg, color: t.wantFg, fontSize: '11.5px', fontWeight: 600, padding: '5px 11px', borderRadius: '999px' }}>
                              Want to try
                            </Box>
                          )}
                          {/* hover actions */}
                          <Box
                            className="card-actions"
                            sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: '6px', opacity: 0, transition: 'opacity .15s' }}
                          >
                            <CardAction label={`Edit ${r.name}`} onClick={() => handleEditRestaurant(r)} tokens={t}>
                              <EditIcon sx={{ fontSize: 15 }} />
                            </CardAction>
                            <CardAction
                              label={`Delete ${r.name}`}
                              onClick={() => r.id && handleDeleteClick(r.id)}
                              tokens={t}
                              danger
                            >
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </CardAction>
                          </Box>
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
                          cursor: 'pointer',
                          '&:hover': { filter: 'brightness(0.98)' },
                          '&:hover .row-actions': { opacity: 1 },
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
                        {r.isBeen ? (
                          <Box component="span" sx={{ width: 96, textAlign: 'center', background: t.beenBg, color: t.beenFg, fontSize: '11.5px', fontWeight: 600, padding: '5px 0', borderRadius: '999px', flex: 'none' }}>✓ Been</Box>
                        ) : (
                          <Box component="span" sx={{ width: 96, textAlign: 'center', background: t.wantBg, color: t.wantFg, fontSize: '11.5px', fontWeight: 600, padding: '5px 0', borderRadius: '999px', flex: 'none' }}>Want to try</Box>
                        )}
                        <Box className="row-actions" sx={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity .15s' }}>
                          <CardAction label={`Edit ${r.name}`} onClick={() => handleEditRestaurant(r)} tokens={t} solid>
                            <EditIcon sx={{ fontSize: 15 }} />
                          </CardAction>
                          <CardAction label={`Delete ${r.name}`} onClick={() => r.id && handleDeleteClick(r.id)} tokens={t} solid danger>
                            <DeleteIcon sx={{ fontSize: 15 }} />
                          </CardAction>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* MAP */}
              {view === 'map' && (
                <Box sx={{ padding: '24px 0 40px', display: 'flex', gap: '18px', flexDirection: { xs: 'column', md: 'row' } }}>
                  <Box
                    sx={{
                      flex: 1,
                      position: 'relative',
                      height: 540,
                      borderRadius: '16px',
                      border: `1px solid ${t.border}`,
                      overflow: 'hidden',
                      background: t.mapBg,
                      backgroundImage: `linear-gradient(${t.mapGrid} 1px,transparent 1px),linear-gradient(90deg,${t.mapGrid} 1px,transparent 1px)`,
                      backgroundSize: '48px 48px',
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: '38%', left: '-5%', width: '70%', height: 60, background: t.mapWater, transform: 'rotate(-8deg)' }} />
                    <Box sx={{ position: 'absolute', top: '12%', left: '40%', width: 14, height: '90%', background: t.mapPark }} />
                    {filtered.map((r) => (
                      <Box
                        key={r.id}
                        onClick={() => handleEditRestaurant(r)}
                        sx={{ position: 'absolute', left: `${r.px}%`, top: `${r.py}%`, transform: 'translate(-50%,-100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <Box sx={{ background: t.pinLabelBg, border: `1px solid ${t.pinLabelBorder}`, color: t.pinLabelFg, boxShadow: '0 2px 8px rgba(0,0,0,.18)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: '7px', whiteSpace: 'nowrap', mb: '3px' }}>
                          {r.name}
                        </Box>
                        <Box sx={{ width: 18, height: 18, background: t.accent, borderRadius: '50% 50% 50% 2px', transform: 'rotate(45deg)', border: `2px solid ${t.pinBorder}`, boxShadow: '0 2px 4px rgba(0,0,0,.25)' }} />
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ width: { xs: '100%', md: 330 }, flex: 'none', height: 540, overflowY: 'auto', border: `1px solid ${t.border}`, borderRadius: '16px', background: t.cardBg }}>
                    {filtered.map((r) => (
                      <Box
                        key={r.id}
                        onClick={() => handleEditRestaurant(r)}
                        sx={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${t.borderSoft}`, cursor: 'pointer', '&:hover': { filter: 'brightness(0.98)' } }}
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
        <EmailDialog
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          onSend={handleSendEmail}
        />

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
  tokens: typeof listTokens['light'];
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
