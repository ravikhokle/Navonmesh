import { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import playAlertSound from '../lib/alertAudio';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Siren,
  Navigation,
} from 'lucide-react';
import useTrafficStore from '../stores/trafficStore';
import useLocationStore from '../stores/locationStore';
import socket, { connectSocket } from '../lib/socket';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LiveMap from '../components/common/LiveMap';
import { useSearch } from '../lib/SearchContext';

export default function TrafficDashboard() {
  const {
    isOnDuty,
    activeAlerts,
    fetchDutyStatus,
    toggleDuty,
    fetchAlerts,
    clearRoute,
    addAlert,
    isLoading,
  } = useTrafficStore();

  const { liveLocations, updateLocation, fetchLiveLocations, removeLocation } = useLocationStore();

  const [myLocation, setMyLocation] = useState(null);
  const watchIdRef = useRef(null);

  // Read auth user from localStorage for socket payloads
  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('emergex_user');
      return raw && raw !== 'undefined' ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // ── Socket + initial data ──
  useEffect(() => {
    fetchDutyStatus();
    fetchAlerts();
    fetchLiveLocations();
    connectSocket();

    socket.on('traffic-alert', (data) => {
      // Only respond if this alert is for the current user
      if (data.trafficId === authUser?._id) {
        fetchAlerts();
        playAlertSound();
        toast.warning('🚦 New emergency route alert!', { autoClose: 8000 });
      }
    });
    socket.on('emergency-updated', () => fetchAlerts());

    // Real-time: ambulance status changes
    socket.on('status-changed', ({ status }) => {
      fetchAlerts();
      const labels = { en_route: 'Ambulance en route', picked_up: 'Patient picked up', hospital_notified: 'Arrived at hospital', completed: 'Emergency completed' };
      toast.info(`🚑 ${labels[status] || status}`, { autoClose: 6000 });
    });

    // Real-time: priority changed
    socket.on('priority-changed', () => {
      fetchAlerts();
      toast.warning('⚠️ Emergency priority updated!', { autoClose: 5000 });
    });

    socket.on('location-update', updateLocation);
    socket.on('location-cleared', (data) => removeLocation(data?.userId));

    return () => {
      socket.off('traffic-alert');
      socket.off('emergency-updated');
      socket.off('status-changed');
      socket.off('priority-changed');
      socket.off('location-update');
      socket.off('location-cleared');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GPS tracking: start when on duty, stop when off ──
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

          // Broadcast live position to ERS and all connected clients
          socket.emit('update-location', {
            userId: authUser?._id ?? authUser?.id,
            role: 'traffic',
            name: authUser?.name ?? 'Traffic Officer',
            lat,
            lng,
          });
        },
        (err) => console.warn('Geolocation error:', err.message),
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

  const { searchQuery } = useSearch();

  // ── Derived state ──
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return activeAlerts;
    const q = searchQuery.toLowerCase();
    return activeAlerts.filter((a) =>
      (a.citizenName || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.status || '').toLowerCase().includes(q) ||
      (a.priority || '').toLowerCase().includes(q)
    );
  }, [activeAlerts, searchQuery]);

  const pendingAlerts = searchFiltered.filter((a) => !a.routeCleared);
  const clearedAlerts = searchFiltered.filter((a) => a.routeCleared);

  // ── Map markers ──
  const mapMarkers = useMemo(() => {
    const markers = [];
    if (myLocation) {
      markers.push({ type: 'self', lat: myLocation.lat, lng: myLocation.lng, label: 'My Location' });
    }
    pendingAlerts.forEach((alert) => {
      if (alert.location?.coordinates) {
        markers.push({
          type: 'emergency',
          lat: alert.location.coordinates[1],
          lng: alert.location.coordinates[0],
          label: `${alert.citizenName ?? 'Emergency'} — ${alert.priority ?? 'N/A'}`,
        });
      }
    });
    return markers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLocation, JSON.stringify(pendingAlerts)]);

  // ── Routes: ambulance → patient or ambulance → hospital ──
  const mapRoutes = useMemo(() => {
    const routes = [];
    pendingAlerts.forEach((alert) => {
      const ambId = alert.assignedAmbulance?._id;
      if (!ambId) return;
      const live = liveLocations[ambId]; // live only — no DB fallback
      if (!live?.lat) return;
      const origin = { lat: live.lat, lng: live.lng };
      if (['assigned', 'en_route'].includes(alert.status) && alert.location?.coordinates) {
        routes.push({
          origin,
          destination: { lat: alert.location.coordinates[1], lng: alert.location.coordinates[0] },
          color: '#1a73e8',
        });
      } else if (alert.status === 'picked_up' && alert.assignedHospital?.location?.coordinates) {
        routes.push({
          origin,
          destination: {
            lat: alert.assignedHospital.location.coordinates[1],
            lng: alert.assignedHospital.location.coordinates[0],
          },
          color: '#0f9d58',
        });
      }
    });
    return routes;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pendingAlerts), liveLocations]);

  if (isLoading && activeAlerts.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* ── Duty Top Bar ── */}
      <div className={`card flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${isOnDuty ? 'ring-2 ring-emerald-400/50 shadow-emerald-100' : ''}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isOnDuty ? 'bg-emerald-50' : 'bg-gray-100'}`}>
            {isOnDuty ? <ShieldCheck size={28} className="text-emerald-600" /> : <ShieldOff size={28} className="text-gray-400" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Traffic Control</h2>
            <p className={`text-sm font-medium ${isOnDuty ? 'text-emerald-600' : 'text-gray-500'}`}>
              {isOnDuty
                ? myLocation
                  ? '📡 On Duty — Sharing live location'
                  : 'On Duty — Receiving Alerts'
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
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shadow-sm shadow-amber-100">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendingAlerts.length}</p>
            <p className="text-xs text-gray-500 font-medium">Pending Alerts</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm shadow-emerald-100">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{clearedAlerts.length}</p>
            <p className="text-xs text-gray-500 font-medium">Cleared</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shadow-sm shadow-blue-100">
            <Shield size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
            <p className="text-xs text-gray-500 font-medium">Total Assigned</p>
          </div>
        </div>
      </div>

      {/* ── Live Map ── */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Navigation size={16} className="text-amber-600" />
          Live Map — Emergency Routes
          {myLocation && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping inline-block" />
              GPS Active
            </span>
          )}
        </h3>
        <LiveMap
          markers={mapMarkers}
          routes={mapRoutes}
          height="300px"
          zoom={mapMarkers.length > 0 ? 13 : 11}
        />
        {!isOnDuty && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Go on duty to start sharing your live location
          </p>
        )}
      </div>

      {/* ── Pending Alerts ── */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Siren size={18} className="text-amber-500" />
          Pending Route Clears
          {pendingAlerts.length > 0 && (
            <span className="ml-auto badge-critical">{pendingAlerts.length}</span>
          )}
        </h3>

        {pendingAlerts.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 size={40} className="mx-auto text-emerald-300 mb-3" />
            <p className="text-gray-500">All routes cleared — good job!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAlerts.map((alert, idx) => (
              <div
                key={alert._id ?? idx}
                className="border border-amber-200 bg-amber-50/40 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p className="font-medium text-gray-900">{alert.citizenName ?? 'Emergency'}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      alert.priority === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : alert.priority === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {alert.priority?.toUpperCase() ?? 'N/A'}
                  </span>
                </div>
                {alert.description && (
                  <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                )}
                {alert.location?.coordinates && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <MapPin size={12} />
                    {alert.location.coordinates[1].toFixed(5)},{' '}
                    {alert.location.coordinates[0].toFixed(5)}
                  </p>
                )}
                <button
                  onClick={() => clearRoute(alert._id)}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
                >
                  <CheckCircle2 size={14} />
                  Mark Route Cleared
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Cleared Routes ── */}
      {clearedAlerts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw size={18} className="text-emerald-500" />
            Cleared Routes
          </h3>
          <div className="space-y-2">
            {clearedAlerts.map((alert, idx) => (
              <div
                key={alert._id ?? idx}
                className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-sm text-gray-700">{alert.citizenName ?? 'Emergency'}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {alert.updatedAt
                    ? new Date(alert.updatedAt).toLocaleTimeString()
                    : 'Cleared'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
