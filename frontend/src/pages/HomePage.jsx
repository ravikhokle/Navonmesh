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
import heroBg from '../assets/hero-bg.jpg';

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
      <nav className="bg-gradient-to-r from-[#1a1f2e] to-[#242d3d] sticky top-0 z-50 border-b border-red-900/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-white text-lg font-bold tracking-tight bg-gradient-to-r from-white to-red-300 bg-clip-text text-transparent">Emergex</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-6">
            <a href="#about" className="hidden sm:block text-sm text-gray-300 hover:text-red-400 transition-colors duration-300 font-medium">
              About
            </a>
            <a href="#contact" className="hidden sm:block text-sm text-gray-300 hover:text-red-400 transition-colors duration-300 font-medium">
              Contact
            </a>
            <Link
              to="/citizen"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-300 shadow-lg shadow-red-600/40 hover:shadow-red-600/60 hover:scale-105"
            >
              Emergency SOS
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section (dark) ─── */}
      <section className="bg-gradient-to-br from-[#1a1f2e] via-[#1e2a42] to-[#151e2e] relative overflow-hidden">
        {/* Background Image */}
        <img src={heroBg} alt="Emergency response" className="absolute w-full h-full object-cover opacity-30 pointer-events-none" />
        
        {/* Multiple background glows for depth */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/8 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-20 sm:pb-24 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500/15 to-red-600/5 border border-red-500/30 rounded-full px-5 py-2 mb-8 hover:border-red-500/50 hover:from-red-500/20 transition-all duration-300 shadow-lg shadow-red-500/10">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-red-400">Intelligent Emergency Response</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight max-w-2xl">
            Every Second{' '}
            <br />
            <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-600 bg-clip-text text-transparent animate-pulse">
              Saves a Life
            </span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed font-medium">
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
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:shadow-black/20 hover:border-black px-5 py-6 transition-all duration-300 ease-out hover:translate-y-[-4px] group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/5 group-hover:from-red-500/20 group-hover:to-red-600/10 transition-colors">
                    <StatIcon size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Role Selection (light) ─── */}
      <section className="flex-1 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Select Your Role</h2>
            <p className="mt-3 text-lg text-gray-500 font-medium">Choose your dashboard to get started</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {panels.map(({ to, icon: PanelIcon, label, desc, iconBg }) => (
              <Link
                key={to}
                to={to}
                className="group bg-white rounded-2xl border-2 border-gray-200 shadow-md hover:shadow-2xl hover:shadow-black/20 hover:border-black transition-all duration-300 ease-out p-6 flex flex-col hover:translate-y-[-6px] hover:bg-gradient-to-br hover:from-white hover:to-red-50/30 overflow-hidden relative"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-600/0 group-hover:from-red-500/5 group-hover:to-red-600/5 transition-all duration-300 pointer-events-none" />
                
                {/* Icon */}
                <div
                  className={`w-14 h-14 ${iconBg} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 relative z-10`}
                >
                  <PanelIcon size={24} className="text-white" />
                </div>

                {/* Text */}
                <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">{label}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1 relative z-10 font-medium">{desc}</p>

                {/* CTA */}
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-all duration-300 relative z-10">
                  Open Dashboard
                  <ArrowRight size={16} className="group-hover:translate-x-2 group-hover:scale-125 transition-all duration-300" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-300 bg-gradient-to-r from-white via-gray-50 to-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
            <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Emergex</span>
            <span className="text-gray-500">&bull; NodeCraft Team</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            IMCC, Pune &bull; Navonmesh {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
