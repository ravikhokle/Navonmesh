/**
 * LiveMap — Google Maps component with real-time markers AND road-routing
 *
 * Marker types (Google Maps-style pin markers):
 *   self      → cyan    (my current position)
 *   ambulance → blue    (ambulance driver)
 *   emergency → red     (patient / emergency SOS)
 *   hospital  → green   (hospital)
 *   traffic   → amber   (traffic officer)
 *
 * Props:
 *   markers  Array<{ type, lat, lng, label }>
 *   routes   Array<{
 *              origin:{lat,lng}, destination:{lat,lng},
 *              color?:string,
 *              originLabel?:string, destinationLabel?:string
 *            }>
 *   center   { lat, lng }  — optional override (auto from markers if omitted)
 *   zoom     number        — default 13
 *   height   CSS string    — default '340px'
 */

import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const LIBRARIES = ['routes'];

const containerStyle = { width: '100%', height: '100%' };

// ── Custom Google Maps-style pin SVG creator ──────────────────────────────
function makePinSvg(pinColor, label) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="42" height="54" viewBox="0 0 42 54">
  <defs>
    <filter id="ds" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="rgba(0,0,0,0.30)"/>
    </filter>
  </defs>
  <path filter="url(#ds)"
        d="M21 1 C12.16 1 5 8.16 5 17 C5 30.5 21 53 21 53 S37 30.5 37 17 C37 8.16 29.84 1 21 1 Z"
        fill="${pinColor}" stroke="white" stroke-width="1.8"/>
  <circle cx="21" cy="17" r="11" fill="white" opacity="0.97"/>
  <text x="21" y="22" text-anchor="middle"
        font-size="10" font-weight="800" fill="${pinColor}"
        font-family="Arial, Helvetica, sans-serif" letter-spacing="-0.3">${label}</text>
