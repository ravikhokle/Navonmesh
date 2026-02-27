import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useHospitalStore = create((set) => ({
  beds: { total: 0, available: 0 },
  incomingPatients: [],
  isLoading: false,

  fetchBeds: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/hospital/beds');
      set({ beds: data.beds || data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch bed data');
    }
  },

  updateBedCount: async (available) => {
    try {
      const { data } = await api.put('/hospital/beds', { available });
      set({ beds: data.beds || { ...data, available } });
      toast.success('Bed count updated');
    } catch (error) {
      toast.error('Failed to update beds');
    }
  },

  fetchIncomingPatients: async () => {
    try {
      const { data } = await api.get('/hospital/patients/incoming');
      set({ incomingPatients: data.patients || data });
    } catch (error) {
      toast.error('Failed to fetch patients');
    }
  },

  acceptPatient: async (emergencyId) => {
    try {
      await api.post('/hospital/patients/accept', { emergencyId });
      toast.success('Patient accepted');
      set((state) => ({
        incomingPatients: state.incomingPatients.filter((p) => p._id !== emergencyId),
        beds: { ...state.beds, available: Math.max(0, state.beds.available - 1) },
      }));
    } catch (error) {
      toast.error('Failed to accept patient');
    }
  },

  rejectPatient: async (emergencyId) => {
    try {
      await api.post('/hospital/patients/reject', { emergencyId });
      toast.info('Patient rejected');
      set((state) => ({
        incomingPatients: state.incomingPatients.filter((p) => p._id !== emergencyId),
      }));
    } catch (error) {
      toast.error('Failed to reject patient');
    }
  },

  addIncomingPatient: (patient) => {
    set((state) => ({
      incomingPatients: [patient, ...state.incomingPatients],
    }));
  },
}));

export default useHospitalStore;
