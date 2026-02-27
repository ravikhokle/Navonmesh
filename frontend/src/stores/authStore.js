import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';

const storedUser = localStorage.getItem('emergex_user');

const useAuthStore = create((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: localStorage.getItem('emergex_token') || null,
  isLoading: false,

  login: async (email, password, role) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password, role });
      localStorage.setItem('emergex_token', data.token);
      localStorage.setItem('emergex_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      toast.success('Login successful!');
      return data.user;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  },

  signup: async ({ name, email, password, city, role }) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/signup', { name, email, password, city, role });
      localStorage.setItem('emergex_token', data.token);
      localStorage.setItem('emergex_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      toast.success('Account created successfully!');
      return data.user;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Signup failed');
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('emergex_token');
    localStorage.removeItem('emergex_user');
    set({ user: null, token: null });
    toast.info('Logged out');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('emergex_token');
  },
}));

export default useAuthStore;
