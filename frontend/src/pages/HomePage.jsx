import { Link } from 'react-router-dom';
import {
  Shield,
  Siren,
  LayoutDashboard,
  Truck,
  Building2,
  TrafficCone,
  Lock,
  ArrowRight,
} from 'lucide-react';

const panels = [
  {
    to: '/citizen',
    icon: Siren,
    label: 'Citizen SOS',
    desc: 'Report an emergency instantly. No login required.',
    color: 'from-red-600 to-rose-600',
    shadow: 'shadow-red-500/25',
    public: true,
  },
  {
    to: '/login?role=ers',
    icon: LayoutDashboard,
    label: 'ERS Command',
    desc: 'Emergency Response coordination & dispatching.',
    color: 'from-indigo-600 to-blue-600',
    shadow: 'shadow-indigo-500/25',
  },
  {
    to: '/login?role=ambulance',
    icon: Truck,
    label: 'Ambulance',
    desc: 'View assignments, update pickup & route status.',
    color: 'from-sky-600 to-cyan-600',
    shadow: 'shadow-sky-500/25',
  },
  {
    to: '/login?role=hospital',
    icon: Building2,
    label: 'Hospital',
    desc: 'Manage beds, accept or reject incoming patients.',
    color: 'from-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-500/25',
  },
  {
    to: '/login?role=traffic',
    icon: TrafficCone,
    label: 'Traffic Police',
    desc: 'Toggle duty status, clear emergency routes.',
    color: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/25',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Background blurs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-12 pb-6 text-center px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-2xl mb-6 shadow-xl shadow-red-600/30">
          <Shield size={40} className="text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Emergex
        </h1>
        <p className="mt-3 text-lg text-gray-400 max-w-lg mx-auto">
          High-tech emergency coordination — fast, connected, life-saving.
        </p>
      </header>

      {/* Panel Grid */}
      <main className="relative z-10 flex-1 flex items-start justify-center px-4 pb-16 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl w-full">
          {panels.map(({ to, icon: Icon, label, desc, color, shadow, public: isPublic }) => (
            <Link
              key={to}
              to={to}
              className={`group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${shadow}`}
            >
              {/* Icon pill */}
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg ${shadow}`}
              >
                <Icon size={26} className="text-white" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                {label}
                {!isPublic && <Lock size={14} className="text-gray-500" />}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">{desc}</p>

              <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 group-hover:text-white transition-colors">
                {isPublic ? 'Open' : 'Login to access'}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>

              {isPublic && (
                <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full">
                  No login
                </span>
              )}
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8 text-xs text-gray-600">
        Emergex &copy; {new Date().getFullYear()} &mdash; Emergency Coordination System
      </footer>
    </div>
  );
}
