import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Truck,
  TrafficCone,
  Building2,
  Clock,
  MapPin,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import useEmergencyStore from '../stores/emergencyStore';
import socket, { connectSocket } from '../lib/socket';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

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
    addEmergency,
    updateEmergency,
    isLoading,
  } = useEmergencyStore();

  useEffect(() => {
    fetchEmergencies();
    fetchAvailableAmbulances();
    fetchAvailableHospitals();
    fetchAvailableTrafficUsers();
    connectSocket();

    socket.on('new-emergency', (data) => addEmergency(data));
    socket.on('emergency-updated', (data) => updateEmergency(data));

    return () => {
      socket.off('new-emergency');
      socket.off('emergency-updated');
    };
  }, []);

  const stats = {
    total: emergencies.length,
    critical: emergencies.filter((e) => e.priority === 'critical').length,
    pending: emergencies.filter((e) => e.status === 'pending').length,
    completed: emergencies.filter((e) => e.status === 'completed').length,
  };

  if (isLoading && emergencies.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Total Emergencies" value={stats.total} color="red" />
        <StatCard icon={AlertTriangle} label="Critical" value={stats.critical} color="rose" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="amber" />
        <StatCard icon={RefreshCw} label="Completed" value={stats.completed} color="emerald" />
      </div>

      {/* Emergency List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Incoming Emergencies</h3>
          <button onClick={fetchEmergencies} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {emergencies.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No active emergencies</p>
          </div>
        ) : (
          <div className="space-y-4">
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

function EmergencyCard({
  emergency,
  ambulances,
  hospitals,
  trafficUsers,
  onAssignAmbulance,
  onHospitalAlert,
  onTrafficAlert,
  onSetPriority,
}) {
  const [showAssign, setShowAssign] = useState(null); // 'ambulance' | 'hospital' | 'traffic' | null

  const priorities = ['low', 'medium', 'high', 'critical'];
  const location = emergency.location?.coordinates
    ? { lng: emergency.location.coordinates[0], lat: emergency.location.coordinates[1] }
    : null;

  return (
    <div className="border border-gray-100 rounded-xl p-5 hover:border-red-200 hover:shadow-sm transition-all">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h4 className="font-semibold text-gray-900">{emergency.citizenName || 'Unknown'}</h4>
              <StatusBadge status={emergency.priority || 'medium'} />
              <StatusBadge status={emergency.status || 'pending'} />
            </div>
            <div className="space-y-1 text-sm text-gray-500">
              {location && (
                <p className="flex items-center gap-2">
                  <MapPin size={14} />
                  {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
                </p>
              )}
              {emergency.citizenPhone && (
                <p className="text-gray-600">Phone: {emergency.citizenPhone}</p>
              )}
              <p className="flex items-center gap-2">
                <Clock size={14} />
                {emergency.createdAt ? new Date(emergency.createdAt).toLocaleString() : 'Just now'}
              </p>
              {emergency.description && (
                <p className="text-gray-600 mt-1">{emergency.description}</p>
              )}
            </div>
          </div>

          {/* Priority selector */}
          <div className="flex items-center gap-2">
            <select
              value={emergency.priority || 'medium'}
              onChange={(e) => onSetPriority(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assigned info */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {emergency.assignedAmbulance && (
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
              Ambulance: {emergency.assignedAmbulance.name || 'Assigned'}
            </span>
          )}
          {emergency.assignedHospital && (
            <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md">
              Hospital: {emergency.assignedHospital.name || 'Notified'}
            </span>
          )}
          {emergency.assignedTraffic && (
            <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md">
              Traffic: Notified
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <button
              onClick={() => setShowAssign(showAssign === 'ambulance' ? null : 'ambulance')}
              className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
            >
              <Truck size={14} />
              Assign Ambulance
              <ChevronDown size={12} />
            </button>
            {showAssign === 'ambulance' && (
              <DropdownList
                items={ambulances}
                onSelect={(id) => { onAssignAmbulance(id); setShowAssign(null); }}
                onClose={() => setShowAssign(null)}
                emptyText="No ambulances on duty"
              />
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowAssign(showAssign === 'hospital' ? null : 'hospital')}
              className="btn-success flex items-center gap-1.5 text-sm py-2 px-3"
            >
              <Building2 size={14} />
              Notify Hospital
              <ChevronDown size={12} />
            </button>
            {showAssign === 'hospital' && (
              <DropdownList
                items={hospitals.map((h) => ({ ...h, subtitle: `${h.availableBeds} beds` }))}
                onSelect={(id) => { onHospitalAlert(id); setShowAssign(null); }}
                onClose={() => setShowAssign(null)}
                emptyText="No hospitals available"
              />
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowAssign(showAssign === 'traffic' ? null : 'traffic')}
              className="btn-warning flex items-center gap-1.5 text-sm py-2 px-3"
            >
              <TrafficCone size={14} />
              Traffic Alert
              <ChevronDown size={12} />
            </button>
            {showAssign === 'traffic' && (
              <DropdownList
                items={trafficUsers}
                onSelect={(id) => { onTrafficAlert(id); setShowAssign(null); }}
                onClose={() => setShowAssign(null)}
                emptyText="No traffic officers on duty"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DropdownList({ items, onSelect, onClose, emptyText }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-3 text-sm text-gray-400 text-center">{emptyText}</p>
        ) : (
          items.map((item) => (
            <button
              key={item._id}
              onClick={() => onSelect(item._id)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm transition-colors cursor-pointer"
            >
              <p className="font-medium text-gray-900">{item.name}</p>
              {item.subtitle && (
                <p className="text-xs text-gray-500">{item.subtitle}</p>
              )}
              {item.city && (
                <p className="text-xs text-gray-500">{item.city}</p>
              )}
            </button>
          ))
        )}
      </div>
    </>
  );
}
