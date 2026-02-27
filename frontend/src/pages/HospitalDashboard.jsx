import { useEffect, useState } from 'react';
import {
  Building2,
  Bed,
  UserPlus,
  UserMinus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
} from 'lucide-react';
import useHospitalStore from '../stores/hospitalStore';
import socket, { connectSocket } from '../lib/socket';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function HospitalDashboard() {
  const {
    beds,
    incomingPatients,
    fetchBeds,
    fetchIncomingPatients,
    updateBedCount,
    acceptPatient,
    rejectPatient,
    addIncomingPatient,
    isLoading,
  } = useHospitalStore();

  const [bedInput, setBedInput] = useState(null);

  useEffect(() => {
    fetchBeds();
    fetchIncomingPatients();
    connectSocket();

    socket.on('incoming-patient', (data) => addIncomingPatient(data));

    return () => {
      socket.off('incoming-patient');
    };
  }, [fetchBeds, fetchIncomingPatients, addIncomingPatient]);

  const displayBedInput = bedInput ?? beds.available ?? 0;

  if (isLoading && !beds.total) return <LoadingSpinner />;

  const occupancy = beds.total
    ? Math.round(((beds.total - beds.available) / beds.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Bed size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{beds.total || 0}</p>
            <p className="text-xs text-gray-500">Total Beds</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{beds.available || 0}</p>
            <p className="text-xs text-gray-500">Available Beds</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{occupancy}%</p>
            <p className="text-xs text-gray-500">Occupancy Rate</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Beds */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-red-500" />
            Update Available Beds
          </h3>

          {/* Occupancy Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Occupancy</span>
              <span className="font-medium text-gray-700">{occupancy}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  occupancy > 80
                    ? 'bg-red-500'
                    : occupancy > 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(occupancy, 100)}%` }}
              />
            </div>
          </div>

          {/* Bed counter */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setBedInput(Math.max(0, displayBedInput - 1))}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus size={20} />
            </button>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">{displayBedInput}</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
            <button
              onClick={() => setBedInput(displayBedInput + 1)}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus size={20} />
            </button>
          </div>

          <button
            onClick={() => updateBedCount(displayBedInput)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Update Bed Count
          </button>
        </div>

        {/* Incoming Patients */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-red-500" />
            Incoming Patients
            {incomingPatients.length > 0 && (
              <span className="ml-auto badge-critical">{incomingPatients.length}</span>
            )}
          </h3>

          {incomingPatients.length === 0 ? (
            <div className="text-center py-8">
              <UserMinus size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No incoming patients</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {incomingPatients.map((patient, idx) => (
                <div
                  key={patient._id || idx}
                  className="border border-gray-100 rounded-xl p-4 hover:border-red-200 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{patient.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">
                        {patient.createdAt
                          ? new Date(patient.createdAt).toLocaleString()
                          : 'Just now'}
                      </p>
                    </div>
                    <span className="badge-critical">{patient.priority || 'CRITICAL'}</span>
                  </div>
                  {patient.description && (
                    <p className="text-sm text-gray-600 mb-3">{patient.description}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptPatient(patient._id)}
                      className="btn-success flex-1 flex items-center justify-center gap-1.5 text-sm py-2"
                    >
                      <CheckCircle2 size={14} />
                      Accept
                    </button>
                    <button
                      onClick={() => rejectPatient(patient._id)}
                      className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm py-2 hover:bg-red-50 hover:text-red-600"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
