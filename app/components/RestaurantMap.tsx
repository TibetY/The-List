import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Restaurant } from '~/types/restaurant';

type Located = Restaurant & { lat: number; lng: number };

// Default view when nothing is geocoded yet (Ottawa — "Ottawa & beyond").
const DEFAULT_CENTER: [number, number] = [45.4215, -75.6972];

/** A styled teardrop pin, built as a divIcon so we don't depend on Leaflet's
 *  default marker image assets (which break under bundlers). */
function pinIcon(accent: string) {
  return L.divIcon({
    className: 'thelist-pin',
    html: `<span style="display:block;width:18px;height:18px;background:${accent};border:2px solid #fff;border-radius:50% 50% 50% 2px;transform:rotate(45deg);box-shadow:0 2px 5px rgba(0,0,0,.35)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 16],
    popupAnchor: [0, -16],
  });
}

/** Pan/zoom the map to fit all pins whenever the set of points changes. */
function FitBounds({ points }: { points: Located[] }) {
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

export interface RestaurantMapProps {
  restaurants: Restaurant[];
  accent: string;
  canEdit: boolean;
  onSelect: (r: Restaurant) => void;
}

export default function RestaurantMap({
  restaurants,
  accent,
  canEdit,
  onSelect,
}: RestaurantMapProps) {
  const points = useMemo(
    () =>
      restaurants.filter(
        (r): r is Located =>
          typeof r.lat === 'number' && typeof r.lng === 'number'
      ),
    [restaurants]
  );
  const icon = useMemo(() => pinIcon(accent), [accent]);

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
      {points.map((r) => (
        <Marker
          key={r.id}
          position={[r.lat, r.lng]}
          icon={icon}
          eventHandlers={{ click: () => canEdit && onSelect(r) }}
        >
          <Popup>
            <strong>{r.name}</strong>
            {r.cuisineType ? (
              <>
                <br />
                {r.cuisineType}
              </>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
