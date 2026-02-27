import { Link } from 'react-router-dom';
import {
  Shield,
  Siren,
  LayoutDashboard,
  Truck,
  Building2,
  TrafficCone,
  ArrowRight,
  Clock,
  CheckCircle2,
  Activity,
  Zap,
} from 'lucide-react';

const panels = [
  {
    to: '/citizen',
    icon: Siren,
    label: 'Citizen',
    desc: 'Report emergencies & track ambulance',
    iconBg: 'bg-red-500',
    public: true,
  },
  {
    to: '/login?role=ers',
    icon: LayoutDashboard,
    label: 'ERS Command',
    desc: 'Coordinate & dispatch emergency units',
    iconBg: 'bg-indigo-500',
  },
  {
    to: '/login?role=ambulance',
    icon: Truck,
    label: 'Ambulance Driver',
    desc: 'Respond to emergencies in real-time',
    iconBg: 'bg-blue-500',
  },
  {
    to: '/login?role=hospital',
    icon: Building2,
    label: 'Hospital Admin',
    desc: 'Manage beds & incoming patients',
    iconBg: 'bg-emerald-500',
  },
  {
    to: '/login?role=traffic',
    icon: TrafficCone,
    label: 'Traffic Police',
    desc: 'Clear routes & manage traffic flow',
    iconBg: 'bg-gray-500',
  },
];

const stats = [
  { icon: Clock, label: 'Avg. Response', value: '6.2 min' },
  { icon: CheckCircle2, label: 'Success Rate', value: '94.2%' },
  { icon: Activity, label: 'Active Units', value: '12' },
  { icon: Zap, label: 'Emergencies Today', value: '23' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ─── Navbar ─── */}
      <nav className="bg-[#1a1f2e] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-white text-lg font-bold tracking-tight">Emergex</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-6">
            <a href="#about" className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors">
              About
            </a>
            <a href="#contact" className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors">
              Contact
            </a>
            <Link
              to="/citizen"
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Emergency SOS
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section (dark) ─── */}
      <section className="bg-gradient-to-br from-[#1a1f2e] via-[#1e2538] to-[#1a1f2e] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-20 sm:pb-24 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-400">Intelligent Emergency Response</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight max-w-2xl">
            Every Second{' '}
            <br />
            <span className="text-red-500">Saves a Life</span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed">
            Real-time coordination between citizens, ambulances, hospitals, and traffic authorities.
            Powered by intelligent routing and instant alerts.
          </p>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="relative z-10 -mt-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ icon: StatIcon, label, value }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <StatIcon size={16} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">{label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Role Selection (light) ─── */}
      <section className="flex-1 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Select Your Role</h2>
            <p className="mt-2 text-gray-500">Choose your dashboard to get started</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {panels.map(({ to, icon: PanelIcon, label, desc, iconBg }) => (
              <Link
                key={to}
                to={to}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-6 flex flex-col"
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-5`}
                >
                  <PanelIcon size={22} className="text-white" />
                </div>

                {/* Text */}
                <h3 className="text-base font-bold text-gray-900 mb-1">{label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">{desc}</p>

                {/* CTA */}
                <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                  Open Dashboard
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
              <Shield size={12} className="text-white" />
            </div>
            <span className="font-medium text-gray-700">Emergex</span>
            <span>&bull; NodeCraft Team</span>
          </div>
          <p className="text-sm text-gray-400">
            IMCC, Pune &bull; Navonmesh {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
