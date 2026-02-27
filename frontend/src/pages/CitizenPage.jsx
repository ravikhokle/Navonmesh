import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Siren,
  MapPin,
  Phone,
  User,
  Building2,
  Navigation,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Clock,
  Radio,
  RadioTower,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'react-toastify';
import useEmergencyStore from '../stores/emergencyStore';
import useLocationStore from '../stores/locationStore';
import socket, { connectSocket } from '../lib/socket';
import LiveMap from '../components/common/LiveMap';
import LoadingSpinner from '../components/common/LoadingSpinner';
import VoiceInput from '../components/common/VoiceInput';

// ── Status display config ────────────────────────────────────────────────────
const STATUS_INFO = {
  pending: {
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
    label: 'Awaiting Dispatch',
    desc: 'ERS is reviewing your emergency and will assign an ambulance shortly.',
  },
  assigned: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Truck,
    label: 'Ambulance Dispatched',
    desc: 'An ambulance has been dispatched and is heading to your location.',
  },
  en_route: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Truck,
    label: 'Ambulance En Route',
    desc: 'Ambulance is on the way to you. Stay at your location.',
  },
  hospital_notified: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Building2,
    label: 'Hospital Notified',
    desc: 'Hospital has been alerted and is preparing for your arrival.',
  },
  picked_up: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: ArrowRight,
    label: 'Patient Picked Up',
    desc: 'You are being transported to the hospital.',
  },
  completed: {
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
    label: 'Emergency Completed',
    desc: 'Your emergency has been resolved. Stay safe!',
  },
};

// ── Route color per phase ────────────────────────────────────────────────────
const ROUTE_COLOR_TO_PATIENT  = '#1a73e8'; // blue  — ambulance → patient
const ROUTE_COLOR_TO_HOSPITAL = '#0f9d58'; // green — ambulance → hospital

