import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: { token: localStorage.getItem('emergex_token') },
  // Robust reconnection — critical for healthcare real-time
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 8000,
  randomizationFactor: 0.3,
  timeout: 10000,
});

// ── Re-join role & user rooms on every (re)connect ────────────────────────
socket.on('connect', () => {
  const raw = localStorage.getItem('emergex_user');
  if (!raw) return;
  try {
    const user = JSON.parse(raw);
    if (user?.role) socket.emit('join-role', user.role);
    if (user?._id)  socket.emit('join-user', user._id);
  } catch { /* ignore */ }
});

socket.on('connect_error', (err) => {
  console.warn('[socket] connect_error:', err.message);
});

/**
 * Connect (or reconnect) the socket, refreshing the auth token from localStorage.
 * Safe to call multiple times — no-ops if already connected.
 */
export const connectSocket = () => {
  if (socket.connected) return;
  socket.auth = { token: localStorage.getItem('emergex_token') };
  socket.connect();
};

/**
 * Disconnect the socket (e.g., on logout).
 */
export const disconnectSocket = () => {
  if (socket.connected) socket.disconnect();
};

/**
 * Ask the server to put this socket into a per-emergency room so status
 * updates are delivered directly without broadcasting to every client.
 */
export const joinEmergencyRoom = (emergencyId) => {
  if (emergencyId) socket.emit('join-emergency', emergencyId);
};

export default socket;
