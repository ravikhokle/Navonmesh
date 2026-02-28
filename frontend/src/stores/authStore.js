import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from 'react-toastify';
import useHospitalStore from './hospitalStore';
import { connectSocket, disconnectSocket } from '../lib/socket';
import socket from '../lib/socket';

const storedUser = localStorage.getItem('emergex_user');

// Helper — join socket rooms for the given user
function joinSocketRooms(user) {
  if (!user) return;
  connectSocket();
  // Rooms joined after 'connect' event fires (handled in socket.js)
  // but also emit immediately if already connected
  if (socket.connected) {
    if (user.role) socket.emit('join-role', user.role);
    if (user._id)  socket.emit('join-user', user._id);
  }
}

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
      joinSocketRooms(data.user);
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
      set({ isLoading: false });
      toast.success('Account created! You can now sign in.');
      return data;
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
    useHospitalStore.getState().reset();
    disconnectSocket();
    toast.info('Logged out');
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.put('/auth/profile', profileData);
      localStorage.setItem('emergex_user', JSON.stringify(data));
      set({ user: data, isLoading: false });
      toast.success('Profile updated successfully!');
      return data;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Failed to update profile');
      throw error;
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      set({ isLoading: false });
      toast.success(data.message);
      return data;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Failed to send reset email');
      throw error;
    }
  },

  resetPassword: async (token, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password });
      set({ isLoading: false });
      toast.success(data.message);
      return data;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Failed to reset password');
      throw error;
    }
  },

  verifyEmail: async (token) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/auth/verify-email/${token}`);
      // Update local user if logged in
      const currentUser = JSON.parse(localStorage.getItem('emergex_user') || 'null');
      if (currentUser) {
        currentUser.isEmailVerified = true;
        localStorage.setItem('emergex_user', JSON.stringify(currentUser));
        set({ user: currentUser });
      }
      set({ isLoading: false });
      toast.success(data.message);
      return data;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Verification failed');
      throw error;
    }
  },

  resendVerification: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/resend-verification');
      set({ isLoading: false });
      toast.success(data.message);
      return data;
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Failed to resend verification');
      throw error;
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('emergex_token');
  },
}));

export default useAuthStore;
