import { useState, useEffect, useCallback } from 'react';
import {
  Siren,
  MapPin,
  Phone,
  User,
  Building2,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import useEmergencyStore from '../stores/emergencyStore';
import MapView from '../components/common/MapView';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function CitizenPage() {
  const [form, setForm] = useState({ name: '', phone: '', description: '' });
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const {
    createSOS,
    fetchNearestHospitals,
    nearestHospitals,
    currentEmergency,
    isLoading,
  } = useEmergencyStore();

  // Get user location
  const getLocation = useCallback(() => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          setLocationLoading(false);
          fetchNearestHospitals(loc.lat, loc.lng);
        },
        () => {
          setLocation({ lat: 28.6139, lng: 77.209 });
          setLocationLoading(false);
        }
      );
    } else {
      setLocation({ lat: 28.6139, lng: 77.209 });
      setLocationLoading(false);
    }
  }, [fetchNearestHospitals]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const handleSOS = async (e) => {
    e.preventDefault();
    if (!location) return;
    await createSOS({
      ...form,
      location: { lat: location.lat, lng: location.lng },
    });
  };

  const hospitalMarkers = nearestHospitals.map((h) => ({
    id: h._id,
    lat: h.location?.lat,
    lng: h.location?.lng,
    name: h.name,
  }));

  return (
    <div className="space-y-6">
      {/* SOS Banner */}
      {currentEmergency && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800">Emergency Active</p>
            <p className="text-sm text-red-600">
              Help is on the way. Stay calm and wait for assistance.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: SOS Form */}
        <div className="space-y-6">
          {/* SOS Button */}
          <div className="card text-center">
            <button
              onClick={handleSOS}
              disabled={isLoading || !location}
              className="group relative w-40 h-40 mx-auto rounded-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:bg-gray-300 transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 cursor-pointer"
            >
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
              <div className="relative flex flex-col items-center justify-center text-white">
                <Siren size={40} />
                <span className="text-lg font-bold mt-1">SOS</span>
              </div>
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Press the SOS button to send an emergency alert
            </p>
          </div>

          {/* Details Form */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Details</h3>
            <form onSubmit={handleSOS} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <User size={14} /> Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter your name"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Phone size={14} /> Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <AlertTriangle size={14} /> Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the emergency..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              {/* Location display */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <MapPin size={16} className="text-red-500" />
                {locationLoading ? (
                  <span className="text-sm text-gray-500">Getting location...</span>
                ) : (
                  <span className="text-sm text-gray-700">
                    {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={getLocation}
                  className="ml-auto text-red-600 hover:text-red-700 cursor-pointer"
                >
                  <Navigation size={16} />
                </button>
              </div>

              <button type="submit" disabled={isLoading} className="btn-danger w-full py-3">
                {isLoading ? 'Sending SOS...' : 'Send Emergency Alert'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Map + Hospitals */}
        <div className="space-y-6">
          {/* Map */}
          <div className="card p-0 overflow-hidden h-80 lg:h-96">
            {locationLoading ? (
              <LoadingSpinner text="Loading map..." />
            ) : (
              <MapView center={location} markers={hospitalMarkers} zoom={14} />
            )}
          </div>

          {/* Nearest Hospitals */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-red-500" />
              Nearest Hospitals
            </h3>
            {nearestHospitals.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hospitals found nearby
              </p>
            ) : (
              <div className="space-y-3">
                {nearestHospitals.map((hospital, idx) => (
                  <div
                    key={hospital._id || idx}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {hospital.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {hospital.distance || '---'} km away · {hospital.beds?.available || 0} beds
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
