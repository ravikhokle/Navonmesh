import { useEffect } from 'react';
import {
  AlertTriangle,
  Truck,
  TrafficCone,
  Building2,
  Clock,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import useEmergencyStore from '../stores/emergencyStore';
import socket, { connectSocket } from '../lib/socket';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ERSDashboard() {
  const {
    emergencies,
    fetchEmergencies,
    assignAmbulance,
    sendTrafficAlert,
    sendHospitalAlert,
    addEmergency,
    updateEmergency,
    isLoading,
  } = useEmergencyStore();

  useEffect(() => {
    fetchEmergencies();
    connectSocket();

    socket.on('new-emergency', (data) => addEmergency(data));
    socket.on('emergency-updated', (data) => updateEmergency(data));

    return () => {
      socket.off('new-emergency');
      socket.off('emergency-updated');
    };
  }, [fetchEmergencies, addEmergency, updateEmergency]);

  const stats = {
    total: emergencies.length,
    critical: emergencies.filter((e) => e.priority === 'critical').length,
    moderate: emergencies.filter((e) => e.priority === 'moderate').length,
    resolved: emergencies.filter((e) => e.status === 'resolved').length,
  };

  if (isLoading && emergencies.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Total Emergencies"
          value={stats.total}
          color="red"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical"
          value={stats.critical}
          color="rose"
        />
        <StatCard
          icon={Clock}
          label="Moderate"
          value={stats.moderate}
          color="amber"
        />
        <StatCard
          icon={RefreshCw}
          label="Resolved"
          value={stats.resolved}
          color="emerald"
        />
      </div>

      {/* Emergency List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Incoming Emergencies
          </h3>
          <button
            onClick={fetchEmergencies}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
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
                onAssignAmbulance={() => assignAmbulance(emergency._id)}
                onTrafficAlert={() => sendTrafficAlert(emergency._id)}
                onHospitalAlert={() => sendHospitalAlert(emergency._id)}
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

function EmergencyCard({ emergency, onAssignAmbulance, onTrafficAlert, onHospitalAlert }) {
  return (
    <div className="border border-gray-100 rounded-xl p-5 hover:border-red-200 hover:shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-gray-900">{emergency.name || 'Unknown'}</h4>
            <StatusBadge status={emergency.priority || 'low'} />
            <StatusBadge status={emergency.status || 'pending'} />
          </div>
          <div className="space-y-1 text-sm text-gray-500">
            <p className="flex items-center gap-2">
              <MapPin size={14} />
              {emergency.location?.lat?.toFixed(4)}, {emergency.location?.lng?.toFixed(4)}
            </p>
            <p className="flex items-center gap-2">
              <Clock size={14} />
              {emergency.createdAt
                ? new Date(emergency.createdAt).toLocaleString()
                : 'Just now'}
            </p>
            {emergency.description && (
              <p className="text-gray-600 mt-1">{emergency.description}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onAssignAmbulance}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <Truck size={14} />
            Assign Ambulance
          </button>
          <button
            onClick={onTrafficAlert}
            className="btn-warning flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <TrafficCone size={14} />
            Traffic Alert
          </button>
          <button
            onClick={onHospitalAlert}
            className="btn-success flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <Building2 size={14} />
            Hospital Alert
          </button>
        </div>
      </div>
    </div>
  );
}
