export default function StatusBadge({ status, className = '' }) {
  const styles = {
    critical: 'bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    high: 'bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    medium: 'bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    moderate: 'bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    low: 'bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    en_route: 'bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    assigned: 'bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    picked_up: 'bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    hospital_notified: 'bg-violet-100 text-violet-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    reached_hospital: 'bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    completed: 'bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    idle: 'bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    pending: 'bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg',
    resolved: 'bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-lg',
  };

  return (
    <span className={`${styles[status] || styles.low} ${className}`}>
      {status?.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}
