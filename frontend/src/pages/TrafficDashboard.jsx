import { useEffect } from 'react';
import {
  TrafficCone,
  Shield,
  ShieldOff,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Siren,
} from 'lucide-react';
import useTrafficStore from '../stores/trafficStore';
import socket, { connectSocket } from '../lib/socket';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function TrafficDashboard() {
  const { isOnDuty, activeAlerts, fetchDutyStatus, toggleDuty, fetchAlerts, clearTraffic, addAlert, isLoading } =
    useTrafficStore();

  useEffect(() => {
    fetchDutyStatus();
    fetchAlerts();
    connectSocket();

    socket.on('traffic-alert', (data) => addAlert(data));

    return () => {
      socket.off('traffic-alert');
    };
  }, [fetchDutyStatus, fetchAlerts, addAlert]);

  if (isLoading && !activeAlerts.length) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Duty Status Toggle */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                isOnDuty ? 'bg-emerald-50' : 'bg-gray-100'
              }`}
            >
              {isOnDuty ? (
                <Shield size={32} className="text-emerald-600" />
              ) : (
                <ShieldOff size={32} className="text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {isOnDuty ? 'On Duty' : 'Off Duty'}
              </h3>
              <p className="text-sm text-gray-500">
                {isOnDuty
                  ? 'You are receiving emergency traffic alerts'
                  : 'Toggle to start receiving alerts'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleDuty}
            className={`relative w-20 h-10 rounded-full transition-colors duration-300 cursor-pointer ${
              isOnDuty ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-md transition-transform duration-300 ${
                isOnDuty ? 'translate-x-10' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <Siren size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
            <p className="text-xs text-gray-500">Active Alerts</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {isOnDuty ? 'Active' : 'Inactive'}
            </p>
            <p className="text-xs text-gray-500">Duty Status</p>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrafficCone size={18} className="text-amber-500" />
          Emergency Route Alerts
          {activeAlerts.length > 0 && (
            <span className="ml-2 badge-critical">{activeAlerts.length}</span>
          )}
        </h3>

        {activeAlerts.length === 0 ? (
          <div className="text-center py-12">
            <TrafficCone size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No active alerts</p>
            <p className="text-sm text-gray-400 mt-1">
              Alerts will appear here when emergencies require traffic clearance
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((alert, idx) => (
              <div
                key={alert._id || idx}
                className="border border-amber-200 bg-amber-50/50 rounded-xl p-5 hover:border-amber-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-amber-600" />
                      <h4 className="font-semibold text-gray-900">
                        Emergency Route #{alert._id?.slice(-6) || idx + 1}
                      </h4>
                    </div>

                    <div className="space-y-2 text-sm">
                      {/* Route */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} className="text-red-500 flex-shrink-0" />
                        <span>
                          {alert.from?.lat?.toFixed(4)}, {alert.from?.lng?.toFixed(4)}
                        </span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span>
                          {alert.to?.lat?.toFixed(4)}, {alert.to?.lng?.toFixed(4)}
                        </span>
                      </div>

                      {/* Time */}
                      <p className="flex items-center gap-2 text-gray-500">
                        <Clock size={14} />
                        {alert.createdAt
                          ? new Date(alert.createdAt).toLocaleString()
                          : 'Just now'}
                      </p>

                      {alert.description && (
                        <p className="text-gray-600">{alert.description}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => clearTraffic(alert._id)}
                    className="btn-success flex items-center gap-2 text-sm whitespace-nowrap"
                  >
                    <CheckCircle2 size={14} />
                    Clear Traffic
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
