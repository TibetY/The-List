import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Restaurant, RestaurantLocation } from '~/types/restaurant';

/** A single plottable pin: a restaurant paired with one of its located branches. */
interface LocatedPin {
  restaurant: Restaurant;
  location: RestaurantLocation;
  lat: number;
  lng: number;
  key: string;
}

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

export interface RestaurantMapProps {
  restaurants: Restaurant[];
  accent: string;
  onSelect: (r: Restaurant) => void;
}

export default function RestaurantMap({
  restaurants,
  accent,
  onSelect,
}: RestaurantMapProps) {
  // One pin per located location (a restaurant can have several branches).
  const points = useMemo(() => {
    const pins: LocatedPin[] = [];
    for (const r of restaurants) {
      (r.locations ?? []).forEach((location, i) => {
        if (typeof location.lat === 'number' && typeof location.lng === 'number') {
          pins.push({
            restaurant: r,
            location,
            lat: location.lat,
            lng: location.lng,
            key: `${r.id ?? r.name}-${i}`,
          });
        }
      });
    }
    return pins;
  }, [restaurants]);
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
      {points.map((p) => {
        const { restaurant: r, location } = p;
        const title = location.label ? `${r.name} (${location.label})` : r.name;
        return (
          <Marker
            key={p.key}
            position={[p.lat, p.lng]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(r) }}
          >
            <Popup>
              <strong>{title}</strong>
              {r.cuisineType ? (
                <>
                  <br />
                  {r.cuisineType}
                </>
              ) : null}
              {location.reservationUrl ? (
                <>
                  <br />
                  <a href={location.reservationUrl} target="_blank" rel="noopener noreferrer">
                    Reserve on {location.reservationPlatform === 'resy' ? 'Resy' : location.reservationPlatform === 'opentable' ? 'OpenTable' : location.reservationPlatform}
                  </a>
                </>
              ) : location.reservationPlatform === 'walkin' ? (
                <>
                  <br />
                  Walk-ins welcome
                </>
              ) : null}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
