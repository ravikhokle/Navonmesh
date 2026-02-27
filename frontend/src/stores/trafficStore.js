import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const useTrafficStore = create((set) => ({
  isOnDuty: false,
  activeAlerts: [],
  isLoading: false,

  fetchDutyStatus: async () => {
    try {
      const { data } = await api.get('/traffic/status');
      set({ isOnDuty: data.isOnDuty });
    } catch (error) {
      toast.error('Failed to fetch duty status');
    }
  },

  toggleDuty: async () => {
    try {
      const { data } = await api.put('/traffic/toggle-duty');
      set({ isOnDuty: data.isOnDuty });
      toast.success(data.isOnDuty ? 'Now On Duty' : 'Now Off Duty');
    } catch (error) {
      toast.error('Failed to toggle duty');
    }
  },

  fetchAlerts: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/traffic/alerts');
      set({ activeAlerts: data.alerts || data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch alerts');
    }
  },

  clearTraffic: async (alertId) => {
    try {
      await api.post('/traffic/clear', { alertId });
      set((state) => ({
        activeAlerts: state.activeAlerts.filter((a) => a._id !== alertId),
      }));
      toast.success('Traffic cleared');
    } catch (error) {
      toast.error('Failed to clear traffic');
    }
  },

  addAlert: (alert) => {
    set((state) => ({
      activeAlerts: [alert, ...state.activeAlerts],
    }));
    toast.warning('New emergency route alert!');
  },
}));

export default useTrafficStore;
