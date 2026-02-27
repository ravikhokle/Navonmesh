import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../lib/constants';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem',
};

export default function MapView({ center, markers = [], zoom }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

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
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
      }}
    >
      {/* User / primary marker */}
      {center && (
        <Marker
          position={center}
          icon={{
            url: 'data:image/svg+xml;charset=UTF-8,' +
              encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#dc2626"><circle cx="12" cy="12" r="10"/></svg>'
              ),
            scaledSize: { width: 24, height: 24 },
          }}
        />
      )}

      {/* Additional markers (hospitals, etc.) */}
      {markers.map((m, i) => (
        <Marker
          key={m.id || i}
          position={{ lat: m.lat, lng: m.lng }}
          title={m.name}
        />
      ))}
    </GoogleMap>
  );
}
