import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useEmergencyStore = create((set, get) => ({
  emergencies: [],
  currentEmergency: null,
  nearestHospitals: [],
  isLoading: false,

  // Citizen: Create SOS
  createSOS: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/emergency/sos', payload);
      set({ currentEmergency: data.emergency, isLoading: false });
      toast.success('SOS sent! Help is on the way.');
      return data;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Failed to send SOS');
      throw error;
    }
  },

  // ERS: Fetch all emergencies
  fetchEmergencies: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/emergency');
      set({ emergencies: data.emergencies || data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch emergencies');
    }
  },

  // ERS: Assign ambulance
  assignAmbulance: async (emergencyId, ambulanceId) => {
    try {
      const { data } = await api.post('/emergency/assign-ambulance', {
        emergencyId,
        ambulanceId,
      });
      toast.success('Ambulance assigned');
      get().fetchEmergencies();
      return data;
    } catch (error) {
      toast.error('Failed to assign ambulance');
    }
  },

  // ERS: Send traffic alert
  sendTrafficAlert: async (emergencyId) => {
    try {
      await api.post('/emergency/traffic-alert', { emergencyId });
      toast.success('Traffic alert sent');
    } catch (error) {
      toast.error('Failed to send traffic alert');
    }
  },

  // ERS: Send hospital alert
  sendHospitalAlert: async (emergencyId, hospitalId) => {
    try {
      await api.post('/emergency/hospital-alert', { emergencyId, hospitalId });
      toast.success('Hospital alerted');
    } catch (error) {
      toast.error('Failed to alert hospital');
    }
  },

  // Citizen: Get nearest hospitals
  fetchNearestHospitals: async (lat, lng) => {
    try {
      const { data } = await api.get(`/hospitals/nearest?lat=${lat}&lng=${lng}`);
      set({ nearestHospitals: data.hospitals || data });
    } catch (error) {
      toast.error('Failed to fetch hospitals');
    }
  },

  // Add emergency from socket
  addEmergency: (emergency) => {
    set((state) => ({
      emergencies: [emergency, ...state.emergencies],
    }));
  },

  // Update emergency from socket
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
