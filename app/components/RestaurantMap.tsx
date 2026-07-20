import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MyLocation } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Restaurant, RestaurantLocation } from '~/types/restaurant';

function reservationLabel(platform: string): string {
  if (platform === 'resy') return 'Resy';
  if (platform === 'opentable') return 'OpenTable';
  if (platform === 'walkin') return '';
  return platform;
}

/** A single plottable pin: a restaurant paired with one of its located branches. */
interface LocatedPin {
  restaurant: Restaurant;
  location: RestaurantLocation;
  lat: number;
  lng: number;
  key: string;
  /** Sync identity — the restaurant (not the branch), so hovering a side-list
   *  row lights up every branch of that place and vice-versa. */
  restaurantKey: string;
}

// Default view when nothing is geocoded yet (Ottawa — "Ottawa & beyond").
const DEFAULT_CENTER: [number, number] = [45.4215, -75.6972];

/** Half-star-aware rating for the popup: two ★★★★★ layers, the accent one clipped
 *  to the rating fraction (leaflet popups are always on a light surface). */
function starsHtml(value: number): string {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;
  const base = 'letter-spacing:1px;line-height:1;white-space:nowrap;font-size:13px';
  return (
    `<span style="position:relative;display:inline-block;${base}">` +
    `<span style="color:rgba(43,36,32,.25)">★★★★★</span>` +
    `<span style="position:absolute;left:0;top:0;width:${pct}%;overflow:hidden;color:#B5532F">★★★★★</span>` +
    `</span>`
  );
}

/** Escape user-supplied text before it goes into a Leaflet popup's innerHTML. */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

/** A styled teardrop pin, built as a divIcon so we don't depend on Leaflet's
 *  default marker image assets (which break under bundlers). When `active`, the
 *  pin is enlarged and ringed with the accent so hover-sync is obvious. */
