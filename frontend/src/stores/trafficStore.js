import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useTrafficStore = create((set) => ({
  isOnDuty: false,
  activeAlerts: [],
  isLoading: false,

  // Fetch duty status via user profile
  fetchDutyStatus: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ isOnDuty: data.isOnDuty });
    } catch {
      toast.error('Failed to fetch duty status');
    }
  },

  // Toggle on/off duty (sends current location via geolocation API)
  toggleDuty: async () => {
    try {
      let latitude = null;
      let longitude = null;
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Location not available — proceed without it
      }
      const { data } = await api.put('/traffic/toggle-duty', { latitude, longitude });
      set({ isOnDuty: data.isOnDuty });
      toast.success(data.isOnDuty ? 'Now on duty' : 'Now off duty');
    } catch {
      toast.error('Failed to toggle duty');
    }
  },

  // Fetch emergencies assigned to this traffic officer
  fetchAlerts: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/traffic/emergencies');
      set({ activeAlerts: data, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('Failed to fetch alerts');
    }
  },

  // Mark route as cleared
  clearRoute: async (emergencyId) => {
    try {
      const { data } = await api.put(`/traffic/emergency/${emergencyId}/clear-route`);
      set((state) => ({
        activeAlerts: state.activeAlerts.map((a) =>
          a._id === data._id ? data : a
        ),
      }));
      toast.success('Route cleared');
    } catch {
      toast.error('Failed to clear route');
    }
  },

  // Socket: new traffic alert
  addAlert: (alert) => {
    set((state) => ({
      activeAlerts: [alert, ...state.activeAlerts],
    }));
    toast.warning('New emergency route alert!');
  },
}));

export default useTrafficStore;
