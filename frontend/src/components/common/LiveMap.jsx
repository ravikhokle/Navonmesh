/**
 * LiveMap — Reusable Google Maps component
 * 
 * Marker types and their colors:
 *   self      → cyan  (my current location)
 *   ambulance → blue  (ambulance drivers)
 *   emergency → red   (patient / emergency location)
 *   hospital  → green (hospitals)
 *   traffic   → amber (traffic officers)
 *
 * Props:
 *   markers  — Array of { type, lat, lng, label }
 *   center   — Optional { lat, lng } override (auto-calculated from markers otherwise)
 *   zoom     — Number (default 13)
 *   height   — CSS string (default '340px')
 */

import { useMemo } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

const containerStyle = { width: '100%', height: '100%' };

// Google-hosted coloured pin icons (no external dependency)
const ICON_URLS = {
  self:      'http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png',
  ambulance: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  emergency: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  hospital:  'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
  traffic:   'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
};

const LEGEND = [
  { type: 'self',      color: 'bg-cyan-400',    label: 'My Position' },
  { type: 'ambulance', color: 'bg-blue-500',     label: 'Ambulance' },
  { type: 'emergency', color: 'bg-red-500',      label: 'Emergency' },
  { type: 'hospital',  color: 'bg-emerald-500',  label: 'Hospital' },
  { type: 'traffic',   color: 'bg-amber-400',    label: 'Traffic Officer' },
];

const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

// Default center: middle of India (fallback when no markers)
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

export default function LiveMap({ markers = [], center, zoom = 13, height = '340px' }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY,
    id: 'emergex-google-map',
  });

  // Compute map center from markers if no explicit center given
  const mapCenter = useMemo(() => {
    if (center?.lat != null && center?.lng != null) return center;
    const valid = markers.filter((m) => m.lat != null && m.lng != null);
    if (!valid.length) return INDIA_CENTER;
    const avgLat = valid.reduce((s, m) => s + m.lat, 0) / valid.length;
    const avgLng = valid.reduce((s, m) => s + m.lng, 0) / valid.length;
    return { lat: avgLat, lng: avgLng };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, JSON.stringify(markers)]);

  // Infer which legend items are actually used
  const usedTypes = useMemo(
    () => new Set(markers.map((m) => m.type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(markers)]
  );

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

  return (
    <div className="space-y-2">
      <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={zoom}
          options={MAP_OPTIONS}
        >
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

      {/* Legend — only show types that have markers */}
      {usedTypes.size > 0 && (
        <div className="flex flex-wrap gap-3 px-1">
          {LEGEND.filter((l) => usedTypes.has(l.type)).map((l) => (
            <span key={l.type} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-3 h-3 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
