import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Siren,
  Truck,
  Building2,
  TrafficCone,
  LogOut,
  Menu,
  X,
  Shield,
  Home,
  Pencil,
  Save,
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../stores/authStore';

const roleNavItems = {
  citizen: [{ to: '/citizen', icon: Siren, label: 'Emergency SOS' }],
  ers: [{ to: '/ers', icon: LayoutDashboard, label: 'ERS Dashboard' }],
  ambulance: [{ to: '/ambulance', icon: Truck, label: 'Ambulance' }],
  hospital: [{ to: '/hospital', icon: Building2, label: 'Hospital' }],
  traffic: [{ to: '/traffic', icon: TrafficCone, label: 'Traffic Police' }],
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', city: '' });
  const { user, logout, updateProfile, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'citizen';
  const navItems = roleNavItems[role] || roleNavItems.citizen;

  const isCitizen = !user || role === 'citizen';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openProfile = () => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      city: user?.city || '',
    });
    setShowProfile(true);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileForm);
      setShowProfile(false);
    } catch { /* toasted by store */ }
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#1a1f2e] text-white p-2.5 rounded-xl shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#1a1f2e] to-[#151b28] transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-red-300 bg-clip-text text-transparent">Emergex</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest -mt-0.5">
              Emergency System
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Home size={18} />
            Home
          </Link>
          {navItems.map(({ to, icon: NavIcon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-red-500/15 text-red-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <NavIcon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + Logout */}
        <div className="p-4 border-t border-white/10">
          {isCitizen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <Siren size={14} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Citizen</p>
                <p className="text-xs text-gray-500">No login required</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-sm shadow-red-500/20">
                  <span className="text-xs font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{role}</p>
                </div>
                <button
                  onClick={openProfile}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Edit Profile"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Profile Edit Modal ── */}
      {showProfile && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setShowProfile(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
                <button
                  onClick={() => setShowProfile(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    disabled
                    className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfile(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save size={14} />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
