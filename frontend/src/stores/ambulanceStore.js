import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useAmbulanceStore = create((set) => ({
  assignedEmergency: null,
  status: 'idle',
  isLoading: false,

  fetchAssignment: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/ambulance/assignment');
      set({
        assignedEmergency: data.emergency || null,
        status: data.status || 'idle',
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch assignment');
    }
  },

  updateStatus: async (newStatus) => {
    try {
      await api.put('/ambulance/status', { status: newStatus });
      set({ status: newStatus });
      toast.success(`Status updated: ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  },

  setAssignment: (emergency) => set({ assignedEmergency: emergency, status: 'en_route' }),
}));

export default useAmbulanceStore;
