import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useEmergencyStore = create((set, get) => ({
  emergencies: [],
  currentEmergency: null,
  nearestHospitals: [],
  availableAmbulances: [],
  availableHospitals: [],
  availableTrafficUsers: [],
  isLoading: false,

  // ── Citizen: Create SOS (public, no auth) ──
  createSOS: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/citizen/emergency', {
        citizenName: payload.name,
        citizenPhone: payload.phone,
        description: payload.description,
        location: {
          type: 'Point',
          coordinates: [payload.location.lng, payload.location.lat],
          address: payload.location.address || '',
        },
      });
      set({ currentEmergency: data, isLoading: false });
      toast.success('SOS sent! Help is on the way.');
      return data;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Failed to send SOS');
      throw error;
    }
  },

  // ── Citizen: Nearest hospitals (public) ──
  fetchNearestHospitals: async (lat, lng) => {
    try {
      const { data } = await api.get(`/citizen/hospitals/nearby?lat=${lat}&lng=${lng}`);
      set({ nearestHospitals: data });
    } catch (error) {
      toast.error('Failed to fetch hospitals');
    }
  },

  // ── ERS: Manually create emergency from phone call ──
  createManualEmergency: async (payload) => {
    try {
      const { data } = await api.post('/ers/emergency', payload);
      toast.success('🚨 Emergency created manually');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create emergency');
      throw error;
    }
  },

  // ── ERS: Fetch all emergencies ──
  fetchEmergencies: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/ers/emergencies');
      set({ emergencies: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch emergencies');
    }
  },

  // ── ERS: Fetch available ambulances ──
  fetchAvailableAmbulances: async () => {
    try {
      const { data } = await api.get('/ers/ambulances');
      set({ availableAmbulances: data });
    } catch (error) {
      toast.error('Failed to fetch ambulances');
    }
  },

  // ── ERS: Fetch all hospitals ──
  fetchAvailableHospitals: async () => {
    try {
      const { data } = await api.get('/ers/hospitals');
      set({ availableHospitals: data });
    } catch (error) {
      toast.error('Failed to fetch hospitals');
    }
  },

  // ── ERS: Fetch available traffic users ──
  fetchAvailableTrafficUsers: async () => {
    try {
      const { data } = await api.get('/ers/traffic-users');
      set({ availableTrafficUsers: data });
    } catch (error) {
      toast.error('Failed to fetch traffic officers');
    }
  },

  // ── ERS: Set priority ──
  setPriority: async (emergencyId, priority) => {
    try {
      const { data } = await api.put(`/ers/emergency/${emergencyId}/priority`, { priority });
      get().updateEmergency(data);
      toast.success('Priority updated');
    } catch (error) {
      toast.error('Failed to set priority');
    }
  },

  // ── ERS: Assign ambulance ──
  assignAmbulance: async (emergencyId, ambulanceId) => {
    try {
      const { data } = await api.put(`/ers/emergency/${emergencyId}/assign-ambulance`, {
        ambulanceId,
      });
      get().updateEmergency(data);
      toast.success('Ambulance assigned');
    } catch (error) {
      toast.error('Failed to assign ambulance');
    }
  },

  // ── ERS: Notify hospital ──
  sendHospitalAlert: async (emergencyId, hospitalId) => {
    try {
      const { data } = await api.put(`/ers/emergency/${emergencyId}/notify-hospital`, {
        hospitalId,
      });
      get().updateEmergency(data);
      toast.success('Hospital notified');
    } catch (error) {
      toast.error('Failed to notify hospital');
    }
  },

  // ── ERS: Notify traffic ──
  sendTrafficAlert: async (emergencyId, trafficId) => {
    try {
      const { data } = await api.put(`/ers/emergency/${emergencyId}/notify-traffic`, {
        trafficId,
      });
      get().updateEmergency(data);
      toast.success('Traffic alert sent');
    } catch (error) {
      toast.error('Failed to send traffic alert');
    }
  },

  // ── ERS: Send alert to all (assign ambulance + hospital + traffic at once) ──
  sendAlertAll: async (emergencyId, { ambulanceId, hospitalId, trafficId, priority }) => {
    try {
      const { data } = await api.put(`/ers/emergency/${emergencyId}/send-alert`, {
        ambulanceId: ambulanceId || undefined,
        hospitalId: hospitalId || undefined,
        trafficId: trafficId || undefined,
        priority: priority || undefined,
      });
      get().updateEmergency(data);
      toast.success('Alert sent to all selected units!');
    } catch (error) {
      toast.error('Failed to send alert');
    }
  },

  // ── Socket helpers ──
  addEmergency: (emergency) => {
    set((state) => ({
      emergencies: [emergency, ...state.emergencies],
    }));
  },

  updateEmergency: (updated) => {
    set((state) => ({
      emergencies: state.emergencies.map((e) =>
        e._id === updated._id ? updated : e
      ),
    }));
  },

  setCurrentEmergency: (emergency) => set({ currentEmergency: emergency }),
}));

export default useEmergencyStore;
