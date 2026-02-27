export default function StatusBadge({ status, className = '' }) {
  const styles = {
    critical: 'badge-critical',
    moderate: 'badge-moderate',
    low: 'badge-low',
    en_route: 'bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full',
    picked_up: 'bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full',
    reached_hospital: 'bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full',
    idle: 'bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full',
    pending: 'bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full',
    resolved: 'bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full',
  };

  return (
    <span className={`${styles[status] || styles.low} ${className}`}>
      {status?.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}
