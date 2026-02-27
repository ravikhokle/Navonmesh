import { useEffect } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ArrowRight,
  Building2,
} from 'lucide-react';
import useAmbulanceStore from '../stores/ambulanceStore';
import socket, { connectSocket } from '../lib/socket';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AMBULANCE_STATUS } from '../lib/constants';

export default function AmbulanceDashboard() {
  const { assignedEmergency, status, fetchAssignment, updateStatus, setAssignment, isLoading } =
    useAmbulanceStore();

  useEffect(() => {
    fetchAssignment();
    connectSocket();

    socket.on('ambulance-assigned', (data) => setAssignment(data));

    return () => {
      socket.off('ambulance-assigned');
    };
  }, [fetchAssignment, setAssignment]);

  if (isLoading) return <LoadingSpinner />;

  const statusFlow = [
    { key: AMBULANCE_STATUS.EN_ROUTE, label: 'En Route', icon: ArrowRight, color: 'blue' },
    { key: AMBULANCE_STATUS.PICKED_UP, label: 'Picked Up', icon: User, color: 'purple' },
    { key: AMBULANCE_STATUS.REACHED, label: 'Reached Hospital', icon: Building2, color: 'green' },
  ];

  const currentIndex = statusFlow.findIndex((s) => s.key === status);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Current Status */}
      <div className="card text-center">
        <div className="w-20 h-20 mx-auto bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <Truck size={36} className="text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Ambulance Status</h3>
        <StatusBadge status={status} className="text-sm px-4 py-1.5" />
      </div>

      {/* Status Flow */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-6">Update Status</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          {statusFlow.map(({ key, label, icon: StatusIcon, color }, idx) => {
            const isActive = status === key;
            const isPast = idx < currentIndex;
            const isNext = idx === currentIndex + 1;
            const disabled = !isNext && !isActive;

            const colors = {
              blue: 'bg-blue-600 hover:bg-blue-700',
              purple: 'bg-purple-600 hover:bg-purple-700',
              green: 'bg-emerald-600 hover:bg-emerald-700',
            };

            return (
              <button
                key={key}
                onClick={() => updateStatus(key)}
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

      {/* Emergency Details */}
      {assignedEmergency ? (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Emergency</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {assignedEmergency.name || 'Patient'}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <Phone size={12} />
                  {assignedEmergency.phone || 'N/A'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <MapPin size={12} /> Location
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {assignedEmergency.location?.lat?.toFixed(4)},{' '}
                  {assignedEmergency.location?.lng?.toFixed(4)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Clock size={12} /> Time
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {assignedEmergency.createdAt
                    ? new Date(assignedEmergency.createdAt).toLocaleTimeString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {assignedEmergency.description && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{assignedEmergency.description}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Truck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No emergency assigned</p>
          <p className="text-sm text-gray-400 mt-1">Waiting for dispatch...</p>
        </div>
      )}
    </div>
  );
}