function pinIcon(accent: string, active = false) {
  const size = active ? 26 : 18;
  const anchor = active ? 22 : 16;
  const shadow = active
    ? `box-shadow:0 0 0 4px ${accent}59,0 2px 6px rgba(0,0,0,.4);`
    : 'box-shadow:0 2px 5px rgba(0,0,0,.35);';
  return L.divIcon({
    className: 'thelist-pin',
    html: `<span style="display:block;width:${size}px;height:${size}px;background:${accent};border:2px solid #fff;border-radius:50% 50% 50% 2px;transform:rotate(45deg);${shadow}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, anchor],
    popupAnchor: [0, -anchor],
  });
}

/** Build a pin's popup HTML — a small card peek: photo, name, rating, cuisine,
 *  reservation/walk-in. */
function popupHtml(pin: LocatedPin, t: TFunction): string {
  const { restaurant: r, location } = pin;
  const title = location.label ? `${r.name} (${location.label})` : r.name;
  let html = '';
  if (r.image && /^https?:\/\//i.test(r.image)) {
    html += `<img src="${escapeHtml(r.image)}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:6px;display:block" />`;
  }
  html += `<strong>${escapeHtml(title)}</strong>`;
  if ((r.rating ?? 0) > 0) {
    html += `<br/>${starsHtml(r.rating ?? 0)}`;
  }
  if (r.cuisineType) {
    html += `<br/>${escapeHtml(t(`cuisines.${r.cuisineType}`, r.cuisineType))}`;
  }
  const url = location.reservationUrl;
  if (url && /^https?:\/\//i.test(url)) {
    const label = t('dashboard.reserveOn', {
      platform: reservationLabel(location.reservationPlatform || ''),
    });
    html += `<br/><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  } else if (location.reservationPlatform === 'walkin') {
    html += `<br/>${escapeHtml(t('dashboard.walkinBadge'))}`;
  }
  return html;
}

/** Pan/zoom the map to fit all pins whenever the set of points changes. */
function FitBounds({ points }: { points: LocatedPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

/**
 * Imperative layer that manages a marker-cluster group. Clustering keeps a dense
 * list legible; the group is (re)built only when the points, accent, or language
 * change. Hover emphasis and callbacks are handled without rebuilding: callbacks
 * live in refs, and the hovered pin is re-iconed in a separate effect.
 */
function ClusterLayer({
  points,
  accent,
  hoveredKey,
  onSelect,
  onHoverChange,
}: {
  points: LocatedPin[];
  accent: string;
  hoveredKey: string | null;
  onSelect: (r: Restaurant) => void;
  onHoverChange?: (key: string | null) => void;
}) {
  const map = useMap();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // Keep callbacks / t in refs so marker handlers see the latest without making
  // them effect dependencies (which would rebuild the whole cluster each render).
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onHoverRef = useRef(onHoverChange);
  onHoverRef.current = onHoverChange;
  const tRef = useRef<TFunction>(t);
  tRef.current = t;

  // restaurantKey → its markers, so hover emphasis can target every branch.
  const markersByKey = useRef<Map<string, L.Marker[]>>(new Map());
  // The rebuild effect must not depend on hoveredKey (that would rebuild the
  // whole cluster per hover), but it must re-apply the current emphasis after
  // recreating the markers — so it reads the latest value from a ref.
  const hoveredKeyRef = useRef(hoveredKey);
  hoveredKeyRef.current = hoveredKey;

  useEffect(() => {
    // leaflet.markercluster is a UMD plugin that patches the Leaflet instance;
    // under some bundler interop it can end up patching a different copy, and
    // calling the missing factory would crash the whole map chunk. Clustering
    // is an enhancement — fall back to a plain layer group so pins always show.
    const clusterFactory = (
      L as unknown as { markerClusterGroup?: (opts?: object) => L.LayerGroup }
    ).markerClusterGroup;
    const group =
      typeof clusterFactory === 'function'
        ? clusterFactory({ showCoverageOnHover: false, maxClusterRadius: 48 })
        : L.layerGroup();
    const byKey = new Map<string, L.Marker[]>();
    for (const pin of points) {
      const active = pin.restaurantKey === hoveredKeyRef.current;
      const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon(accent, active) });
      marker.bindPopup(popupHtml(pin, tRef.current));
      marker.on('click', () => onSelectRef.current(pin.restaurant));
      marker.on('mouseover', () => onHoverRef.current?.(pin.restaurantKey));
      marker.on('mouseout', () => onHoverRef.current?.(null));
      group.addLayer(marker);
      const arr = byKey.get(pin.restaurantKey) ?? [];
      arr.push(marker);
      byKey.set(pin.restaurantKey, arr);
    }
    map.addLayer(group);
    markersByKey.current = byKey;
    return () => {
      map.removeLayer(group);
      markersByKey.current = new Map();
    };
    // `lang` triggers a rebuild so popup text follows the language toggle.
  }, [map, points, accent, lang]);

  // Emphasize the hovered restaurant's markers (all its branches).
  useEffect(() => {
    for (const [key, markers] of markersByKey.current) {
      const active = key === hoveredKey;
      for (const marker of markers) marker.setIcon(pinIcon(accent, active));
    }
  }, [hoveredKey, accent]);

  return null;
}

/** A small "locate me" button overlaid on the map that recenters on the user. */
function NearMeControl({ accent }: { accent: string }) {
  const map = useMap();
  const { t } = useTranslation();
  const label = t('map.nearMe');
  const ref = useRef<HTMLButtonElement>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    // Stop clicks/drags on the button from reaching the map underneath.
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);

  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={locate}
      title={label}
      aria-label={label}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        width: 38,
        height: 38,
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,.12)',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,.2)',
        opacity: locating ? 0.6 : 1,
      }}
    >
      <MyLocation style={{ fontSize: 19, color: accent }} />
    </button>
  );
}

export interface RestaurantMapProps {
  restaurants: Restaurant[];
  accent: string;
  onSelect: (r: Restaurant) => void;
  /** Sync identity (`id ?? name`) of the currently-hovered restaurant, if any. */
  hoveredId?: string | null;
  /** Notified when a pin is hovered (its restaurant key) or un-hovered (null). */
  onHoverChange?: (key: string | null) => void;
}

export default function RestaurantMap({
  restaurants,
  accent,
  onSelect,
  hoveredId = null,
  onHoverChange,
}: RestaurantMapProps) {
  // One pin per located location (a restaurant can have several branches).
  const points = useMemo(() => {
    const pins: LocatedPin[] = [];
    for (const r of restaurants) {
      const restaurantKey = r.id ?? r.name;
      (r.locations ?? []).forEach((location, i) => {
        if (typeof location.lat === 'number' && typeof location.lng === 'number') {
          pins.push({
            restaurant: r,
            location,
            lat: location.lat,
            lng: location.lng,
            key: `${restaurantKey}-${i}`,
            restaurantKey,
          });
        }
      });
    }
    return pins;
  }, [restaurants]);

  return (
    <MapContainer
      center={points[0] ? [points[0].lat, points[0].lng] : DEFAULT_CENTER}
      zoom={12}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      <ClusterLayer
        points={points}
        accent={accent}
        hoveredKey={hoveredId}
        onSelect={onSelect}
        onHoverChange={onHoverChange}
      />
      <NearMeControl accent={accent} />
    </MapContainer>
  );
}
