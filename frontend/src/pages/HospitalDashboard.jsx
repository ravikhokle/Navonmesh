import { useEffect, useState, useMemo } from 'react';
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
  MapPin,
  Phone,
} from 'lucide-react';
import useHospitalStore from '../stores/hospitalStore';
import socket, { connectSocket } from '../lib/socket';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LiveMap from '../components/common/LiveMap';

export default function HospitalDashboard() {
  const {
    hospital,
    incomingPatients,
    fetchMyHospital,
    fetchIncomingPatients,
    registerHospital,
    updateBedCount,
    acceptPatient,
    rejectPatient,
    addIncomingPatient,
    isLoading,
  } = useHospitalStore();

  const [bedInput, setBedInput] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    city: '',
    phone: '',
    availableBeds: 0,
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchMyHospital().then(() => {
      // If no hospital is linked fetchMyHospital will set hospital to null
      // We'll check after a short delay
    });
    fetchIncomingPatients();
    connectSocket();

    socket.on('emergency-updated', () => fetchIncomingPatients());
    socket.on('incoming-patient', (data) => {
      addIncomingPatient(data);
      toast.info('🏥 New incoming patient assigned!', { autoClose: 7000 });
    });

    return () => {
      socket.off('emergency-updated');
      socket.off('incoming-patient');
    };
  }, []);

  // Show registration form if no hospital is linked
  useEffect(() => {
    if (!isLoading && !hospital) {
      setShowRegister(true);
    } else {
      setShowRegister(false);
    }
  }, [hospital, isLoading]);

  // Auto-detect location for registration
  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRegForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString(),
        }));
      },
      () => {}
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    await registerHospital({
      name: regForm.name,
      city: regForm.city,
      phone: regForm.phone,
      availableBeds: parseInt(regForm.availableBeds) || 0,
      latitude: regForm.latitude,
      longitude: regForm.longitude,
    });
  };

  const beds = hospital?.availableBeds ?? 0;
  const displayBedInput = bedInput ?? beds;

  // ── Map markers (hospital + incoming patient locations) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mapMarkers = useMemo(() => {
    const markers = [];
    if (hospital?.location?.coordinates) {
      markers.push({
        type: 'hospital',
        lat: hospital.location.coordinates[1],
        lng: hospital.location.coordinates[0],
        label: hospital.name,
      });
    }
    incomingPatients.forEach((p) => {
      if (p.location?.coordinates) {
        markers.push({
          type: 'emergency',
          lat: p.location.coordinates[1],
          lng: p.location.coordinates[0],
          label: `Patient: ${p.citizenName ?? 'Unknown'}`,
        });
      }
    });
    return markers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital, JSON.stringify(incomingPatients)]);

  if (isLoading && !hospital && !showRegister) return <LoadingSpinner />;

  /* ─── Registration Form ─── */
  if (showRegister) {
    return (
      <div className="max-w-lg mx-auto mt-10">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Register Your Hospital</h2>
              <p className="text-sm text-gray-500">Add your hospital details to start receiving patients</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Hospital Name *
              </label>
              <input
                type="text"
                required
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                placeholder="City General Hospital"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                City *
              </label>
              <input
                type="text"
                required
                value={regForm.city}
                onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                placeholder="Pune"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Phone
              </label>
              <input
                type="text"
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Available Beds
              </label>
              <input
                type="number"
                min="0"
                value={regForm.availableBeds}
                onChange={(e) => setRegForm({ ...regForm, availableBeds: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Latitude
                </label>
                <input
                  type="text"
                  value={regForm.latitude}
                  onChange={(e) => setRegForm({ ...regForm, latitude: e.target.value })}
                  placeholder="18.5204"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Longitude
                </label>
                <input
                  type="text"
                  value={regForm.longitude}
                  onChange={(e) => setRegForm({ ...regForm, longitude: e.target.value })}
                  placeholder="73.8567"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={detectLocation}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin size={14} />
              Auto-detect my location
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {isLoading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Building2 size={16} />
              )}
              Register Hospital
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ─── Main Dashboard ─── */
  return (
    <div className="space-y-6">
      {/* Hospital info */}
      {hospital && (
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
            <Building2 size={28} className="text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{hospital.name}</h2>
            <p className="text-sm text-gray-500">{hospital.city}</p>
          </div>
          {hospital.phone && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Phone size={14} />
              {hospital.phone}
            </span>
          )}
        </div>
      )}

      {/* Live Map */}
      {mapMarkers.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 size={16} className="text-emerald-600" />
            Hospital &amp; Patient Map
          </h3>
          <LiveMap markers={mapMarkers} height="280px" zoom={13} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{beds}</p>
            <p className="text-xs text-gray-500">Available Beds</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <UserPlus size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {incomingPatients.filter((p) => p.hospitalResponse === 'pending').length}
            </p>
            <p className="text-xs text-gray-500">Pending Patients</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {incomingPatients.filter((p) => p.hospitalResponse === 'accepted').length}
            </p>
            <p className="text-xs text-gray-500">Accepted</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Beds */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bed size={18} className="text-red-500" />
            Update Available Beds
          </h3>

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
            onClick={() => {
              if (hospital?._id) {
                updateBedCount(hospital._id, displayBedInput);
                setBedInput(null);
              }
            }}
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
            {incomingPatients.filter((p) => p.hospitalResponse === 'pending').length > 0 && (
              <span className="ml-auto badge-critical">
                {incomingPatients.filter((p) => p.hospitalResponse === 'pending').length}
              </span>
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
                      <p className="font-medium text-gray-900">
                        {patient.citizenName || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {patient.createdAt
                          ? new Date(patient.createdAt).toLocaleString()
                          : 'Just now'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-md ${
                        patient.hospitalResponse === 'accepted'
                          ? 'bg-green-100 text-green-700'
                          : patient.hospitalResponse === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {patient.hospitalResponse?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  {patient.description && (
                    <p className="text-sm text-gray-600 mb-3">{patient.description}</p>
                  )}
                  {patient.citizenPhone && (
                    <p className="text-sm text-gray-500 mb-3">Phone: {patient.citizenPhone}</p>
                  )}
                  {patient.hospitalResponse === 'pending' && (
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
