import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useHospitalStore = create((set) => ({
  hospital: null,
  incomingPatients: [],
  isLoading: false,

  // Register / add a hospital (hospital admin)
  registerHospital: async ({ name, city, phone, availableBeds, longitude, latitude }) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/hospital/register', {
        name,
        city,
        phone,
        availableBeds,
        longitude,
        latitude,
      });
      set({ hospital: data, isLoading: false });
      toast.success('Hospital registered successfully!');
      return data;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Failed to register hospital');
    }
  },

  // Fetch hospital profile for current user
  fetchMyHospital: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/hospital/me');
      set({ hospital: data, isLoading: false });
    } catch {
      set({ hospital: null, isLoading: false });
    }
  },

  // Update bed count
  updateBedCount: async (hospitalId, availableBeds) => {
    try {
      const { data } = await api.put(`/hospital/${hospitalId}/beds`, { availableBeds });
      set({ hospital: data });
      toast.success('Bed count updated');
    } catch {
      toast.error('Failed to update beds');
    }
  },

  // Fetch emergencies assigned to this hospital
  fetchIncomingPatients: async () => {
    try {
      const { data } = await api.get('/hospital/emergencies');
      set({ incomingPatients: data });
    } catch {
      toast.error('Failed to fetch incoming patients');
    }
  },

  // Accept an emergency
  acceptPatient: async (emergencyId) => {
    try {
      const { data } = await api.put(`/hospital/emergency/${emergencyId}/accept`);
      set((state) => ({
        incomingPatients: state.incomingPatients.map((p) =>
          p._id === data._id ? data : p
        ),
      }));
      toast.success('Patient accepted');
    } catch {
      toast.error('Failed to accept patient');
    }
  },

  // Reject an emergency
  rejectPatient: async (emergencyId) => {
    try {
      const { data } = await api.put(`/hospital/emergency/${emergencyId}/reject`);
      set((state) => ({
        incomingPatients: state.incomingPatients.map((p) =>
          p._id === data._id ? data : p
        ),
      }));
      toast.info('Patient rejected');
    } catch {
      toast.error('Failed to reject patient');
    }
  },

  // Socket: incoming patient
  addIncomingPatient: (patient) => {
    set((state) => ({
      incomingPatients: [patient, ...state.incomingPatients],
    }));
    toast.warning('New incoming patient!');
  },

  // Reset store (call on logout)
  reset: () => set({ hospital: null, incomingPatients: [], isLoading: false }),
}));

export default useHospitalStore;
