export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

export const MAP_DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // New Delhi default
export const MAP_DEFAULT_ZOOM = 13;

export const ROLES = {
  CITIZEN: 'citizen',
  ERS: 'ers',
  AMBULANCE: 'ambulance',
  HOSPITAL: 'hospital',
  TRAFFIC: 'traffic',
};

export const PRIORITY = {
  CRITICAL: 'critical',
  MODERATE: 'moderate',
  LOW: 'low',
};

export const PRIORITY_COLORS = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  moderate: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
};

export const AMBULANCE_STATUS = {
  IDLE: 'idle',
  EN_ROUTE: 'en_route',
  PICKED_UP: 'picked_up',
  REACHED: 'reached_hospital',
};
