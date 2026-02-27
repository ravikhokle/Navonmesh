import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useAmbulanceStore = create((set) => ({
  assignedEmergencies: [],
  isOnDuty: false,
  isLoading: false,

  // Fetch emergencies assigned to this ambulance
  fetchAssignedEmergencies: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/ambulance/emergencies');
      set({ assignedEmergencies: data, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('Failed to fetch assignments');
    }
  },

  // Update emergency status (en_route, picked_up, completed)
  updateEmergencyStatus: async (emergencyId, status) => {
    try {
      const { data } = await api.put(`/ambulance/emergency/${emergencyId}/status`, { status });
      set((state) => ({
        assignedEmergencies: state.assignedEmergencies.map((e) =>
          e._id === data._id ? data : e
        ),
      }));
      toast.success(`Status updated: ${status.replace(/_/g, ' ')}`);
      return data;
    } catch {
      toast.error('Failed to update status');
    }
  },

  // Toggle on-duty
  toggleDuty: async () => {
    try {
      const { data } = await api.put('/ambulance/toggle-duty');
      set({ isOnDuty: data.isOnDuty });
      toast.success(data.isOnDuty ? 'Now on duty' : 'Now off duty');
    } catch {
      toast.error('Failed to toggle duty');
    }
  },

  // Socket: new assignment
  addAssignment: (emergency) => {
    set((state) => ({
      assignedEmergencies: [emergency, ...state.assignedEmergencies],
    }));
    toast.info('New emergency assignment!');
  },

  // Socket: update emergency
  updateEmergency: (updated) => {
    set((state) => ({
      assignedEmergencies: state.assignedEmergencies.map((e) =>
        e._id === updated._id ? updated : e
      ),
    }));
  },
}));

export default useAmbulanceStore;