</svg>`.trim();
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

const PIN_URLS = {
  self:      makePinSvg('#0891b2', 'ME'),
  ambulance: makePinSvg('#1d4ed8', 'AMB'),
  emergency: makePinSvg('#dc2626', 'SOS'),
  hospital:  makePinSvg('#059669', 'H'),
  traffic:   makePinSvg('#d97706', 'TP'),
};

const PIN_W = 42;
const PIN_H = 54;

// ── Legend config ─────────────────────────────────────────────────────────
const LEGEND = [
  { type: 'self',      color: '#0891b2', label: 'My Position'     },
  { type: 'ambulance', color: '#1d4ed8', label: 'Ambulance'       },
  { type: 'emergency', color: '#dc2626', label: 'Emergency / SOS' },
  { type: 'hospital',  color: '#059669', label: 'Hospital'        },
  { type: 'traffic',   color: '#d97706', label: 'Traffic Officer' },
];

function Dot({ color }) {
  return (
    <span
      style={{ background: color }}
      className="inline-block w-3 h-3 rounded-full flex-shrink-0"
    />
  );
}

const MAP_OPTIONS = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
};

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

// Round to 4 decimal places (~11 m) to avoid excessive direction recalculations
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

  const [dirResults, setDirResults]         = useState([]);
  const [routeWarning, setRouteWarning]     = useState('');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const lastRouteKey   = useRef('');
  const debounceTimer  = useRef(null);

  // Build proper Google Maps Icon object (requires window.google to be available)
  const getIcon = useCallback(
    (type) => {
      if (!isLoaded || !window.google) return undefined;
      return {
        url:        PIN_URLS[type] ?? PIN_URLS.emergency,
        scaledSize: new window.google.maps.Size(PIN_W, PIN_H),
        anchor:     new window.google.maps.Point(PIN_W / 2, PIN_H),
      };
    },
    [isLoaded]
  );

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
    if (key === lastRouteKey.current) return;

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      lastRouteKey.current = key;
      const svc = new window.google.maps.DirectionsService();

      const promises = routes.map((r) => {
        if (!r.origin?.lat || !r.destination?.lat) return Promise.resolve(null);
        return new Promise((resolve) => {
          svc.route(
            {
              origin:      r.origin,
              destination: r.destination,
              travelMode:  window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK') {
                resolve({
                  result,
                  color:            r.color           || '#1a73e8',
                  originLabel:      r.originLabel      || null,
                  destinationLabel: r.destinationLabel || null,
                });
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
        const expected = routes.filter((r) => r.origin?.lat && r.destination?.lat).length;
        setRouteWarning(
          valid.length < expected
            ? 'Some routes could not be calculated — check Google Maps API billing.'
            : ''
        );
      });
    }, 8000);

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

  // Routes that have valid coordinates (shown in Source → Dest panel)
  const labelledRoutes = useMemo(
    () => routes.filter((r) => r.origin?.lat && r.destination?.lat),
  // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeKey(routes)]
  );

  // ── Error / loading states ─────────────────────────────────────────────
  if (!MAPS_KEY) {
    return (
      <div
        style={{ height }}
        className="rounded-xl border border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center gap-2 text-sm"
      >
        <span className="text-amber-600 font-semibold">Google Maps API key missing</span>
        <span className="text-amber-500 text-xs">
          Add <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> to{' '}
          <code className="bg-amber-100 px-1 rounded">frontend/.env</code>
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

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">

      {/* Route warning */}
      {routeWarning && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          ⚠ {routeWarning}
        </div>
      )}

      {/* ── Source → Destination info panel ── */}
      {labelledRoutes.length > 0 && (
        <div className="space-y-1.5">
          {labelledRoutes.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg px-3 py-2 border text-xs"
              style={{
                background:   `${r.color || '#1a73e8'}12`,
                borderColor:  `${r.color || '#1a73e8'}45`,
              }}
            >
              {/* Origin */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2 border-white shadow"
                  style={{ background: '#10b981' }}
                />
                <span className="font-semibold text-gray-700 truncate">
                  {r.originLabel || 'Source'}
                </span>
              </div>

              {/* Arrow */}
              <span
                className="font-bold flex-shrink-0 text-base leading-none"
                style={{ color: r.color || '#1a73e8' }}
              >
                →
              </span>

              {/* Destination */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="font-semibold text-gray-700 truncate text-right">
                  {r.destinationLabel || 'Destination'}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2 border-white shadow"
                  style={{ background: r.color || '#dc2626' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Map canvas ─────────────────────────────────────────────────── */}
      <div
        style={{ height }}
        className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={zoom}
          options={MAP_OPTIONS}
          onClick={() => setSelectedMarker(null)}
        >
          {/* Road route overlays */}
          {dirResults.map((dr, i) => (
            <DirectionsRenderer
              key={i}
              directions={dr.result}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor:   dr.color,
                  strokeWeight:  6,
                  strokeOpacity: 0.88,
                },
              }}
            />
          ))}

          {/* Google Maps-style pin markers */}
          {markers.map((m, i) =>
            m.lat != null && m.lng != null ? (
              <Marker
                key={`${m.type}-${i}-${m.lat}-${m.lng}`}
                position={{ lat: m.lat, lng: m.lng }}
                icon={getIcon(m.type)}
                title={m.label ?? m.type}
                onClick={() => setSelectedMarker(m)}
              />
            ) : null
          )}

          {/* InfoWindow shown on marker click */}
          {selectedMarker && (
            <InfoWindow
              position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ minWidth: 130, maxWidth: 210 }}>
                <div
                  className="text-[10px] font-bold uppercase tracking-wide mb-0.5"
                  style={{
                    color: LEGEND.find((l) => l.type === selectedMarker.type)?.color ?? '#dc2626',
                  }}
                >
                  {LEGEND.find((l) => l.type === selectedMarker.type)?.label ?? selectedMarker.type}
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {selectedMarker.label ?? selectedMarker.type}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {selectedMarker.lat?.toFixed(5)}, {selectedMarker.lng?.toFixed(5)}
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* ── Legend + route line indicators ── */}
      {(usedTypes.size > 0 || dirResults.length > 0) && (
        <div className="flex flex-wrap gap-3 px-1 pt-0.5">
          {LEGEND.filter((l) => usedTypes.has(l.type)).map((l) => (
            <span key={l.type} className="flex items-center gap-1.5 text-xs text-gray-500">
              <Dot color={l.color} />
              {l.label}
            </span>
          ))}
          {dirResults.map((dr, i) => (
            <span key={`route-${i}`} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span
                className="inline-block w-6 rounded-full"
                style={{ background: dr.color, height: 3 }}
              />
              {dr.originLabel && dr.destinationLabel
                ? `${dr.originLabel} → ${dr.destinationLabel}`
                : 'Route'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
