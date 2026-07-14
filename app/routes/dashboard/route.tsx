import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { LoaderFunction, ActionFunction, LinksFunction, redirect, json } from '@remix-run/node';
import leafletStylesHref from 'leaflet/dist/leaflet.css?url';
import {
  useLoaderData,
  useRevalidator,
  useSearchParams,
  useNavigate,
  type ShouldRevalidateFunction,
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
  Logout,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAddAlt1,
  Person,
  Favorite,
  FavoriteBorder,
  Close,
  Search,
  Insights,
} from '@mui/icons-material';
import { createSupabaseServerClient } from '~/supabase.server';
import { getRestaurants } from '~/services/restaurants.server';
import {
  getLists,
  getListMembers,
  getInviteLink,
  getShareLink,
  ensureDefaultList,
} from '~/services/lists.server';
import { getProfile } from '~/services/profiles.server';
import { getListViews } from '~/services/views.server';
import type {
  Restaurant,
  RestaurantList,
  ListMember,
  InviteLink,
  ShareLink,
  Profile,
  ListView,
} from '~/types/restaurant';
import { decorate, type DecoratedRestaurant } from '~/utils/decorateRestaurant';
import {
  FILTER_PARAM_KEYS,
  serializeFilterParams,
  applyViewParams,
} from '~/utils/filterParams';
import RestaurantFormDialog from '~/components/RestaurantFormDialog';
import RestaurantDetailDialog from '~/components/RestaurantDetailDialog';
import RestaurantThumb from '~/components/RestaurantThumb';
import DeleteConfirmDialog from '~/components/DeleteConfirmDialog';
import ListSwitcher from '~/components/ListSwitcher';
import ShareListDialog from '~/components/ShareListDialog';
import Onboarding from '~/components/Onboarding';
import FilterSheet from '~/components/FilterSheet';
import SavedViewsBar from '~/components/SavedViewsBar';
import Stars from '~/components/Stars';
import PlaceCard, { BookingPill, CardAction } from '~/components/PlaceCard';
import LanguageSwitcher from '~/components/LanguageSwitcher';
import { uploadRestaurantImage } from '~/services/storage.client';
import {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  setRestaurantStatus,
  setRestaurantFavorite,
  setRestaurantVisitCount,
} from '~/services/restaurants.client';
import { createList, updateList, deleteList } from '~/services/lists.client';
import { createListView, renameListView, deleteListView } from '~/services/views.client';
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
import { useTranslation } from 'react-i18next';
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
  shareLink: ShareLink | null;
  profile: Profile | null;
  views: ListView[];
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
    let shareLink: ShareLink | null = null;
    let views: ListView[] = [];
    if (activeList) {
      restaurants = await getRestaurants(supabase, activeList.id);
      members = await getListMembers(supabase, activeList.id);
      views = await getListViews(supabase, activeList.id, user.id);
      if (activeList.role === 'owner') {
        inviteLink = await getInviteLink(supabase, activeList.id);
        shareLink = await getShareLink(supabase, activeList.id);
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
        shareLink,
        profile,
        views,
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
        shareLink: null,
        profile: null,
        views: [],
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

/**
 * The filter/sort/search params live in the URL, but the loader never reads them
 * (filtering is client-side) — so a navigation that only changes those keys must
 * NOT re-run the loader. Without this, every search keystroke triggered a loader
 * round-trip and the controlled input reverted to the stale URL value, eating
 * characters. Manual revalidation (same URL) and real changes (list/join/forked,
 * form posts) still revalidate normally.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}) => {
  if (formMethod && formMethod !== 'GET') return defaultShouldRevalidate;
  if (currentUrl.pathname !== nextUrl.pathname) return defaultShouldRevalidate;
  // Same href = a manual revalidator.revalidate() after a mutation — let it run.
  if (currentUrl.href === nextUrl.href) return defaultShouldRevalidate;
  const withoutFilters = (url: URL) => {
    const p = new URLSearchParams(url.search);
    FILTER_PARAM_KEYS.forEach((k) => p.delete(k));
    p.sort();
    return p.toString();
  };
  if (withoutFilters(currentUrl) === withoutFilters(nextUrl)) return false;
  return defaultShouldRevalidate;
};

type ViewMode = 'tile' | 'list' | 'map';
type FilterMode = 'all' | 'been' | 'want';
type SortMode = 'recent' | 'rating' | 'name' | 'price' | 'visits' | 'favorite';
const SORT_MODES: SortMode[] = ['recent', 'rating', 'name', 'price', 'visits', 'favorite'];

/** Parse a comma-joined multi-select param into a clean string[] ('' → []). */
function parseCsv(raw: string | null): string[] {
  return raw ? raw.split(',').filter(Boolean) : [];
}

/** Set a searchParam to a value, or remove it entirely when the value is empty. */
function setOrDelete(params: URLSearchParams, key: string, value: string): void {
  if (value) params.set(key, value);
  else params.delete(key);
}

/** Make a non-button clickable element keyboard-operable (Enter/Space). */
function activateOnKey(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
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
    shareLink,
    profile,
    views,
    error,
  } = data;
  const revalidator = useRevalidator();
  const { t: tr } = useTranslation();
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
  // Map ↔ side-list hover sync (map view). The id is a restaurant's sync key
  // (`id ?? name`, matching RestaurantMap); refs let a pin-hover scroll its row
  // into view.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const mapRowRefs = useRef<Map<string, HTMLElement>>(new Map());
  useEffect(() => {
    if (!hoveredId) return;
    mapRowRefs.current.get(hoveredId)?.scrollIntoView({ block: 'nearest' });
  }, [hoveredId]);

  // Filters & sort live in the URL (searchParams) so any view is linkable and
  // the browser's back/forward steps through filter states — this is also the
  // foundation for saved views. Only non-default values are written, so a clean
  // list keeps a clean URL. The theme (`mode`), the active `view`, and the
  // `list`/`join`/`forked` params are managed separately and left untouched here.
  const filter: FilterMode = ((): FilterMode => {
    const s = searchParams.get('status');
    return s === 'been' || s === 'want' ? s : 'all';
  })();
  // Search text is LOCAL state so typing is instant (a controlled input bound
  // straight to the URL reverts to the stale param while the navigation is
  // pending, eating keystrokes). It syncs both ways with the `q` param below:
  // local → URL debounced, URL → local when q changes externally (saved view,
  // clear filters, back/forward).
  const urlQ = searchParams.get('q') ?? '';
  const [searchQuery, setSearchQuery] = useState(urlQ);
  const lastPushedQ = useRef(urlQ);
  useEffect(() => {
    // q changed in the URL and it wasn't our own debounced write — adopt it.
    if (urlQ !== lastPushedQ.current) {
      lastPushedQ.current = urlQ;
      setSearchQuery(urlQ);
    }
  }, [urlQ]);
  const cuisineFilter = searchParams.get('cuisine') ?? '';
  const costFilter = searchParams.get('cost') ?? '';
  const ratingFilter = Math.min(5, Math.max(0, Math.floor(Number(searchParams.get('rating')) || 0)));
  // Multi-select facets are comma-joined; memoize on the raw string so the array
  // reference is stable across renders (keeps `filtered`/`sorted` from churning).
  const placeParam = searchParams.get('place');
  const dietParam = searchParams.get('diet');
  const menuParam = searchParams.get('menu');
  const placeFilter = useMemo(() => parseCsv(placeParam), [placeParam]);
  const dietFilter = useMemo(() => parseCsv(dietParam), [dietParam]);
  const menuFilter = useMemo(() => parseCsv(menuParam), [menuParam]);
  const sort: SortMode = ((): SortMode => {
    const s = searchParams.get('sort');
    return SORT_MODES.includes(s as SortMode) ? (s as SortMode) : 'recent';
  })();
  // Flip whatever the chosen sort's natural order is (e.g. Name Z→A, oldest
  // first, lowest rated first). Kept separate from `sort` so the dropdown still
  // names the primary key.
  const sortReversed = searchParams.get('rev') === '1';

  // Mutate one or more filter params while preserving everything else (list,
  // join, forked, …). Discrete changes push a history entry (so back/forward
  // works); the free-text search replaces so typing doesn't flood history.
  const updateFilterParams = (
    mutate: (p: URLSearchParams) => void,
    opts?: { replace?: boolean }
  ) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        mutate(next);
        return next;
      },
      { replace: opts?.replace ?? false }
    );
  };
  const setFilter = (v: FilterMode) =>
    updateFilterParams((p) => setOrDelete(p, 'status', v === 'all' ? '' : v));
  const setCuisineFilter = (v: string) =>
    updateFilterParams((p) => setOrDelete(p, 'cuisine', v));
  const setCostFilter = (v: string) =>
    updateFilterParams((p) => setOrDelete(p, 'cost', v));
  const setRatingFilter = (v: number) =>
    updateFilterParams((p) => setOrDelete(p, 'rating', v ? String(v) : ''));
  const setSort = (v: SortMode) =>
    updateFilterParams((p) => setOrDelete(p, 'sort', v === 'recent' ? '' : v));
  // Array setters accept a value or a functional updater (mirroring useState),
  // reading prev from the params being mutated so rapid toggles never go stale.
  const makeCsvSetter =
    (key: string) => (next: string[] | ((prev: string[]) => string[])) =>
      updateFilterParams((p) => {
        const prev = parseCsv(p.get(key));
        const value = typeof next === 'function' ? next(prev) : next;
        setOrDelete(p, key, value.join(','));
      });
  const setPlaceFilter = makeCsvSetter('place');
  const setDietFilter = makeCsvSetter('diet');
  const setMenuFilter = makeCsvSetter('menu');
  const setSortReversed = (next: boolean | ((prev: boolean) => boolean)) =>
    updateFilterParams((p) => {
      const prev = p.get('rev') === '1';
      const value = typeof next === 'function' ? next(prev) : next;
      setOrDelete(p, 'rev', value ? '1' : '');
    });

  // Local search → `q` param, debounced. `replace` keeps typing out of history;
  // filtering itself reads the local state, so results update instantly.
  useEffect(() => {
    if (searchQuery === urlQ) return;
    const timer = setTimeout(() => {
      lastPushedQ.current = searchQuery;
      updateFilterParams((p) => setOrDelete(p, 'q', searchQuery), { replace: true });
    }, 250);
    return () => clearTimeout(timer);
    // Re-arming on urlQ/updateFilterParams changes would reset the debounce on
    // every unrelated render; the adopt-effect above handles external q changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);


  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [renameListTarget, setRenameListTarget] = useState<RestaurantList | null>(null);
  const [renameListName, setRenameListName] = useState('');
  // Saved-view name dialog (create a new view or rename an existing one).
  const [viewDialog, setViewDialog] = useState<{ mode: 'create' | 'rename'; id?: string; name: string } | null>(null);
  const [deleteListTarget, setDeleteListTarget] = useState<RestaurantList | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning';
    // Optional inline action (Undo / Retry) shown on the right of the snackbar.
    action?: { label: string; onClick: () => void };
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);

  // Surface the result of redeeming an invite link (?join=ok|invalid) or saving
  // a copy of a shared list (?forked=1), then strip the param so a refresh
  // doesn't show the toast again.
  useEffect(() => {
    const join = searchParams.get('join');
    const forked = searchParams.get('forked');
    if (!join && !forked) return;
    if (join === 'ok') {
      setSnackbar({ open: true, message: tr('dashboard.joinedList'), severity: 'success' });
    } else if (join === 'invalid') {
      setSnackbar({ open: true, message: tr('dashboard.joinInvalid'), severity: 'error' });
    } else if (forked) {
      setSnackbar({ open: true, message: tr('dashboard.snackForked'), severity: 'success' });
    }
    const params = new URLSearchParams(searchParams);
    params.delete('join');
    params.delete('forked');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const t = listTokens[mode];
  const muiTheme = useMemo(() => makeListTheme(mode), [mode]);

  const role = activeList?.role ?? 'viewer';
  const canEdit = role === 'owner' || role === 'editor';
  const canManage = role === 'owner';

  const decorated = useMemo(() => restaurants.map(decorate), [restaurants]);

  // Distinct cuisine / cost values present in this list, for the filter menus.
  const cuisineOptions = useMemo(
    () =>
      Array.from(
        new Set(restaurants.map((r) => r.cuisineType).filter(Boolean) as string[])
      ).sort(),
    [restaurants]
  );
  const costOptions = useMemo(
    () =>
      Array.from(
        new Set(restaurants.map((r) => r.priceRange).filter(Boolean) as string[])
      ).sort((a, b) => a.length - b.length),
    [restaurants]
  );
  // Distinct multi-select facet values actually present in this list.
  const placeOptions = useMemo(
    () => Array.from(new Set(restaurants.flatMap((r) => r.placeTypes ?? []))).sort(),
    [restaurants]
  );
  const dietOptions = useMemo(
    () => Array.from(new Set(restaurants.flatMap((r) => r.dietaryTags ?? []))).sort(),
    [restaurants]
  );
  const menuOptions = useMemo(
    () => Array.from(new Set(restaurants.flatMap((r) => r.menuTypes ?? []))).sort(),
    [restaurants]
  );

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
      const matchesCuisine = !cuisineFilter || r.cuisineType === cuisineFilter;
      const matchesCost = !costFilter || r.priceRange === costFilter;
      const matchesRating = ratingFilter === 0 || (r.rating ?? 0) >= ratingFilter;
      // AND within a facet: a place must carry every selected tag.
      const matchesPlace = placeFilter.every((v) => (r.placeTypes ?? []).includes(v));
      const matchesDiet = dietFilter.every((v) => (r.dietaryTags ?? []).includes(v));
      const matchesMenu = menuFilter.every((v) => (r.menuTypes ?? []).includes(v));
      return (
        matchesStatus &&
        matchesSearch &&
        matchesCuisine &&
        matchesCost &&
        matchesRating &&
        matchesPlace &&
        matchesDiet &&
        matchesMenu
      );
    });
  }, [decorated, filter, searchQuery, cuisineFilter, costFilter, ratingFilter, placeFilter, dietFilter, menuFilter]);

  // Apply the chosen sort to the filtered set (order-independent metrics like
  // counts still read from `filtered`).
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortReversed ? -1 : 1;
    switch (sort) {
      case 'rating':
        arr.sort((a, b) => dir * ((b.rating ?? 0) - (a.rating ?? 0)));
        break;
      case 'name':
        arr.sort((a, b) => dir * a.name.localeCompare(b.name));
        break;
      case 'price':
        arr.sort((a, b) => dir * ((a.priceRange?.length ?? 0) - (b.priceRange?.length ?? 0)));
        break;
      case 'visits':
        arr.sort((a, b) => dir * ((b.visitCount ?? 0) - (a.visitCount ?? 0)));
        break;
      case 'favorite':
        arr.sort(
          (a, b) =>
            dir *
            (Number(b.favorite ?? false) - Number(a.favorite ?? false) ||
              a.name.localeCompare(b.name))
        );
        break;
      case 'recent':
      default:
        arr.sort((a, b) => dir * (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        break;
    }
    return arr;
  }, [filtered, sort, sortReversed]);

  const hasActiveFilters =
    filter !== 'all' ||
    !!searchQuery ||
    !!cuisineFilter ||
    !!costFilter ||
    ratingFilter > 0 ||
    placeFilter.length > 0 ||
    dietFilter.length > 0 ||
    menuFilter.length > 0 ||
    sort !== 'recent' ||
    sortReversed;

  // Drop every filter/sort param in a single history entry (leaves list/… intact).
  // Also reset the local search text directly — the URL adopt-effect can't see a
  // value that was typed but not yet debounced into the URL.
  const clearFilters = () => {
    setSearchQuery('');
    lastPushedQ.current = '';
    updateFilterParams((p) => FILTER_PARAM_KEYS.forEach((k) => p.delete(k)));
  };

  // Canonical querystring of the current filters, for the saved-view highlight.
  const currentViewParams = useMemo(
    () => serializeFilterParams(searchParams),
    [searchParams]
  );

  const total = decorated.length;
  const beenCount = decorated.filter((r) => r.isBeen).length;
  const wantCount = decorated.filter((r) => r.isWant).length;
  // How many locations (across the currently-shown places) have an address but
  // can't be plotted yet (no coordinates).
  const mapMissingCount = filtered.reduce(
    (sum, r) =>
      sum +
      (r.locations ?? []).filter(
        (l) =>
          (l.address ?? '').trim() !== '' &&
          (typeof l.lat !== 'number' || typeof l.lng !== 'number')
      ).length,
    0
  );

  const shownMembers = members.slice(0, 3);
  const extraMembers = members.length - shownMembers.length;

  // --- handlers ------------------------------------------------------------
  const handleAddRestaurant = () => {
    if (!canEdit) return;
    setSelectedRestaurant(null);
    setFormOpen(true);
  };

  // Clicking a card/row opens the read-only detail view first (everyone can view).
  const handleViewRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setDetailOpen(true);
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    if (!canEdit) return;
    setDetailOpen(false);
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

      // Geocode each location for the map. Re-geocode when an address changed or
      // when it has an address but no coordinates yet (the latter back-fills rows
      // saved before geocoding succeeded, e.g. older international entries). We go
      // location-by-location to stay within Nominatim's ~1/sec rate limit.
      const prevLocations = selectedRestaurant?.locations ?? [];
      const locations = dataToSave.locations ?? [];
      let geocodeFailed = false;
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        const address = (loc.address ?? '').trim();
        if (!address) {
          locations[i] = { ...loc, lat: undefined, lng: undefined };
          continue;
        }
        const prev = prevLocations[i];
        const prevAddress = (prev?.address ?? '').trim();
        // Only a change to a PREVIOUSLY SAVED address invalidates coordinates.
        // A new location that already carries coords (seeded from a search /
        // nearby candidate) keeps its precise POI point instead of being
        // re-geocoded to a coarser — or failed — result.
        const addressChanged = prevAddress !== '' && prevAddress !== address;
        const hasCoords = loc.lat != null && loc.lng != null;
        if (hasCoords && !addressChanged) continue; // keep existing coordinates
        const point = await geocodeAddress(address);
        // On failure keep whatever coords we already had rather than wiping the
        // pin — a slightly stale pin beats none.
        locations[i] = { ...loc, lat: point?.lat ?? loc.lat, lng: point?.lng ?? loc.lng };
        if (!point && !hasCoords) geocodeFailed = true;
      }
      dataToSave.locations = locations;

      if (selectedRestaurant?.id) {
        await updateRestaurant(selectedRestaurant.id, dataToSave, activeList.id, userId);
      } else {
        await createRestaurant(dataToSave, activeList.id, userId);
      }
      // Saved fine — but if the address couldn't be located, tell the user the
      // map pin won't appear (rather than failing silently and looking buggy).
      if (geocodeFailed) {
        setSnackbar({ open: true, message: tr('dashboard.snackGeocodeFailed'), severity: 'warning' });
      } else {
        setSnackbar({
          open: true,
          message: selectedRestaurant?.id ? tr('dashboard.snackUpdated') : tr('dashboard.snackAdded'),
          severity: 'success',
        });
      }
      revalidator.revalidate();
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving restaurant:', error);
      setSnackbar({ open: true, message: tr('dashboard.snackSaveFailed'), severity: 'error' });
      throw error;
    }
  };

  const handleToggleStatus = async (r: DecoratedRestaurant) => {
    if (!canEdit || !r.id) return;
    const newStatus = r.isBeen ? 'want' : 'been';
    try {
      await setRestaurantStatus(r.id, newStatus);
      // Marking "been" with no recorded visits implies a first visit.
      if (newStatus === 'been' && (r.visitCount ?? 0) === 0) {
        await setRestaurantVisitCount(r.id, 1);
      }
      revalidator.revalidate();
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({ open: true, message: tr('dashboard.snackStatusFailed'), severity: 'error' });
    }
  };

  const handleToggleFavorite = async (r: Restaurant) => {
    if (!canEdit || !r.id) return;
    const next = !r.favorite;
    try {
      await setRestaurantFavorite(r.id, next);
      // Reflect immediately in an open detail dialog (loader revalidate lags).
      setSelectedRestaurant((cur) => (cur && cur.id === r.id ? { ...cur, favorite: next } : cur));
      revalidator.revalidate();
    } catch (error) {
      console.error('Error updating favourite:', error);
      setSnackbar({ open: true, message: tr('dashboard.snackStatusFailed'), severity: 'error' });
    }
  };

  const handleAddVisit = async (r: Restaurant) => {
    if (!canEdit || !r.id) return;
    const next = (r.visitCount ?? 0) + 1;
    const becomesBeen = r.status !== 'been';
    try {
      await setRestaurantVisitCount(r.id, next);
      // A recorded visit means the place has been visited.
      if (becomesBeen) {
        await setRestaurantStatus(r.id, 'been');
      }
      setSelectedRestaurant((cur) =>
        cur && cur.id === r.id ? { ...cur, visitCount: next, status: 'been' } : cur
      );
      revalidator.revalidate();
    } catch (error) {
      console.error('Error updating visit count:', error);
      setSnackbar({ open: true, message: tr('dashboard.snackStatusFailed'), severity: 'error' });
    }
  };

  const handleDeleteClick = (id: string) => {
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) {
      setRestaurantToDelete({ id, name: restaurant.name });
      setDeleteOpen(true);
    }
  };

  // Re-create a just-deleted place from a kept snapshot (Undo). Re-creating
  // assigns a new id/timestamp, which is fine for a restore.
  const handleRestoreRestaurant = async (snapshot: Restaurant) => {
    if (!activeList) return;
    const { id, listId, createdAt, updatedAt, addedBy, ...payload } = snapshot;
    void id; void listId; void createdAt; void updatedAt; void addedBy;
    try {
      await createRestaurant(payload, activeList.id, userId);
      revalidator.revalidate();
      setSnackbar({ open: true, message: tr('dashboard.snackRestored'), severity: 'success' });
    } catch (error) {
      console.error('Error restoring restaurant:', error);
      setSnackbar({ open: true, message: tr('dashboard.snackSaveFailed'), severity: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!restaurantToDelete) return;
    // Snapshot the full row before deleting so Undo can restore it.
    const snapshot = restaurants.find((r) => r.id === restaurantToDelete.id);
    try {
      await deleteRestaurant(restaurantToDelete.id);
      setSnackbar({
        open: true,
        message: tr('dashboard.snackDeleted'),
        severity: 'success',
        action: snapshot
          ? { label: tr('dashboard.undo'), onClick: () => handleRestoreRestaurant(snapshot) }
          : undefined,
      });
      revalidator.revalidate();
      setDeleteOpen(false);
      setRestaurantToDelete(null);
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      setSnackbar({
        open: true,
        message: tr('dashboard.snackDeleteFailed'),
        severity: 'error',
        action: { label: tr('dashboard.retry'), onClick: () => handleConfirmDelete() },
      });
    }
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
      setSnackbar({ open: true, message: tr('dashboard.snackListCreated'), severity: 'success' });
    } catch (error) {
      console.error('Error creating list:', error);
      setSnackbar({ open: true, message: tr('dashboard.snackListFailed'), severity: 'error' });
    }
  };

  const handleRenameList = (list: RestaurantList) => {
    setRenameListTarget(list);
    setRenameListName(list.name);
  };

  const handleConfirmRename = async () => {
    const name = renameListName.trim();
    if (!renameListTarget || !name) return;
    try {
      await updateList(renameListTarget.id, { name });
      setRenameListTarget(null);
      revalidator.revalidate();
      setSnackbar({ open: true, message: tr('dashboard.snackListRenamed'), severity: 'success' });
    } catch (error) {
      console.error('Error renaming list:', error);
      setSnackbar({ open: true, message: tr('dashboard.snackListUpdateFailed'), severity: 'error' });
    }
  };

  const handleConfirmDeleteList = async () => {
    if (!deleteListTarget) return;
    try {
      await deleteList(deleteListTarget.id);
      setDeleteListTarget(null);
      // Move off the deleted list (drop the ?list param so the loader picks the default).
      const params = new URLSearchParams(searchParams);
      params.delete('list');
      setSearchParams(params);
      revalidator.revalidate();
      setSnackbar({ open: true, message: tr('dashboard.snackListDeleted'), severity: 'success' });
    } catch (error) {
      console.error('Error deleting list:', error);
      setSnackbar({ open: true, message: tr('dashboard.snackListUpdateFailed'), severity: 'error' });
    }
  };

  const handleLeaveList = () => {
    setShareOpen(false);
    // Drop the ?list param so the loader falls back to the user's default list,
    // then refresh now that they're no longer a member of the one they left.
    const params = new URLSearchParams(searchParams);
    params.delete('list');
    setSearchParams(params);
    revalidator.revalidate();
    setSnackbar({ open: true, message: tr('share.snackLeft'), severity: 'success' });
  };

  // --- saved views ---------------------------------------------------------
  const handleApplyView = (view: ListView) => {
    const next = applyViewParams(searchParams, view.params);
    // Adopt the view's q locally too — otherwise text typed within the debounce
    // window survives the switch and the armed timer re-pushes it onto the view.
    const q = next.get('q') ?? '';
    setSearchQuery(q);
    lastPushedQ.current = q;
    setSearchParams(next);
  };

  const handleConfirmView = async () => {
    const name = viewDialog?.name.trim();
    if (!viewDialog || !name || !activeList) return;
    try {
      if (viewDialog.mode === 'create') {
        await createListView(activeList.id, userId, name, serializeFilterParams(searchParams));
      } else if (viewDialog.id) {
        await renameListView(viewDialog.id, name);
      }
      setViewDialog(null);
      revalidator.revalidate();
      setSnackbar({ open: true, message: tr('views.saved'), severity: 'success' });
    } catch (error) {
      console.error('Error saving view:', error);
      setSnackbar({ open: true, message: tr('views.saveFailed'), severity: 'error' });
    }
  };

  const handleDeleteView = async (view: ListView) => {
    try {
      await deleteListView(view.id);
      revalidator.revalidate();
      setSnackbar({ open: true, message: tr('views.deleted'), severity: 'success' });
    } catch (error) {
      console.error('Error deleting view:', error);
      setSnackbar({ open: true, message: tr('views.saveFailed'), severity: 'error' });
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

  const serif = "'Instrument Serif',serif";

  const renderAvatar = (m: ListMember, idx: number) => {
    const name = m.profile?.displayName?.trim();
    const initial = (name?.[0] ?? '?').toUpperCase();
    const bg = idx === 0 ? t.accent : idx === 1 ? t.avatar2 : t.avatar3;
    const fg = idx === 0 ? t.accentText : idx === 1 ? '#fff' : t.muted;
    return (
      <Box
        key={m.id}
        title={name || tr('share.member')}
        role="img"
        aria-label={name || tr('share.member')}
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
        data-theme={mode}
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
          {(activeList?.name ?? 'My List') + ' — ' + tr('brand')}
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
              {tr('brand')}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* search — a single <label> so clicking anywhere in the pill
                (icon included) focuses the input, not two separate hit areas. */}
            <Box
              component="label"
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
                cursor: 'text',
              }}
            >
              <Box aria-hidden sx={{ width: 13, height: 13, border: `1.6px solid ${t.faint}`, borderRadius: '50%', flex: 'none' }} />
              <Box
                component="input"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder={tr('dashboard.searchPlaceholder')}
                aria-label={tr('dashboard.searchLabel')}
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
              {searchQuery && (
                <Box
                  component="button"
                  type="button"
                  aria-label={tr('dashboard.searchClear')}
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onClick={() => setSearchQuery('')}
                  sx={{ display: 'flex', border: 'none', background: 'transparent', cursor: 'pointer', color: t.faint, p: 0, flex: 'none' }}
                >
                  <Close sx={{ fontSize: 15 }} />
                </Box>
              )}
            </Box>

            {/* language toggle */}
            <LanguageSwitcher />

            {/* theme toggle */}
            <Box sx={{ display: 'flex', background: t.searchBg, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '3px' }}>
              <Box component="button" onClick={() => changeMode('light')} title={tr('dashboard.themeLight')} aria-label={tr('dashboard.themeLight')}
                sx={{ border: 'none', cursor: 'pointer', width: 30, height: 26, borderRadius: '999px', fontSize: 13, ...themeBtn('light') }}>☀</Box>
              <Box component="button" onClick={() => changeMode('dark')} title={tr('dashboard.themeDark')} aria-label={tr('dashboard.themeDark')}
                sx={{ border: 'none', cursor: 'pointer', width: 30, height: 26, borderRadius: '999px', fontSize: 13, ...themeBtn('dark') }}>☾</Box>
            </Box>

            {/* add */}
            {canEdit && (
              <Tooltip title={tr('dashboard.addPlace')}>
                <Box
                  component="button"
                  onClick={handleAddRestaurant}
                  aria-label={tr('dashboard.addRestaurant')}
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
                  <Add sx={{ fontSize: 17 }} /> {tr('dashboard.add')}
                </Box>
              </Tooltip>
            )}

            {/* share */}
            <Tooltip title={tr('dashboard.shareMembers')}>
              <IconButton onClick={() => setShareOpen(true)} aria-label={tr('dashboard.shareMembersLabel')} sx={{ color: t.muted }}>
                <PersonAddAlt1 />
              </IconButton>
            </Tooltip>

            {/* avatar stack → account menu */}
            <Box
              component="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => setMenuAnchor(e.currentTarget)}
              aria-label={tr('dashboard.accountMenu')}
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
                <ListItemText>{tr('nav.profile')}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); navigate(activeList ? `/stats?list=${activeList.id}` : '/stats'); }}>
                <ListItemIcon><Insights fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>{tr('stats.menuItem')}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); setShareOpen(true); }}>
                <ListItemIcon><PersonAddAlt1 fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>{tr('dashboard.shareMembers')}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); handleLogout(); }}>
                <ListItemIcon><Logout fontSize="small" sx={{ color: t.muted }} /></ListItemIcon>
                <ListItemText>{tr('dashboard.signOut')}</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* body container */}
        <Box sx={{ flexGrow: 1, width: '100%', maxWidth: 1320, mx: 'auto', padding: { xs: '24px 18px 0', md: '30px 40px 0' } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} role="alert">
              {tr('dashboard.loadError', { error })}
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
                onRename={handleRenameList}
                onDelete={(l) => setDeleteListTarget(l)}
              />
              <Box component="p" sx={{ color: t.muted, fontSize: 15, mt: '8px', mb: 0 }}>
                {tr('dashboard.stats', { total, been: beenCount, want: wantCount })}
                {activeList && role !== 'owner' && ` · ${tr(`roles.${role}`)}`}
              </Box>
            </Box>
            <Box role="group" aria-label={tr('dashboard.viewLabel')} sx={{ display: 'flex', background: t.searchBg, border: `1px solid ${t.border}`, borderRadius: '999px', padding: '4px' }}>
              <Box component="button" aria-pressed={view === 'tile'} onClick={() => setView('tile')} sx={{ ...segBtnStyle, ...seg('tile') }}>{tr('dashboard.viewTile')}</Box>
              <Box component="button" aria-pressed={view === 'list'} onClick={() => setView('list')} sx={{ ...segBtnStyle, ...seg('list') }}>{tr('dashboard.viewList')}</Box>
              <Box component="button" aria-pressed={view === 'map'} onClick={() => setView('map')} sx={{ ...segBtnStyle, ...seg('map') }}>{tr('dashboard.viewMap')}</Box>
            </Box>
          </Box>

          {/* mobile search — the header search pill is hidden on xs, so give
              phones a full-width field here instead of no search at all. */}
          <Box
            component="label"
            sx={{
              display: { xs: 'flex', sm: 'none' },
              alignItems: 'center',
              gap: '8px',
              background: t.searchBg,
              border: `1px solid ${t.border}`,
              borderRadius: '999px',
              padding: '10px 14px',
              mt: '18px',
              cursor: 'text',
            }}
          >
            <Search aria-hidden sx={{ fontSize: 16, color: t.faint, flex: 'none' }} />
            <Box
              component="input"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder={tr('dashboard.searchPlaceholder')}
              aria-label={tr('dashboard.searchLabel')}
              sx={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: t.ink,
                fontFamily: "'DM Sans',sans-serif",
                fontSize: '14px',
                width: '100%',
                '::placeholder': { color: t.faint },
              }}
            />
            {searchQuery && (
              <Box
                component="button"
                type="button"
                aria-label={tr('dashboard.searchClear')}
                onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                onClick={() => setSearchQuery('')}
                sx={{ display: 'flex', border: 'none', background: 'transparent', cursor: 'pointer', color: t.faint, p: 0, flex: 'none' }}
              >
                <Close sx={{ fontSize: 16 }} />
              </Box>
            )}
          </Box>

          {/* saved views */}
          <SavedViewsBar
            tokens={t}
            views={views}
            currentParams={currentViewParams}
            hasActiveFilters={hasActiveFilters}
            onApply={handleApplyView}
            onSave={() => setViewDialog({ mode: 'create', name: '' })}
            onRename={(view) => setViewDialog({ mode: 'rename', id: view.id, name: view.name })}
            onDelete={handleDeleteView}
          />

          {/* filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mt: '22px', flexWrap: 'wrap' }}>
            <Box role="group" aria-label={tr('dashboard.filterStatusLabel')} sx={{ display: 'contents' }}>
              <Box component="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} sx={{ ...filterBtnStyle, ...pill('all') }}>{tr('dashboard.filterAll')}</Box>
              <Box component="button" aria-pressed={filter === 'been'} onClick={() => setFilter('been')} sx={{ ...filterBtnStyle, ...pill('been') }}>{tr('dashboard.filterBeen')}</Box>
              <Box component="button" aria-pressed={filter === 'want'} onClick={() => setFilter('want')} sx={{ ...filterBtnStyle, ...pill('want') }}>{tr('dashboard.filterWant')}</Box>
            </Box>
            <Box sx={{ width: '1px', height: 22, background: t.divider, mx: '4px' }} />
            <FilterSheet
              tokens={t}
              cuisineOptions={cuisineOptions}
              costOptions={costOptions}
              placeOptions={placeOptions}
              dietOptions={dietOptions}
              menuOptions={menuOptions}
              sortModes={SORT_MODES}
              cuisineFilter={cuisineFilter}
              setCuisineFilter={setCuisineFilter}
              costFilter={costFilter}
              setCostFilter={setCostFilter}
              ratingFilter={ratingFilter}
              setRatingFilter={setRatingFilter}
              placeFilter={placeFilter}
              setPlaceFilter={setPlaceFilter}
              dietFilter={dietFilter}
              setDietFilter={setDietFilter}
              menuFilter={menuFilter}
              setMenuFilter={setMenuFilter}
              sort={sort}
              setSort={(v) => setSort(v as SortMode)}
              sortReversed={sortReversed}
              setSortReversed={setSortReversed}
              onClear={clearFilters}
            />
            {hasActiveFilters && (
              <Box
                component="button"
                type="button"
                onClick={clearFilters}
                sx={{ ...filterBtnStyle, background: 'transparent', color: t.muted }}
              >
                {tr('dashboard.clearFilters')}
              </Box>
            )}
            <Box sx={{ ml: 'auto', fontSize: 13, color: t.faint }}>{tr('dashboard.showing', { count: filtered.length })}</Box>
          </Box>

          {/* empty state */}
          {filtered.length === 0 ? (
            // A brand-new, editable list gets the first-run onboarding; the plain
            // empty card is kept for filtered-empty and view-only cases.
            total === 0 && !hasActiveFilters && canEdit && activeList ? (
              <Onboarding
                tokens={t}
                serifFont={serif}
                listId={activeList.id}
                userId={userId}
                onCreated={() => revalidator.revalidate()}
                onAddManually={handleAddRestaurant}
              />
            ) : (
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
                {hasActiveFilters ? tr('dashboard.noMatchesTitle') : tr('dashboard.emptyTitle')}
              </Box>
              <Box sx={{ color: t.muted, fontSize: 15, mb: 3, maxWidth: 420, mx: 'auto' }}>
                {hasActiveFilters
                  ? tr('dashboard.emptyTryFilter')
                  : canEdit
                  ? tr('dashboard.emptyAddFirst')
                  : tr('dashboard.emptyNothing')}
              </Box>
              {!hasActiveFilters && canEdit && (
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
                  <Add sx={{ fontSize: 18 }} /> {tr('dashboard.addFirst')}
                </Box>
              )}
            </Box>
            )
          ) : (
            <>
              {/* TILE */}
              {view === 'tile' && (
                <Box sx={{ padding: '24px 0 40px' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                    {sorted.map((r) => (
                      <PlaceCard
                        key={r.id}
                        r={r}
                        tokens={t}
                        serifFont={serif}
                        canEdit={canEdit}
                        onView={handleViewRestaurant}
                        onToggleStatus={handleToggleStatus}
                        onToggleFavorite={handleToggleFavorite}
                        onEdit={handleEditRestaurant}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* LIST */}
              {view === 'list' && (
                <Box sx={{ padding: '24px 0 40px' }}>
                  <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                    {sorted.map((r) => (
                      <Box
                        key={r.id}
                        onClick={() => handleViewRestaurant(r)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '13px 18px',
                          borderBottom: `1px solid ${t.borderSoft}`,
                          background: t.cardBg,
                          cursor: 'pointer',
                          '&:hover': { filter: 'brightness(0.98)' },
                          '&:hover .row-actions, &:focus-within .row-actions': { opacity: 1 },
                          // Touch devices have no hover — keep the row actions visible.
                          '@media (hover: none)': { '& .row-actions': { opacity: 1 } },
                          '&:last-of-type': { borderBottom: 'none' },
                        }}
                      >
                        <Box sx={{ width: 46, height: 46, borderRadius: '11px', flex: 'none' }}>
                          <RestaurantThumb
                            image={r.image}
                            alt={r.name}
                            initial={r.initial}
                            serifFont={serif}
                            tokens={t}
                            initialFontSize={24}
                            sx={{ width: '100%', height: '100%', borderRadius: '11px' }}
                          />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box
                            component="button"
                            type="button"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleViewRestaurant(r); }}
                            sx={{
                              fontFamily: serif,
                              fontSize: 18,
                              border: 'none',
                              background: 'transparent',
                              p: 0,
                              m: 0,
                              color: 'inherit',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >{r.name}</Box>
                          <Box sx={{ color: t.muted, fontSize: 13, mt: '1px' }}>
                            {r.meta}
                            {(r.locations?.length ?? 0) > 1 && (
                              <Box component="span" sx={{ color: t.faint }}>
                                {' · '}
                                {tr('dashboard.locationsCount', { count: r.locations?.length ?? 0 })}
                              </Box>
                            )}
                            {(r.visitCount ?? 0) > 0 && (
                              <Box component="span" sx={{ color: t.faint }}>
                                {' · '}
                                {tr('dashboard.visitsCount', { count: r.visitCount ?? 0 })}
                              </Box>
                            )}
                          </Box>
                          {((r.michelinStars ?? 0) > 0 || r.bibGourmand) && (
                            <Box sx={{ display: 'flex', gap: '6px', mt: '3px', flexWrap: 'wrap' }}>
                              {(r.michelinStars ?? 0) > 0 && (
                                <Box
                                  component="span"
                                  sx={{ fontSize: 10.5, fontWeight: 600, color: t.accent, border: `1px solid ${t.accent}`, borderRadius: '999px', padding: '0px 7px' }}
                                >
                                  {'★'.repeat(r.michelinStars ?? 0)} {tr('dashboard.michelinChip')}
                                </Box>
                              )}
                              {r.bibGourmand && (
                                <Box
                                  component="span"
                                  sx={{ fontSize: 10.5, fontWeight: 600, color: t.accent, border: `1px solid ${t.accent}`, borderRadius: '999px', padding: '0px 7px' }}
                                >
                                  {tr('dashboard.bibGourmand')}
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, flex: 'none' }}>
                          <BookingPill locations={r.locations ?? []} tokens={t} />
                        </Box>
                        <Box sx={{ width: 90, color: t.cost, fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono',monospace", display: { xs: 'none', sm: 'block' } }}>{r.costStr}</Box>
                        <Box sx={{ width: 110, display: { xs: 'none', sm: 'block' } }}>
                          {r.rated ? <Stars value={r.rating ?? 0} tokens={t} size={14} letterSpacing="1px" /> : null}
                        </Box>
                        {canEdit ? (
                          <IconButton
                            size="small"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleToggleFavorite(r); }}
                            aria-label={tr(r.favorite ? 'dashboard.unfavorite' : 'dashboard.favorite', { name: r.name })}
                            aria-pressed={r.favorite ?? false}
                            sx={{ flex: 'none', color: r.favorite ? 'error.main' : t.faint }}
                          >
                            {r.favorite ? <Favorite sx={{ fontSize: 18 }} /> : <FavoriteBorder sx={{ fontSize: 18 }} />}
                          </IconButton>
                        ) : r.favorite ? (
                          <Favorite role="img" aria-label={tr('dashboard.favorited')} sx={{ flex: 'none', fontSize: 18, color: 'error.main' }} />
                        ) : null}
                        <Box
                          component={canEdit ? 'button' : 'span'}
                          type={canEdit ? 'button' : undefined}
                          onClick={canEdit ? (e: React.MouseEvent) => { e.stopPropagation(); handleToggleStatus(r); } : undefined}
                          aria-label={canEdit ? tr('dashboard.markAs', { name: r.name, status: r.isBeen ? tr('dashboard.markWant') : tr('dashboard.markBeen') }) : undefined}
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
                          {r.isBeen ? tr('dashboard.statusBeen') : tr('dashboard.statusWant')}
                        </Box>
                        {canEdit && (
                          <Box className="row-actions" sx={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity .15s' }}>
                            <CardAction label={tr('dashboard.editX', { name: r.name })} onClick={() => handleEditRestaurant(r)} tokens={t} solid>
                              <EditIcon sx={{ fontSize: 15 }} />
                            </CardAction>
                            <CardAction label={tr('dashboard.deleteX', { name: r.name })} onClick={() => r.id && handleDeleteClick(r.id)} tokens={t} solid danger>
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
                              {tr('dashboard.loadingMap')}
                            </Box>
                          }
                        >
                          <RestaurantMap
                            restaurants={sorted}
                            accent={t.accent}
                            onSelect={handleViewRestaurant}
                            hoveredId={hoveredId}
                            onHoverChange={setHoveredId}
                          />
                        </Suspense>
                      ) : null}
                    </Box>
                    {mapMissingCount > 0 && (
                      <Box sx={{ color: t.faint, fontSize: 12.5 }}>
                        {tr('dashboard.missingAddress', { count: mapMissingCount })}
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ width: { xs: '100%', md: 330 }, flex: 'none', height: 540, overflowY: 'auto', border: `1px solid ${t.border}`, borderRadius: '16px', background: t.cardBg }}>
                    {sorted.map((r) => {
                      const syncKey = r.id ?? r.name;
                      return (
                      <Box
                        key={r.id}
                        ref={(el: HTMLElement | null) => {
                          if (el) mapRowRefs.current.set(syncKey, el);
                          else mapRowRefs.current.delete(syncKey);
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={r.name}
                        onClick={() => handleViewRestaurant(r)}
                        onKeyDown={activateOnKey(() => handleViewRestaurant(r))}
                        onMouseEnter={() => setHoveredId(syncKey)}
                        onMouseLeave={() => setHoveredId((cur) => (cur === syncKey ? null : cur))}
                        sx={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${t.borderSoft}`, cursor: 'pointer', background: hoveredId === syncKey ? t.searchBg : 'transparent', transition: 'background .12s', '&:hover': { filter: 'brightness(0.98)' } }}
                      >
                        <Box sx={{ width: 34, height: 34, borderRadius: '9px', flex: 'none' }}>
                          <RestaurantThumb
                            image={r.image}
                            alt={r.name}
                            initial={r.initial}
                            serifFont={serif}
                            tokens={t}
                            initialFontSize={18}
                            sx={{ width: '100%', height: '100%', borderRadius: '9px' }}
                          />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ fontSize: 14, fontWeight: 500 }}>{r.name}</Box>
                          <Box sx={{ color: t.muted, fontSize: 12 }}>{r.cuisine}</Box>
                        </Box>
                        <Box component="span" sx={{ color: t.cost, fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{r.costStr}</Box>
                      </Box>
                      );
                    })}
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
            <Box component="span" sx={{ fontFamily: serif, fontSize: 16, color: t.ink }}>{tr('brand')}</Box>
            <Box component="span" sx={{ ml: '6px' }}>{tr('dashboard.footerTagline')}</Box>
          </Box>
          <Box sx={{ color: t.faint, fontSize: '12.5px' }}>{tr('dashboard.footerSpots', { count: total })}</Box>
        </Box>

        {/* mobile FAB */}
        {canEdit && (
          <Box
            component="button"
            onClick={handleAddRestaurant}
            aria-label={tr('dashboard.addRestaurant')}
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
        <RestaurantDetailDialog
          open={detailOpen}
          restaurant={selectedRestaurant}
          canEdit={canEdit}
          tokens={t}
          serifFont={serif}
          onClose={() => setDetailOpen(false)}
          onEdit={handleEditRestaurant}
          onDelete={(id) => { setDetailOpen(false); handleDeleteClick(id); }}
          onToggleFavorite={handleToggleFavorite}
          onAddVisit={handleAddVisit}
        />
        <RestaurantFormDialog
          open={formOpen}
          restaurant={selectedRestaurant}
          onClose={() => setFormOpen(false)}
          onSave={handleSaveRestaurant}
          tokens={t}
          serifFont={serif}
        />
        <DeleteConfirmDialog
          open={deleteOpen}
          restaurantName={restaurantToDelete?.name || ''}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
        />
        <ShareListDialog
          open={shareOpen}
          list={activeList}
          members={members}
          inviteLink={inviteLink}
          shareLink={shareLink}
          currentUserId={userId}
          canManage={canManage}
          onClose={() => setShareOpen(false)}
          onChanged={() => revalidator.revalidate()}
          onLeave={handleLeaveList}
        />

        {/* new list dialog */}
        <Dialog open={newListOpen} onClose={() => setNewListOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{tr('dashboard.newList')}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label={tr('dashboard.listName')}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(); }}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNewListOpen(false)} sx={{ color: 'text.secondary' }}>{tr('dashboard.cancel')}</Button>
            <Button onClick={handleCreateList} variant="contained" disabled={!newListName.trim()}>{tr('dashboard.create')}</Button>
          </DialogActions>
        </Dialog>

        {/* rename list dialog */}
        <Dialog open={Boolean(renameListTarget)} onClose={() => setRenameListTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{tr('lists.renameTitle')}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label={tr('dashboard.listName')}
              value={renameListName}
              onChange={(e) => setRenameListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmRename(); }}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setRenameListTarget(null)} sx={{ color: 'text.secondary' }}>{tr('dashboard.cancel')}</Button>
            <Button onClick={handleConfirmRename} variant="contained" disabled={!renameListName.trim()}>{tr('lists.rename')}</Button>
          </DialogActions>
        </Dialog>

        {/* delete list confirmation */}
        <Dialog open={Boolean(deleteListTarget)} onClose={() => setDeleteListTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{tr('lists.deleteTitle')}</DialogTitle>
          <DialogContent>
            <Box sx={{ color: 'text.secondary' }}>
              {tr('lists.deleteConfirm', { name: deleteListTarget?.name ?? '' })}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDeleteListTarget(null)} sx={{ color: 'text.secondary' }}>{tr('dashboard.cancel')}</Button>
            <Button onClick={handleConfirmDeleteList} variant="contained" color="error">{tr('lists.delete')}</Button>
          </DialogActions>
        </Dialog>

        {/* save / rename view dialog */}
        <Dialog open={Boolean(viewDialog)} onClose={() => setViewDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {viewDialog?.mode === 'rename' ? tr('views.renameTitle') : tr('views.saveTitle')}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label={tr('views.nameLabel')}
              placeholder={tr('views.namePlaceholder')}
              value={viewDialog?.name ?? ''}
              onChange={(e) => setViewDialog((v) => (v ? { ...v, name: e.target.value } : v))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmView(); }}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setViewDialog(null)} sx={{ color: 'text.secondary' }}>{tr('dashboard.cancel')}</Button>
            <Button onClick={handleConfirmView} variant="contained" disabled={!viewDialog?.name.trim()}>
              {viewDialog?.mode === 'rename' ? tr('lists.rename') : tr('views.save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* snackbar — ink surface, 5s, optional Undo/Retry action */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            action={
              snackbar.action ? (
                <Button
                  size="small"
                  onClick={() => {
                    snackbar.action?.onClick();
                    setSnackbar((s) => ({ ...s, open: false }));
                  }}
                  sx={{ color: t.accent, fontWeight: 700, minHeight: 'auto', py: 0.25 }}
                >
                  {snackbar.action.label}
                </Button>
              ) : undefined
            }
            sx={{
              width: '100%',
              background: t.snackBg,
              color: t.snackFg,
              borderRadius: '12px',
              '& .MuiAlert-icon': { color: t.snackFg },
              '& .MuiAlert-action': { color: t.snackFg, alignItems: 'center', pt: 0 },
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