export default function CitizenPage() {
  const [form, setForm] = useState({ name: '', phone: '', description: '' });
  const [myLocation, setMyLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [nearestHospitals, setNearestHospitals] = useState([]);

  // For live tracking after SOS
  const [trackedEmergency, setTrackedEmergency] = useState(null);
  const shareWatchRef = useRef(null);

  const { createSOS, isLoading } = useEmergencyStore();
  const { liveLocations, updateLocation, fetchLiveLocations, removeLocation } = useLocationStore();

  // ── Get own location ──────────────────────────────────────────────────────
  const getLocation = useCallback(() => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      setMyLocation({ lat: 28.6139, lng: 77.209 });
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
        // Fetch nearby hospitals from emergencyStore-level API (non-store local call)
        import('../lib/axios').then(({ default: api }) => {
          api.get(`/citizen/hospitals/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
            .then(({ data }) => setNearestHospitals(data))
            .catch(() => {});
        });
      },
      () => {
        setMyLocation({ lat: 28.6139, lng: 77.209 });
        setLocationLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // ── Socket: connect + listen ──────────────────────────────────────────────
  useEffect(() => {
    connectSocket();
    fetchLiveLocations(); // hydrate store from REST cache

    // Forward all location pings to the global store
    const handleLocationUpdate = (data) => updateLocation(data);

    // When ERS updates the emergency (assignment, status change)
    const handleEmergencyUpdated = (data) => {
      setTrackedEmergency((prev) => {
        if (!prev || prev._id !== data._id) return prev;
        // Notify citizen of status change
        const info = STATUS_INFO[data.status];
        if (info && data.status !== prev.status) {
          toast.info(`🚑 ${info.label}: ${info.desc}`, { autoClose: 9000 });
        }
        return data;
      });
    };

    const handleLocationCleared = (data) => removeLocation(data?.userId);

    socket.on('location-update', handleLocationUpdate);
    socket.on('emergency-updated', handleEmergencyUpdated);
    socket.on('location-cleared', handleLocationCleared);

    return () => {
      socket.off('location-update', handleLocationUpdate);
      socket.off('emergency-updated', handleEmergencyUpdated);
      socket.off('location-cleared', handleLocationCleared);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SOS submit ───────────────────────────────────────────────────────────
  const handleSOS = async (e) => {
    e?.preventDefault();
    if (!myLocation) { toast.error('Location not available'); return; }
    try {
      const emergency = await createSOS({
        ...form,
        location: { lat: myLocation.lat, lng: myLocation.lng },
      });
      if (emergency) {
        setTrackedEmergency(emergency);
        // Join emergency socket room for targeted updates
        socket.emit('join-emergency', emergency._id);
      }
    } catch { /* already toasted */ }
  };

  // ── Share live location (citizen) ─────────────────────────────────────────
  const toggleShareLocation = () => {
    if (sharingLocation) {
      // Stop sharing
      if (shareWatchRef.current !== null) {
        navigator.geolocation.clearWatch(shareWatchRef.current);
        shareWatchRef.current = null;
      }
      setSharingLocation(false);
      toast.info('Location sharing stopped');
    } else {
      // Start sharing
      if (!navigator.geolocation) {
        toast.error('Geolocation not supported on this device');
        return;
      }
      setSharingLocation(true);
      const userId = trackedEmergency ? `citizen-${trackedEmergency._id}` : `citizen-anon-${Date.now()}`;
      shareWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMyLocation({ lat, lng }); // keep local state fresh too
          socket.emit('update-location', {
            userId,
            role: 'citizen',
            name: form.name || trackedEmergency?.citizenName || 'Patient',
            lat,
            lng,
          });
        },
        (err) => {
          console.warn('Share location error:', err.message);
          setSharingLocation(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
      toast.success('📡 Sharing your live location with emergency services');
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (shareWatchRef.current !== null) {
        navigator.geolocation.clearWatch(shareWatchRef.current);
      }
    };
  }, []);

  // ── Compute map markers + routes ──────────────────────────────────────────
  const { mapMarkers, mapRoutes, ambulanceName, hospitalName } = useMemo(() => {
    const marks = [];
    const rts = [];
    let ambulanceName = null;
    let hospitalName  = null;

    if (!trackedEmergency) {
      // Pre-SOS — show patient position + nearby hospitals
      if (myLocation) marks.push({ type: 'self', lat: myLocation.lat, lng: myLocation.lng, label: 'Your Location' });
      nearestHospitals.forEach((h) => {
        if (h.location?.coordinates) {
          marks.push({ type: 'hospital', lat: h.location.coordinates[1], lng: h.location.coordinates[0], label: h.name });
        }
      });
      return { mapMarkers: marks, mapRoutes: rts, ambulanceName, hospitalName };
    }

    // Post-SOS:

    // 1. Patient location (from emergency.location OR live myLocation if sharing)
    const patLat = myLocation?.lat ?? trackedEmergency.location?.coordinates?.[1];
    const patLng = myLocation?.lng ?? trackedEmergency.location?.coordinates?.[0];
    if (patLat != null) marks.push({ type: 'emergency', lat: patLat, lng: patLng, label: 'Your Location' });

    // 2. Ambulance position: prefer live socket, fall back to DB currentLocation
    const ambId   = trackedEmergency.assignedAmbulance?._id ?? trackedEmergency.assignedAmbulance;
    const liveLoc = ambId ? liveLocations[ambId] : null;
    const ambDbLoc = trackedEmergency.assignedAmbulance?.currentLocation;
    let ambLat = liveLoc?.lat ?? ambDbLoc?.coordinates?.[1];
    let ambLng = liveLoc?.lng ?? ambDbLoc?.coordinates?.[0];
    ambulanceName = trackedEmergency.assignedAmbulance?.name ?? null;
    if (ambLat != null) marks.push({ type: 'ambulance', lat: ambLat, lng: ambLng, label: `Ambulance${ambulanceName ? `: ${ambulanceName}` : ''}` });

    // 3. Hospital position
    const hosp     = trackedEmergency.assignedHospital;
    const hospLat  = hosp?.location?.coordinates?.[1];
    const hospLng  = hosp?.location?.coordinates?.[0];
    hospitalName   = hosp?.name ?? null;
    if (hospLat != null) marks.push({ type: 'hospital', lat: hospLat, lng: hospLng, label: hosp.name });

    // 4. Routes based on emergency status
    const status = trackedEmergency.status;
    if (status === 'assigned' || status === 'en_route' || status === 'hospital_notified') {
      // Ambulance → Patient
      if (ambLat != null && patLat != null) {
        rts.push({
          origin:      { lat: ambLat, lng: ambLng },
          destination: { lat: patLat, lng: patLng },
          color: ROUTE_COLOR_TO_PATIENT,
        });
      }
    } else if (status === 'picked_up') {
      // Ambulance → Hospital
      if (ambLat != null && hospLat != null) {
        rts.push({
          origin:      { lat: ambLat, lng: ambLng },
          destination: { lat: hospLat, lng: hospLng },
          color: ROUTE_COLOR_TO_HOSPITAL,
        });
      }
    }

    return { mapMarkers: marks, mapRoutes: rts, ambulanceName, hospitalName };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedEmergency, myLocation, nearestHospitals, JSON.stringify(liveLocations)]);

  const statusInfo = trackedEmergency ? STATUS_INFO[trackedEmergency.status] : null;
  const StatusIcon = statusInfo?.icon ?? Clock;
  const isCompleted = trackedEmergency?.status === 'completed';

  // ════════════════════════════════════════════════════════════════════════════
  // POST-SOS TRACKING VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (trackedEmergency) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">

        {/* ── Status Banner ── */}
        <div className={`card border rounded-xl p-4 flex items-start gap-4 ${statusInfo?.color ?? 'bg-gray-50'}`}>
          <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
            <StatusIcon size={24} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{statusInfo?.label ?? trackedEmergency.status}</p>
            <p className="text-sm mt-0.5 opacity-80">{statusInfo?.desc}</p>
          </div>
          {isCompleted && (
            <button
              onClick={() => setTrackedEmergency(null)}
              className="text-sm bg-white/50 hover:bg-white/80 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>

        {/* ── Share Live Location ── */}
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {sharingLocation
              ? <RadioTower size={22} className="text-emerald-600 animate-pulse" />
              : <Radio size={22} className="text-gray-400" />}
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {sharingLocation ? '📡 Sharing live location' : 'Share your live location'}
              </p>
              <p className="text-xs text-gray-500">
                {sharingLocation
                  ? 'Emergency services can see your exact position in real-time'
                  : 'Help the ambulance driver find you faster'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleShareLocation}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 cursor-pointer flex-shrink-0 ${sharingLocation ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${sharingLocation ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* ── Live Map ── */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Navigation size={16} className="text-red-600" />
            Live Tracking
            {sharingLocation && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping inline-block" />
                GPS Live
              </span>
            )}
          </h3>
          {/* Route phase label */}
          {mapRoutes.length > 0 && (
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              {trackedEmergency.status === 'picked_up'
                ? <><ArrowRight size={12} className="text-emerald-600" /> Ambulance heading to hospital</>
                : <><ArrowRight size={12} className="text-blue-600" /> Ambulance heading to your location</>}
            </p>
          )}
          <LiveMap
            markers={mapMarkers}
            routes={mapRoutes}
            height="320px"
            zoom={mapMarkers.length > 1 ? 13 : 11}
          />
        </div>

        {/* ── Details row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ambulanceName && (
            <div className="card flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Truck size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Assigned Ambulance</p>
                <p className="font-semibold text-gray-900">{ambulanceName}</p>
              </div>
            </div>
          )}
          {hospitalName && (
            <div className="card flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Assigned Hospital</p>
                <p className="font-semibold text-gray-900">{hospitalName}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Emergency reference ── */}
        <div className="card bg-gray-50 text-xs text-gray-400 flex gap-2 items-center">
          <MapPin size={12} />
          Emergency ID: {trackedEmergency._id}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRE-SOS FORM VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: SOS Form ── */}
        <div className="space-y-6">
          {/* SOS Button */}
          <div className="card text-center">
            <button
              onClick={handleSOS}
              disabled={isLoading || !myLocation}
              className="group relative w-40 h-40 mx-auto rounded-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:bg-gray-300 transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 cursor-pointer"
            >
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
              <div className="relative flex flex-col items-center justify-center text-white">
                <Siren size={40} />
                <span className="text-lg font-bold mt-1">SOS</span>
              </div>
            </button>
            <p className="mt-4 text-sm text-gray-500">Fill your details below, then press SOS</p>
          </div>

          {/* Details Form */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Details</h3>
            <form onSubmit={handleSOS} className="space-y-4">

              {/* ── Voice Fill — top of form ── */}
              <VoiceInput
                onFieldsFilled={(fields) =>
                  setForm((prev) => ({
                    name:        fields.name        || prev.name,
                    phone:       fields.phone       || prev.phone,
                    description: fields.description || prev.description,
                  }))
                }
                disabled={isLoading}
              />

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
                  placeholder="Describe the emergency…"
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              {/* Location row */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <MapPin size={16} className="text-red-500 flex-shrink-0" />
                {locationLoading ? (
                  <span className="text-sm text-gray-500">Getting location…</span>
                ) : (
                  <span className="text-sm text-gray-700">
                    {myLocation?.lat.toFixed(4)}, {myLocation?.lng.toFixed(4)}
                  </span>
                )}
                <button type="button" onClick={getLocation} className="ml-auto text-red-600 hover:text-red-700 cursor-pointer">
                  <Navigation size={16} />
                </button>
              </div>

              <button type="submit" disabled={isLoading || !myLocation} className="btn-danger w-full py-3">
                {isLoading ? 'Sending SOS…' : 'Send Emergency Alert'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: Map + Hospitals ── */}
        <div className="space-y-6">
          {/* Map */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Navigation size={16} className="text-red-600" />
              Your Location &amp; Nearby Hospitals
            </h3>
            {locationLoading ? (
              <div className="h-60 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <LiveMap
                markers={mapMarkers}
                height="260px"
                zoom={14}
                center={myLocation}
              />
            )}
          </div>

          {/* Nearest Hospitals */}
          {nearestHospitals.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-red-500" />
                Nearest Hospitals
              </h3>
              <div className="space-y-3">
                {nearestHospitals.map((hospital, idx) => (
                  <div key={hospital._id ?? idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{hospital.name}</p>
                      <p className="text-xs text-gray-500">
                        {hospital.availableBeds ?? 0} beds available
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
