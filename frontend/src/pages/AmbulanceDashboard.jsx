import { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Truck,
  ShieldCheck,
  ShieldOff,
  Navigation,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
} from 'lucide-react';
import useAmbulanceStore from '../stores/ambulanceStore';
import useLocationStore from '../stores/locationStore';
import socket, { connectSocket } from '../lib/socket';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LiveMap from '../components/common/LiveMap';
import StatusBadge from '../components/common/StatusBadge';
import { useSearch } from '../lib/SearchContext';

// Next-status map for the action button
const STATUS_NEXT = {
  assigned:          { next: 'en_route',          label: 'Start Route →' },
  en_route:          { next: 'picked_up',          label: '🏥 Patient Picked Up' },
  picked_up:         { next: 'hospital_notified',  label: '✅ Arrived at Hospital' },
  hospital_notified: { next: 'completed',          label: 'Mark Complete' },
};

export default function AmbulanceDashboard() {
  const {
    isOnDuty,
    assignedEmergencies,
    fetchAssignedEmergencies,
    toggleDuty,
    updateEmergencyStatus,
    addAssignment,
    updateEmergency,
    isLoading,
  } = useAmbulanceStore();

  const { liveLocations, updateLocation, fetchLiveLocations, removeLocation } = useLocationStore();

  const [myLocation, setMyLocation] = useState(null);
  const watchIdRef = useRef(null);

  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('emergex_user');
      return raw && raw !== 'undefined' ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Active (non-completed) emergency — first one found
  const activeEmergency = useMemo(
    () => assignedEmergencies.find((e) => e.status !== 'completed') ?? null,
    [assignedEmergencies]
  );

  // ── Socket + initial data ──
  useEffect(() => {
    fetchAssignedEmergencies();
    fetchLiveLocations();
    connectSocket();

    socket.on('ambulance-assigned', (data) => {
      addAssignment(data);
      toast.info('🚑 New emergency assigned!', { autoClose: 8000 });
    });
    socket.on('emergency-updated', (data) => {
      updateEmergency(data);
    });

    // Real-time: hospital accepted/rejected patient
    socket.on('hospital-response', ({ emergency, response }) => {
      updateEmergency(emergency);
      const icon = response === 'accepted' ? '✅' : '❌';
      toast.info(`${icon} Hospital ${response} the patient`, { autoClose: 6000 });
    });

    // Real-time: route cleared by traffic police
    socket.on('route-cleared', () => {
      fetchAssignedEmergencies();
      toast.success('🚦 Route has been cleared!', { autoClose: 5000 });
    });

    // Real-time: priority changed
    socket.on('priority-changed', (data) => {
      updateEmergency(data);
      toast.warning(`⚠️ Priority updated to ${data.priority}`, { autoClose: 5000 });
    });

    socket.on('location-update', updateLocation);
    socket.on('location-cleared', (data) => removeLocation(data?.userId));

    return () => {
      socket.off('ambulance-assigned');
      socket.off('emergency-updated');
      socket.off('hospital-response');
      socket.off('route-cleared');
      socket.off('priority-changed');
      socket.off('location-update');
      socket.off('location-cleared');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GPS watchPosition — start on duty, stop off duty ──
  useEffect(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (isOnDuty && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMyLocation({ lat, lng });
          socket.emit('update-location', {
            userId: authUser?._id ?? authUser?.id,
            role: 'ambulance',
            name: authUser?.name ?? 'Ambulance',
            lat,
            lng,
          });
        },
        (err) => console.warn('Geolocation:', err.message),
        { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 }
      );
    } else {
      setMyLocation(null);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOnDuty, authUser]);

  // ── Stop GPS + clear server cache when ambulance reaches hospital ──
  useEffect(() => {
    const terminalStatuses = ['hospital_notified', 'completed'];
    if (activeEmergency && terminalStatuses.includes(activeEmergency.status)) {
      // Kill GPS watch so no more location pings are emitted
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setMyLocation(null);
      // Notify server (and all connected clients) to remove this ambulance from the map
      const uid = authUser?._id ?? authUser?.id;
      if (uid) {
        socket.emit('clear-location', { userId: uid });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmergency?.status]);

  // ── Map markers + routes based on active emergency status ──
  const { mapMarkers, mapRoutes } = useMemo(() => {
    const markers = [];
    const routes = [];

    if (myLocation) {
      markers.push({ type: 'self', lat: myLocation.lat, lng: myLocation.lng, label: 'My Location' });
    }

    if (activeEmergency) {
      const patLat = activeEmergency.location?.coordinates?.[1];
      const patLng = activeEmergency.location?.coordinates?.[0];
      if (patLat != null) {
        markers.push({
          type: 'emergency',
          lat: patLat,
          lng: patLng,
          label: `Patient: ${activeEmergency.citizenName ?? 'Unknown'}`,
        });
      }

      const hosp = activeEmergency.assignedHospital;
      const hospLat = hosp?.location?.coordinates?.[1];
      const hospLng = hosp?.location?.coordinates?.[0];
      if (hospLat != null) {
        markers.push({ type: 'hospital', lat: hospLat, lng: hospLng, label: hosp.name ?? 'Hospital' });
      }

      // Routes — choose phase based on status
      if (myLocation) {
        const st = activeEmergency.status;
        if (['assigned', 'en_route', 'hospital_notified'].includes(st) && patLat != null) {
          routes.push({
            origin: myLocation,
            destination: { lat: patLat, lng: patLng },
            color: '#1a73e8',
          });
        } else if (st === 'picked_up' && hospLat != null) {
          routes.push({
            origin: myLocation,
            destination: { lat: hospLat, lng: hospLng },
            color: '#0f9d58',
          });
        }
      }
    }

    return { mapMarkers: markers, mapRoutes: routes };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLocation, activeEmergency, liveLocations]);

  const { searchQuery } = useSearch();

  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return assignedEmergencies;
    const q = searchQuery.toLowerCase();
    return assignedEmergencies.filter((e) =>
      (e.citizenName || '').toLowerCase().includes(q) ||
      (e.citizenPhone || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.status || '').toLowerCase().includes(q) ||
      (e.priority || '').toLowerCase().includes(q)
    );
  }, [assignedEmergencies, searchQuery]);

  const completed = searchFiltered.filter((e) => e.status === 'completed');
  const active    = searchFiltered.filter((e) => e.status !== 'completed');

  if (isLoading && assignedEmergencies.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* ── Duty Toggle ── */}
      <div className={`card flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${isOnDuty ? 'ring-2 ring-emerald-400/50 shadow-emerald-100' : ''}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isOnDuty ? 'bg-emerald-50' : 'bg-gray-100'}`}>
            {isOnDuty
              ? <ShieldCheck size={28} className="text-emerald-600" />
              : <ShieldOff size={28} className="text-gray-400" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ambulance Dashboard</h2>
            <p className={`text-sm font-medium ${isOnDuty ? 'text-emerald-600' : 'text-gray-500'}`}>
              {isOnDuty
                ? myLocation
                  ? '📡 On Duty — Sharing live location'
                  : 'On Duty — Acquiring GPS…'
                : 'Off Duty'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleDuty}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${
            isOnDuty
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shadow-sm shadow-red-100">
            <AlertTriangle size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{active.length}</p>
            <p className="text-xs text-gray-500 font-medium">Active</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm shadow-emerald-100">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{completed.length}</p>
            <p className="text-xs text-gray-500 font-medium">Completed</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shadow-sm shadow-blue-100">
            <Truck size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{assignedEmergencies.length}</p>
            <p className="text-xs text-gray-500 font-medium">Total Assigned</p>
          </div>
        </div>
      </div>

      {/* ── Live Navigation Map ── */}
      {activeEmergency && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Navigation size={16} className="text-blue-600" />
              Live Navigation
              {myLocation && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping inline-block" />
                  GPS Active
                </span>
              )}
            </h3>
            <span className="text-xs text-gray-400">
              {activeEmergency.status === 'picked_up'
                ? '🟢 Route to Hospital'
                : '🔵 Route to Patient'}
            </span>
          </div>
          <LiveMap markers={mapMarkers} routes={mapRoutes} height="320px" zoom={13} />
          {!isOnDuty && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Go on duty to start live GPS sharing
            </p>
          )}
        </div>
      )}

      {/* ── Active Emergency Card ── */}
      {activeEmergency ? (
        <div className="card border-2 border-red-200 bg-red-50/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {activeEmergency.citizenName ?? 'Unknown Patient'}
                </p>
                {activeEmergency.citizenPhone && (
                  <p className="text-sm text-gray-500">{activeEmergency.citizenPhone}</p>
                )}
              </div>
            </div>
            <StatusBadge status={activeEmergency.status} />
          </div>

          {activeEmergency.description && (
            <p className="text-sm text-gray-600 mb-3">{activeEmergency.description}</p>
          )}

          {activeEmergency.location?.coordinates && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
              <MapPin size={12} />
              Patient: {activeEmergency.location.coordinates[1].toFixed(5)},{' '}
              {activeEmergency.location.coordinates[0].toFixed(5)}
            </p>
          )}

          {activeEmergency.assignedHospital && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-4">
              <Building2 size={12} />
              Hospital: {activeEmergency.assignedHospital.name}
              {activeEmergency.assignedHospital.city
                ? `, ${activeEmergency.assignedHospital.city}`
                : ''}
            </p>
          )}

          {STATUS_NEXT[activeEmergency.status] && (
            <button
              onClick={() =>
                updateEmergencyStatus(
                  activeEmergency._id,
                  STATUS_NEXT[activeEmergency.status].next
                )
              }
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3"
            >
              {STATUS_NEXT[activeEmergency.status].label}
            </button>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Truck size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500">No active emergencies</p>
          <p className="text-xs text-gray-400 mt-1">Go on duty to receive assignments</p>
        </div>
      )}

      {/* ── Completed Runs ── */}
      {completed.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Completed Runs
          </h3>
          <div className="space-y-2">
            {completed.map((e, idx) => (
              <div
                key={e._id ?? idx}
                className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-sm text-gray-700">{e.citizenName ?? 'Patient'}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {e.updatedAt ? new Date(e.updatedAt).toLocaleTimeString() : 'Done'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
