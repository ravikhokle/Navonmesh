import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  Truck,
  TrafficCone,
  Building2,
  Clock,
  MapPin,
  RefreshCw,
  Phone,
  User,
  Bed,
  ShieldCheck,
  MapPinned,
  Send,
  Siren,
  Circle,
  Navigation,
} from 'lucide-react';
import useEmergencyStore from '../stores/emergencyStore';
import socket, { connectSocket } from '../lib/socket';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LiveMap from '../components/common/LiveMap';

export default function ERSDashboard() {
  const {
    emergencies,
    availableAmbulances,
    availableHospitals,
    availableTrafficUsers,
    fetchEmergencies,
    fetchAvailableAmbulances,
    fetchAvailableHospitals,
    fetchAvailableTrafficUsers,
    assignAmbulance,
    sendTrafficAlert,
    sendHospitalAlert,
    setPriority,
    sendAlertAll,
    addEmergency,
    updateEmergency,
    isLoading,
  } = useEmergencyStore();

  // Live ambulance & traffic positions received via socket
  const [liveLocations, setLiveLocations] = useState({});

  useEffect(() => {
    fetchEmergencies();
    fetchAvailableAmbulances();
    fetchAvailableHospitals();
    fetchAvailableTrafficUsers();
    connectSocket();

    socket.on('new-emergency', (data) => {
      addEmergency(data);
      toast.error('🚨 New emergency received!', { autoClose: 8000 });
    });
    socket.on('emergency-updated', (data) => updateEmergency(data));

    // Real-time: when any driver/officer toggles duty, refresh the lists
    socket.on('duty-changed', (data) => {
      if (data.role === 'ambulance') fetchAvailableAmbulances();
      if (data.role === 'traffic') fetchAvailableTrafficUsers();
      const icon = data.role === 'ambulance' ? '🚑' : '🚦';
      toast.info(
        `${icon} ${data.name} is now ${data.isOnDuty ? 'ON duty' : 'OFF duty'}`,
        { autoClose: 5000 }
      );
    });

    // Real-time: live location pings from ambulance / traffic
    socket.on('location-update', (data) => {
      // data: { userId, role, name, lat, lng }
      if (!data.userId) return;
      setLiveLocations((prev) => ({
        ...prev,
        [data.userId]: { lat: data.lat, lng: data.lng, name: data.name, role: data.role },
      }));
    });

    // Real-time: when a hospital is registered or updated, refresh hospitals list
    socket.on('hospital-added', () => fetchAvailableHospitals());
    socket.on('hospital-updated', () => fetchAvailableHospitals());

    return () => {
      socket.off('new-emergency');
      socket.off('emergency-updated');
      socket.off('duty-changed');
      socket.off('hospital-added');
      socket.off('hospital-updated');
      socket.off('location-update');
    };
  }, []);

  const stats = {
    total: emergencies.length,
    critical: emergencies.filter((e) => e.priority === 'critical').length,
    pending: emergencies.filter((e) => e.status === 'pending').length,
    completed: emergencies.filter((e) => e.status === 'completed').length,
  };

  // ── Map markers: merge DB locations with live socket positions ──
  const mapMarkers = useMemo(() => {
    const markers = [];

    // Emergencies / patient locations (red)
    emergencies.forEach((e) => {
      if (e.location?.coordinates) {
        markers.push({
          type: 'emergency',
          lat: e.location.coordinates[1],
          lng: e.location.coordinates[0],
          label: `${e.citizenName ?? 'Emergency'} (${e.priority ?? ''})`,
        });
      }
    });

    // Hospitals (green)
    availableHospitals.forEach((h) => {
      if (h.location?.coordinates) {
        markers.push({
          type: 'hospital',
          lat: h.location.coordinates[1],
          lng: h.location.coordinates[0],
          label: `${h.name} — ${h.availableBeds ?? 0} beds`,
        });
      }
    });

    // Ambulances (blue) — live socket position wins over DB position
    availableAmbulances.forEach((a) => {
      const live = liveLocations[a._id];
      const lat = live?.lat ?? (a.currentLocation?.coordinates?.[1]);
      const lng = live?.lng ?? (a.currentLocation?.coordinates?.[0]);
      if (lat != null && lng != null) {
        markers.push({ type: 'ambulance', lat, lng, label: `${a.name} (Ambulance)` });
      }
    });

    // Traffic officers (amber) — live socket position wins over DB position
    availableTrafficUsers.forEach((t) => {
      const live = liveLocations[t._id];
      const lat = live?.lat ?? (t.currentLocation?.coordinates?.[1]);
      const lng = live?.lng ?? (t.currentLocation?.coordinates?.[0]);
      if (lat != null && lng != null) {
        markers.push({ type: 'traffic', lat, lng, label: `${t.name} (Traffic Officer)` });
      }
    });

    return markers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(emergencies), JSON.stringify(availableHospitals),
      JSON.stringify(availableAmbulances), JSON.stringify(availableTrafficUsers),
      liveLocations]);

  const refreshAll = () => {
    fetchEmergencies();
    fetchAvailableAmbulances();
    fetchAvailableHospitals();
    fetchAvailableTrafficUsers();
  };

  if (isLoading && emergencies.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Total" value={stats.total} color="red" />
        <StatCard icon={AlertTriangle} label="Critical" value={stats.critical} color="rose" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="amber" />
        <StatCard icon={RefreshCw} label="Completed" value={stats.completed} color="emerald" />
      </div>

      {/* ── Live Command Map ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Navigation size={16} className="text-red-600" />
            Live Command Map
            <span className="text-xs font-normal text-gray-400">
              ({mapMarkers.length} units tracked)
            </span>
          </h3>
          <button onClick={refreshAll} className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={14} />
          </button>
        </div>
        <LiveMap markers={mapMarkers} height="380px" zoom={12} />
      </div>

      {/* Side panels: Ambulance Drivers + Hospitals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ambulance Drivers List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Truck size={16} className="text-blue-600" />
              Ambulance Drivers
              <span className="text-xs font-normal text-gray-400">({availableAmbulances.length} on duty)</span>
            </h3>
            <button onClick={fetchAvailableAmbulances} className="text-gray-400 hover:text-gray-600">
              <RefreshCw size={14} />
            </button>
          </div>
          {availableAmbulances.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No ambulance drivers on duty</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableAmbulances.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <User size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-500">{a.city || 'N/A'}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                    <Circle size={6} fill="currentColor" />
                    On Duty
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hospitals List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Building2 size={16} className="text-emerald-600" />
              Nearby Hospitals
              <span className="text-xs font-normal text-gray-400">({availableHospitals.length} registered)</span>
            </h3>
            <button onClick={fetchAvailableHospitals} className="text-gray-400 hover:text-gray-600">
              <RefreshCw size={14} />
            </button>
          </div>
          {availableHospitals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hospitals registered</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableHospitals.map((h) => (
                <div
                  key={h._id}
                  className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Building2 size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{h.name}</p>
                      <p className="text-xs text-gray-500">{h.city || 'N/A'}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      (h.availableBeds ?? 0) > 5
                        ? 'bg-emerald-100 text-emerald-700'
                        : (h.availableBeds ?? 0) > 0
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <Bed size={10} />
                    {h.availableBeds ?? 0} beds
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Siren size={18} className="text-red-500" />
            Incoming Emergencies
          </h3>
          <button onClick={refreshAll} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Refresh All
          </button>
        </div>

        {emergencies.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No active emergencies</p>
          </div>
        ) : (
          <div className="space-y-6">
            {emergencies.map((emergency) => (
              <EmergencyCard
                key={emergency._id}
                emergency={emergency}
                ambulances={availableAmbulances}
                hospitals={availableHospitals}
                trafficUsers={availableTrafficUsers}
                onAssignAmbulance={(ambId) => assignAmbulance(emergency._id, ambId)}
                onHospitalAlert={(hosId) => sendHospitalAlert(emergency._id, hosId)}
                onTrafficAlert={(trafId) => sendTrafficAlert(emergency._id, trafId)}
                onSetPriority={(priority) => setPriority(emergency._id, priority)}
                onSendAlertAll={(payload) => sendAlertAll(emergency._id, payload)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon: IconComp, label, value, color }) {
  const colors = {
    red: 'bg-red-50 text-red-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <IconComp size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/* ─── Emergency Card ─── */
function EmergencyCard({
  emergency,
  ambulances,
  hospitals,
  trafficUsers,
  onAssignAmbulance,
  onHospitalAlert,
  onTrafficAlert,
  onSetPriority,
  onSendAlertAll,
}) {
  const [selectedAmbulance, setSelectedAmbulance] = useState(
    emergency.assignedAmbulance?._id || ''
  );
  const [selectedHospital, setSelectedHospital] = useState(
    emergency.assignedHospital?._id || ''
  );
  const [selectedTraffic, setSelectedTraffic] = useState(
    emergency.assignedTraffic?._id || emergency.assignedTraffic || ''
  );
  const [selectedPriority, setSelectedPriority] = useState(emergency.priority || 'medium');
  const [sending, setSending] = useState(false);

  const priorities = ['low', 'medium', 'high', 'critical'];

  const srcCoords = emergency.location?.coordinates
    ? { lng: emergency.location.coordinates[0], lat: emergency.location.coordinates[1] }
    : null;
  const srcAddress = emergency.location?.address || null;

  const priorityBorder = {
    low: 'border-l-blue-400',
    medium: 'border-l-amber-400',
    high: 'border-l-orange-500',
    critical: 'border-l-red-600',
  };

  const handleSendAlert = async () => {
    if (!selectedAmbulance && !selectedHospital && !selectedTraffic) return;
    setSending(true);
    await onSendAlertAll({
      ambulanceId: selectedAmbulance || null,
      hospitalId: selectedHospital || null,
      trafficId: selectedTraffic || null,
      priority: selectedPriority,
    });
    setSending(false);
  };

  return (
    <div
      className={`border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all border-l-4 ${
        priorityBorder[emergency.priority] || 'border-l-amber-400'
      }`}
    >
      {/* Top bar — status + time */}
      <div className="flex items-center justify-between bg-gray-50 px-5 py-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={emergency.priority || 'medium'} />
          <StatusBadge status={emergency.status || 'pending'} />
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={12} />
          {emergency.createdAt ? new Date(emergency.createdAt).toLocaleString() : 'Just now'}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Patient Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoBlock
            icon={<User size={18} className="text-red-600" />}
            iconBg="bg-red-50"
            label="Patient Name"
            value={emergency.citizenName || 'Unknown'}
          />
          <InfoBlock
            icon={<Phone size={18} className="text-blue-600" />}
            iconBg="bg-blue-50"
            label="Phone Number"
            value={emergency.citizenPhone || 'N/A'}
          />
        </div>

        {/* Description */}
        {emergency.description && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700">
            {emergency.description}
          </div>
        )}

        {/* Source & Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-red-500" />
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Source Location
              </p>
            </div>
            {srcAddress && <p className="text-sm font-medium text-gray-800 mb-1">{srcAddress}</p>}
            {srcCoords ? (
              <p className="text-xs text-gray-500 font-mono">
                {srcCoords.lat.toFixed(5)}, {srcCoords.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">Location not available</p>
            )}
          </div>
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPinned size={14} className="text-emerald-500" />
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Destination Hospital
              </p>
            </div>
            {emergency.assignedHospital ? (
              <p className="text-sm font-medium text-emerald-700">
                {emergency.assignedHospital.name || 'Hospital Assigned'}
              </p>
            ) : (
              <p className="text-xs text-amber-600 font-medium">⚠ Not yet assigned</p>
            )}
          </div>
        </div>

        {/* Currently Assigned Tags */}
        {(emergency.assignedAmbulance || emergency.assignedHospital || emergency.assignedTraffic) && (
          <div className="flex flex-wrap gap-2">
            {emergency.assignedAmbulance && (
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                <Truck size={12} />
                Ambulance: {emergency.assignedAmbulance.name || 'Assigned'}
              </span>
            )}
            {emergency.assignedHospital && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                <Building2 size={12} />
                Hospital: {emergency.assignedHospital.name || 'Notified'}
              </span>
            )}
            {emergency.assignedTraffic && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                <TrafficCone size={12} />
                Traffic: Notified
              </span>
            )}
          </div>
        )}

        {/* ── ASSIGNMENT FORM ── */}
        <div className="border border-gray-200 rounded-xl bg-gray-50/50 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Send size={14} className="text-red-500" />
            Dispatch Alert
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
                Priority
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value);
                  onSetPriority(e.target.value);
                }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white cursor-pointer"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Ambulance Driver */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                <Truck size={10} />
                Ambulance Driver
              </label>
              <select
                value={selectedAmbulance}
                onChange={(e) => setSelectedAmbulance(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white cursor-pointer"
              >
                <option value="">— Select Driver —</option>
                {ambulances.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} {a.city ? `(${a.city})` : ''} — On Duty
                  </option>
                ))}
              </select>
            </div>

            {/* Hospital */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                <Building2 size={10} />
                Assign Hospital
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white cursor-pointer"
              >
                <option value="">— Select Hospital —</option>
                {hospitals.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} {h.city ? `(${h.city})` : ''} — {h.availableBeds ?? 0} beds
                  </option>
                ))}
              </select>
            </div>

            {/* Traffic Officer */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                <TrafficCone size={10} />
                Traffic Officer
              </label>
              <select
                value={selectedTraffic}
                onChange={(e) => setSelectedTraffic(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white cursor-pointer"
              >
                <option value="">— Select Officer —</option>
                {trafficUsers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} {t.city ? `(${t.city})` : ''} — On Duty
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Send Alert Button */}
          <button
            onClick={handleSendAlert}
            disabled={sending || (!selectedAmbulance && !selectedHospital && !selectedTraffic)}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !selectedAmbulance && !selectedHospital && !selectedTraffic
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200'
            }`}
          >
            {sending ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Sending Alert...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Alert to All Selected Units
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Info Block ─── */
function InfoBlock({ icon, iconBg, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-base font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
