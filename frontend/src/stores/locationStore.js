/**
 * locationStore — Global Zustand store for real-time live locations
 *
 * All dashboards share this store. Each receives `location-update`
 * socket events and calls `updateLocation`. Any component can then
 * read the latest position of any userId.
 *
 * Shape of liveLocations:
 *   { [userId]: { lat, lng, role, name, timestamp } }
 *
 * Special userId patterns:
 *   citizen-{emergencyId}  — patient sharing live position
 *   <mongoId>             — ambulance driver or traffic officer
 */

import { create } from 'zustand';
import api from '../lib/axios';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

const useLocationStore = create((set, get) => ({
  liveLocations: {}, // { [userId]: { lat, lng, role, name, timestamp } }

  // Push a location update received from socket
  updateLocation: (data) => {
    if (!data?.userId) return;
    set((state) => ({
      liveLocations: {
        ...state.liveLocations,
        [data.userId]: {
          lat: data.lat,
          lng: data.lng,
          role: data.role ?? 'unknown',
          name: data.name ?? '',
          timestamp: Date.now(),
        },
      },
    }));
  },

  // Fetch initial positions from the server REST cache (for page-refresh scenarios)
  fetchLiveLocations: async () => {
    try {
      const { data } = await api.get('/live-locations');
      // data is { [userId]: { lat, lng, role, name, timestamp } }
      const now = Date.now();
      const fresh = Object.fromEntries(
        Object.entries(data).filter(([, v]) => now - (v.timestamp ?? 0) < STALE_MS)
      );
      set((state) => ({
        liveLocations: { ...state.liveLocations, ...fresh },
      }));
    } catch {
      // Silently ignore — socket events will fill the store anyway
    }
  },

  // Convenient selector: get position for one userId (returns null if unknown/stale)
  getPosition: (userId) => {
    if (!userId) return null;
    const loc = get().liveLocations[userId];
    if (!loc) return null;
    if (Date.now() - loc.timestamp > STALE_MS) return null;
    return { lat: loc.lat, lng: loc.lng };
  },

  // Explicitly remove a single user's location (e.g., ambulance reached hospital)
  removeLocation: (userId) => {
    if (!userId) return;
    set((state) => {
      const next = { ...state.liveLocations };
      delete next[userId];
      return { liveLocations: next };
    });
  },

  // Remove stale entries (called periodically to keep memory clean)
  pruneStale: () => {
    const now = Date.now();
    set((state) => ({
      liveLocations: Object.fromEntries(
        Object.entries(state.liveLocations).filter(([, v]) => now - v.timestamp < STALE_MS)
      ),
    }));
  },
}));

export default useLocationStore;
