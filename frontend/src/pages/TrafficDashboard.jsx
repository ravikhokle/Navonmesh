import { useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Siren,
} from 'lucide-react';
import useTrafficStore from '../stores/trafficStore';
import socket, { connectSocket } from '../lib/socket';
import LoadingSpinner from '../components/common/LoadingSpinner';

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

  useEffect(() => {
    fetchDutyStatus();
    fetchAlerts();
    connectSocket();

    socket.on('traffic-alert', (data) => addAlert(data));
    socket.on('emergency-updated', () => fetchAlerts());

    return () => {
      socket.off('traffic-alert');
      socket.off('emergency-updated');
    };
  }, []);

  const pendingAlerts = activeAlerts.filter((a) => !a.routeCleared);
  const clearedAlerts = activeAlerts.filter((a) => a.routeCleared);

  if (isLoading && activeAlerts.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Duty top bar */}
      <div
        className={`card flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isOnDuty ? 'ring-2 ring-emerald-400' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              isOnDuty ? 'bg-emerald-50' : 'bg-gray-100'
            }`}
          >
            {isOnDuty ? (
              <ShieldCheck size={28} className="text-emerald-600" />
            ) : (
              <ShieldOff size={28} className="text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Traffic Control</h2>
            <p className={`text-sm ${isOnDuty ? 'text-emerald-600' : 'text-gray-500'}`}>
              {isOnDuty ? 'On Duty — Receiving Alerts' : 'Off Duty'}
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendingAlerts.length}</p>
            <p className="text-xs text-gray-500">Pending Alerts</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{clearedAlerts.length}</p>
            <p className="text-xs text-gray-500">Cleared</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Shield size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
            <p className="text-xs text-gray-500">Total Assigned</p>
          </div>
        </div>
      </div>

      {/* Pending Alerts */}
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
                key={alert._id || idx}
                className="border border-amber-200 bg-amber-50/40 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p className="font-medium text-gray-900">
                      {alert.citizenName || 'Emergency'}
                    </p>
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
                    {alert.priority?.toUpperCase() || 'N/A'}
                  </span>
                </div>
                {alert.description && (
                  <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                )}
                {alert.location?.coordinates && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <MapPin size={12} />
                    {alert.location.coordinates[1].toFixed(4)},{' '}
                    {alert.location.coordinates[0].toFixed(4)}
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

      {/* Cleared alerts */}
      {clearedAlerts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw size={18} className="text-emerald-500" />
            Cleared Routes
          </h3>
          <div className="space-y-2">
            {clearedAlerts.map((alert, idx) => (
              <div
                key={alert._id || idx}
                className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-sm text-gray-700">
                    {alert.citizenName || 'Emergency'}
                  </span>
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
