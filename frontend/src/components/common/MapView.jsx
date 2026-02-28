import { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../lib/constants';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem',
};

const MAP_OPTIONS = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
};

// Custom Google Maps-style pin SVG
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

const PIN_CONFIGS = {
  primary:   { url: makePinSvg('#dc2626', 'ME'),  color: '#dc2626', label: 'My Location'     },
  ambulance: { url: makePinSvg('#1d4ed8', 'AMB'), color: '#1d4ed8', label: 'Ambulance'       },
  hospital:  { url: makePinSvg('#059669', 'H'),   color: '#059669', label: 'Hospital'        },
  traffic:   { url: makePinSvg('#d97706', 'TP'),  color: '#d97706', label: 'Traffic Officer' },
  emergency: { url: makePinSvg('#dc2626', 'SOS'), color: '#dc2626', label: 'Emergency'       },
};

const PIN_W = 42;
const PIN_H = 54;

export default function MapView({ center, markers = [], zoom }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'emergex-mapview',
  });

  const [selected, setSelected] = useState(null);

  const buildIcon = useCallback(
    (type) => {
      if (!isLoaded || !window.google) return undefined;
      const cfg = PIN_CONFIGS[type] ?? PIN_CONFIGS.primary;
      return {
        url:        cfg.url,
        scaledSize: new window.google.maps.Size(PIN_W, PIN_H),
        anchor:     new window.google.maps.Point(PIN_W / 2, PIN_H),
      };
    },
    [isLoaded]
  );

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center || MAP_DEFAULT_CENTER}
      zoom={zoom || MAP_DEFAULT_ZOOM}
      options={MAP_OPTIONS}
      onClick={() => setSelected(null)}
    >
      {/* Primary / user location marker */}
      {center && (
        <Marker
          position={center}
          icon={buildIcon('primary')}
          title="My Location"
          onClick={() => setSelected({ pos: center, label: 'My Location', type: 'primary' })}
        />
      )}

      {/* Additional markers (hospitals, ambulances, traffic, etc.) */}
      {markers.map((m, i) => (
        <Marker
          key={m.id || i}
          position={{ lat: m.lat, lng: m.lng }}
          icon={buildIcon(m.type || 'primary')}
          title={m.name || m.label}
          onClick={() =>
            setSelected({ pos: { lat: m.lat, lng: m.lng }, label: m.name || m.label, type: m.type || 'primary' })
          }
        />
      ))}

      {/* InfoWindow on click */}
      {selected && (
        <InfoWindow
          position={selected.pos}
          onCloseClick={() => setSelected(null)}
        >
          <div style={{ minWidth: 120 }}>
            <div
              className="text-[10px] font-bold uppercase tracking-wide mb-0.5"
              style={{ color: PIN_CONFIGS[selected.type]?.color ?? '#dc2626' }}
            >
              {PIN_CONFIGS[selected.type]?.label ?? 'Location'}
            </div>
            <div className="text-sm font-semibold text-gray-800">{selected.label}</div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
