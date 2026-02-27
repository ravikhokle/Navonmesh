import { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Truck,
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ArrowRight,
  Building2,
  Shield,
  ShieldOff,
  Navigation,
} from 'lucide-react';
import useAmbulanceStore from '../stores/ambulanceStore';
import socket, { connectSocket } from '../lib/socket';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LiveMap from '../components/common/LiveMap';

export default function AmbulanceDashboard() {
  const {
    assignedEmergencies,
    isOnDuty,
    fetchAssignedEmergencies,
    updateEmergencyStatus,
    toggleDuty,
    addAssignment,
    updateEmergency,
    isLoading,
  } = useAmbulanceStore();

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
    fetchAssignedEmergencies();
    connectSocket();

    socket.on('emergency-updated', (data) => {
      updateEmergency(data);
      toast.info('📍 Emergency status updated', { autoClose: 4000 });
    });

    socket.on('ambulance-assigned', (data) => {
      addAssignment(data);
      toast.success('🚨 New emergency assigned to you!', { autoClose: 8000 });
    });

    return () => {
      socket.off('emergency-updated');
      socket.off('ambulance-assigned');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GPS tracking: start when on duty, stop when off ──
  useEffect(() => {
    // Clear any existing watch first
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
            role: 'ambulance',
            name: authUser?.name ?? 'Ambulance',
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

  // ── Derived state ──
  const activeEmergency = assignedEmergencies.find(
    (e) => e.status !== 'completed' && e.status !== 'cancelled'
  );
  const currentStatus = activeEmergency?.status || 'assigned';
  const statusFlow = [
    { key: 'en_route',  label: 'En Route',        icon: ArrowRight,  color: 'blue'   },
    { key: 'picked_up', label: 'Picked Up',        icon: User,        color: 'purple' },
    { key: 'completed', label: 'Reached Hospital', icon: Building2,   color: 'green'  },
  ];
  const currentIndex = statusFlow.findIndex((s) => s.key === currentStatus);

  // ── Map markers ──
  const mapMarkers = useMemo(() => {
    const markers = [];
    if (myLocation) {
      markers.push({ type: 'self', lat: myLocation.lat, lng: myLocation.lng, label: 'My Location' });
    }
    if (activeEmergency?.location?.coordinates) {
      markers.push({
        type: 'emergency',
        lat: activeEmergency.location.coordinates[1],
        lng: activeEmergency.location.coordinates[0],
        label: `Patient: ${activeEmergency.citizenName ?? 'Unknown'}`,
      });
    }
    return markers;
  }, [myLocation, activeEmergency]);

  if (isLoading && assignedEmergencies.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ── Duty Toggle ── */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isOnDuty ? 'bg-emerald-50' : 'bg-gray-100'}`}>
              {isOnDuty ? <Shield size={28} className="text-emerald-600" /> : <ShieldOff size={28} className="text-gray-400" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{isOnDuty ? 'On Duty' : 'Off Duty'}</h3>
              <p className="text-sm text-gray-500">
                {isOnDuty
                  ? myLocation
                    ? `📡 Sharing live location`
                    : 'Available for dispatch'
                  : 'Not receiving assignments'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDuty}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 cursor-pointer ${isOnDuty ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${isOnDuty ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* ── Live Map ── */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Navigation size={16} className="text-blue-600" />
          Live Map
          {myLocation && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping inline-block" />
              GPS Active
            </span>
          )}
        </h3>
        <LiveMap
          markers={mapMarkers}
          height="300px"
          zoom={mapMarkers.length > 0 ? 14 : 11}
        />
        {!isOnDuty && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Go on duty to start sharing your live location
          </p>
        )}
      </div>

      {/* ── Ambulance Status ── */}
      <div className="card text-center">
        <div className="w-20 h-20 mx-auto bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <Truck size={36} className="text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Ambulance Status</h3>
        <StatusBadge status={currentStatus} className="text-sm px-4 py-1.5" />
      </div>

      {/* ── Status Flow (only when active emergency) ── */}
      {activeEmergency && (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Update Status</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            {statusFlow.map(({ key, label, icon: StatusIcon, color }, idx) => {
              const isActive = currentStatus === key;
              const isPast   = idx < currentIndex;
              const isNext   = idx === currentIndex + 1 || (currentIndex === -1 && idx === 0);
              const disabled = !isNext && !isActive;

              const colors = {
                blue:   'bg-blue-600 hover:bg-blue-700',
                purple: 'bg-purple-600 hover:bg-purple-700',
                green:  'bg-emerald-600 hover:bg-emerald-700',
              };

              return (
                <button
                  key={key}
                  onClick={() => updateEmergencyStatus(activeEmergency._id, key)}
                  disabled={disabled}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                    isActive
                      ? `${colors[color]} text-white shadow-lg`
                      : isPast
                      ? 'bg-gray-100 text-gray-400'
                      : isNext
                      ? `${colors[color]} text-white opacity-90 hover:opacity-100`
                      : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isPast ? <CheckCircle2 size={18} /> : <StatusIcon size={18} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Emergency Details ── */}
      {activeEmergency ? (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Emergency</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{activeEmergency.citizenName || 'Patient'}</p>
                {activeEmergency.citizenPhone && (
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Phone size={12} />
                    {activeEmergency.citizenPhone}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <MapPin size={12} /> Location
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {activeEmergency.location?.coordinates
                    ? `${activeEmergency.location.coordinates[1]?.toFixed(4)}, ${activeEmergency.location.coordinates[0]?.toFixed(4)}`
                    : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Clock size={12} /> Time
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {activeEmergency.createdAt
                    ? new Date(activeEmergency.createdAt).toLocaleTimeString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {activeEmergency.assignedHospital && (
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Building2 size={12} /> Destination Hospital
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {activeEmergency.assignedHospital.name || 'Assigned'}
                </p>
              </div>
            )}

            {activeEmergency.description && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{activeEmergency.description}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Truck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No emergency assigned</p>
          <p className="text-sm text-gray-400 mt-1">Waiting for dispatch…</p>
        </div>
      )}

      {/* ── Completed Emergencies ── */}
      {assignedEmergencies.filter((e) => e.status === 'completed').length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Completed</h4>
          <div className="space-y-3">
            {assignedEmergencies
              .filter((e) => e.status === 'completed')
              .map((e) => (
                <div key={e._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{e.citizenName}</p>
                    <p className="text-xs text-gray-500">
                      {e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <StatusBadge status="completed" />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
