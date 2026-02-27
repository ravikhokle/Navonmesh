/**
 * LiveMap — Google Maps component with real-time markers AND road-routing
 *
 * Marker types (coloured pins):
 *   self      → cyan  (my current position)
 *   ambulance → blue  (ambulance driver)
 *   emergency → red   (patient / emergency)
 *   hospital  → green (hospital)
 *   traffic   → amber (traffic officer)
 *
 * Props:
 *   markers  Array<{ type, lat, lng, label }>         — pin markers
 *   routes   Array<{ origin:{lat,lng}, destination:{lat,lng}, color?:string }>
 *              — road routes drawn via Google Directions API
 *   center   { lat, lng }  — optional map center override (auto from markers if omitted)
 *   zoom     number        — default 13
 *   height   CSS string    — default '340px'
 */

import { useMemo, useEffect, useState, useRef } from 'react';
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from '@react-google-maps/api';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const LIBRARIES = ['routes']; // needed for DirectionsService

const containerStyle = { width: '100%', height: '100%' };

const ICON_URLS = {
  self:      'http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png',
  ambulance: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  emergency: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  hospital:  'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
  traffic:   'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
};

const LEGEND = [
  { type: 'self',      color: 'bg-cyan-400',   label: 'My Position'    },
  { type: 'ambulance', color: 'bg-blue-500',    label: 'Ambulance'      },
  { type: 'emergency', color: 'bg-red-500',     label: 'Emergency'      },
  { type: 'hospital',  color: 'bg-emerald-500', label: 'Hospital'       },
  { type: 'traffic',   color: 'bg-amber-400',   label: 'Traffic Officer'},
];

const MAP_OPTIONS = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

// Round to 4 decimal places (~11m) to avoid excessive direction recalculations
function roundCoord(c) {
  return c == null ? null : +c.toFixed(4);
}

function routeKey(routes) {
  return JSON.stringify(
    (routes || []).map((r) => ({
      olat: roundCoord(r.origin?.lat),
      olng: roundCoord(r.origin?.lng),
      dlat: roundCoord(r.destination?.lat),
      dlng: roundCoord(r.destination?.lng),
    }))
  );
}

export default function LiveMap({
  markers = [],
  routes = [],
  center,
  zoom = 13,
  height = '340px',
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY,
    id: 'emergex-google-map',
    libraries: LIBRARIES,
  });

  const [dirResults, setDirResults] = useState([]);     // computed direction results
  const [routeWarning, setRouteWarning] = useState(''); // shown when directions fail
  const lastRouteKey = useRef('');
  const debounceTimer = useRef(null);

  // ── Compute directions whenever routes change (debounced 8s to control API cost)
  useEffect(() => {
    if (!isLoaded || !window.google) return;

    const key = routeKey(routes);
    if (!routes.length) {
      setDirResults([]);
      setRouteWarning('');
      lastRouteKey.current = key;
      return;
    }
    if (key === lastRouteKey.current) return; // no meaningful change

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      lastRouteKey.current = key;
      const service = new window.google.maps.DirectionsService();

      const promises = routes.map((r) => {
        if (!r.origin?.lat || !r.destination?.lat) return Promise.resolve(null);
        return new Promise((resolve) => {
          service.route(
            {
              origin: r.origin,
              destination: r.destination,
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK') {
                resolve({ result, color: r.color || '#1a73e8' });
              } else {
                console.warn('DirectionsService:', status);
                resolve(null);
              }
            }
          );
        });
      });

      Promise.all(promises).then((results) => {
        const valid = results.filter(Boolean);
        setDirResults(valid);
        if (valid.length < routes.filter((r) => r.origin?.lat && r.destination?.lat).length) {
          setRouteWarning('Some routes could not be calculated — check Google Maps API billing.');
        } else {
          setRouteWarning('');
        }
      });
    }, 8000); // 8-second debounce — balances freshness vs API cost

    return () => clearTimeout(debounceTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, routeKey(routes)]);

  // ── Map center: explicit > average of markers > India
  const mapCenter = useMemo(() => {
    if (center?.lat != null && center?.lng != null) return center;
    const valid = markers.filter((m) => m.lat != null && m.lng != null);
    if (!valid.length) return INDIA_CENTER;
    return {
      lat: valid.reduce((s, m) => s + m.lat, 0) / valid.length,
      lng: valid.reduce((s, m) => s + m.lng, 0) / valid.length,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, JSON.stringify(markers)]);

  const usedTypes = useMemo(
    () => new Set(markers.map((m) => m.type)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(markers)]
  );

  // ── Error states
  if (!MAPS_KEY) {
    return (
      <div
        style={{ height }}
        className="rounded-xl border border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center gap-2 text-sm"
      >
        <span className="text-amber-600 font-semibold">Google Maps API key missing</span>
        <span className="text-amber-500 text-xs">
          Add <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> to frontend/.env
        </span>
      </div>
    );
  }
  if (loadError) {
    return (
      <div
        style={{ height }}
        className="rounded-xl border border-red-200 bg-red-50 flex items-center justify-center text-sm text-red-500"
      >
        Map failed to load — check your API key &amp; billing
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div
        style={{ height }}
        className="rounded-xl bg-gray-100 animate-pulse flex items-center justify-center text-sm text-gray-400"
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Route warning */}
      {routeWarning && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          ⚠ {routeWarning}
        </div>
      )}

      <div
        style={{ height }}
        className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={zoom}
          options={MAP_OPTIONS}
        >
          {/* Road route overlays */}
          {dirResults.map((dr, i) => (
            <DirectionsRenderer
              key={i}
              directions={dr.result}
              options={{
                suppressMarkers: true, // Use our own coloured pins instead
                polylineOptions: {
                  strokeColor: dr.color,
                  strokeWeight: 5,
                  strokeOpacity: 0.85,
                },
              }}
            />
          ))}

          {/* Location markers */}
          {markers.map((m, i) =>
            m.lat != null && m.lng != null ? (
              <Marker
                key={`${m.type}-${i}-${m.lat}-${m.lng}`}
                position={{ lat: m.lat, lng: m.lng }}
                icon={ICON_URLS[m.type] ?? ICON_URLS.emergency}
                title={m.label ?? m.type}
              />
            ) : null
          )}
        </GoogleMap>
      </div>

      {/* Legend */}
      {usedTypes.size > 0 && (
        <div className="flex flex-wrap gap-3 px-1">
          {LEGEND.filter((l) => usedTypes.has(l.type)).map((l) => (
            <span key={l.type} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-3 h-3 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
          {dirResults.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-6 h-0.5 bg-blue-500 inline-block" />
              Route
            </span>
          )}
        </div>
      )}
    </div>
  );
}
