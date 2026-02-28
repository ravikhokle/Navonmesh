import { Link, useNavigate } from 'react-router-dom';
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
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
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
    to: '/ers',
    role: 'ers',
    icon: LayoutDashboard,
    label: 'ERS Command',
    desc: 'Coordinate & dispatch emergency units',
    iconBg: 'bg-indigo-500',
  },
  {
    to: '/ambulance',
    role: 'ambulance',
    icon: Truck,
    label: 'Ambulance Driver',
    desc: 'Respond to emergencies in real-time',
    iconBg: 'bg-blue-500',
  },
  {
    to: '/hospital',
    role: 'hospital',
    icon: Building2,
    label: 'Hospital Admin',
    desc: 'Manage beds & incoming patients',
    iconBg: 'bg-emerald-500',
  },
  {
    to: '/traffic',
    role: 'traffic',
    icon: TrafficCone,
    label: 'Traffic Police',
    desc: 'Clear routes & manage traffic flow',
    iconBg: 'bg-gray-500',
  },
];

const stats = [
  { icon: Siren, label: 'Voice-Activated SOS', value: '' },
  { icon: LayoutDashboard, label: 'Intelligent Dispatch', value: '' },
  { icon: Activity, label: 'Real-Time Tracking', value: '' },
  { icon: TrafficCone, label: 'Priority Traffic Clearance', value: '' },
];

const ROLE_ROUTES = {
  ers: '/ers',
  ambulance: '/ambulance',
  hospital: '/hospital',
  traffic: '/traffic',
};

export default function HomePage() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const handleDashboard = () => {
    if (user?.role && ROLE_ROUTES[user.role]) {
      navigate(ROLE_ROUTES[user.role]);
    }
  };

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
          <div className="flex items-center gap-3">
            <Link
              to="/citizen"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-300 shadow-lg shadow-red-600/40 hover:shadow-red-600/60 hover:scale-105"
            >
              Emergency SOS
            </Link>

            {token && user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDashboard}
                  className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:inline">{user.name}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors border border-white/20 hover:border-white/40 px-3.5 py-2 rounded-lg"
              >
                <LogIn size={16} />
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative w-full min-h-[calc(100vh-4rem)] flex items-center overflow-hidden bg-[#0d1117]">
        {/* Full-width background image */}
        <img
          src={heroBg}
          alt="Emergency response"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity: 0.55 }}
        />

        {/* Left-to-right gradient: dark on left for text readability, fades to transparent on right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117] via-[#0d1117]/80 to-transparent pointer-events-none" />
        {/* Bottom fade so stats bar blends in */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0d1117] to-transparent pointer-events-none" />
        {/* Subtle red glow top-right */}
        <div className="absolute -top-20 right-0 w-[480px] h-[480px] bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/40 rounded-full px-5 py-2 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-red-400 tracking-wide">Intelligent Emergency Response</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] max-w-2xl drop-shadow-xl">
            Every Second
            <br />
            <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-600 bg-clip-text text-transparent">
              Saves a Life
            </span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-lg leading-relaxed">
            Real-time coordination between citizens, ambulances, hospitals, and traffic authorities.
            Powered by intelligent routing and instant alerts.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/citizen"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-red-600/40 transition-all duration-300 hover:scale-105 hover:shadow-red-600/60 text-base"
            >
              <Siren size={20} />
              Report Emergency
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ icon: StatIcon, label, value }) => (
              <div
                key={label}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:shadow-black/20 hover:border-black px-5 py-6 transition-all duration-300 ease-out hover:translate-y-[-4px] group cursor-pointer flex flex-col items-center justify-center text-center"
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/5 group-hover:from-red-500/20 group-hover:to-red-600/10 transition-colors mb-3">
                  <StatIcon size={22} className="text-red-500 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-sm font-bold text-gray-900">{label}</span>
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
            {panels.map(({ to, role, icon: PanelIcon, label, desc, iconBg, public: isPublic }) => {
              // Public panels (citizen) are always accessible without login
              const dest = isPublic || token ? to : `/login${role ? `?role=${role}` : ''}`;
              return (
                <Link
                  key={to}
                  to={dest}
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
              );
            })}          </div>
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
