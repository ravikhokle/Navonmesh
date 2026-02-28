import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useAmbulanceStore = create((set) => ({
  assignedEmergencies: [],
  isOnDuty: false,
  isLoading: false,

  // Sync on-duty status from server (called on page load to hydrate state)
  fetchDutyStatus: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ isOnDuty: data.isOnDuty ?? false });
    } catch { /* ignore — socket events will keep it in sync */ }
  },

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

  // Toggle on-duty (sends current location via geolocation API)
  toggleDuty: async () => {
    try {
      let latitude = null;
      let longitude = null;
      // Try to get current position from browser
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Location not available — proceed without it
      }
      const { data } = await api.put('/ambulance/toggle-duty', { latitude, longitude });
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
