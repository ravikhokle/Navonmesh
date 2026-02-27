import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import useAuthStore from '../stores/authStore';

const ROLES = [
  { value: 'ers', label: 'ERS Command' },
  { value: 'ambulance', label: 'Ambulance Driver' },
  { value: 'hospital', label: 'Hospital Admin' },
  { value: 'traffic', label: 'Traffic Police' },
];

const ROLE_ROUTES = {
  ers: '/ers',
  ambulance: '/ambulance',
  hospital: '/hospital',
  traffic: '/traffic',
};

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Sub-components (outside render to avoid re-creation) ───

function FormInput({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...props}
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-all ${
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-200'
            : 'border-gray-300 focus:ring-2 focus:ring-red-100 focus:border-red-500'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function FormSelect({ label, error, options, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        {...props}
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-all bg-white cursor-pointer ${
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-200'
            : 'border-gray-300 focus:ring-2 focus:ring-red-100 focus:border-red-500'
        } ${!props.value ? 'text-gray-400' : 'text-gray-900'}`}
      >
        <option value="">Select role...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function FormPassword({ label, error, show, onToggle, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm outline-none transition-all ${
            error
              ? 'border-red-400 focus:ring-2 focus:ring-red-200'
              : 'border-gray-300 focus:ring-2 focus:ring-red-100 focus:border-red-500'
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Auth Page
// ═══════════════════════════════════════════════════════════

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleHint = searchParams.get('role') || '';

  // ─── Login State ───
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    role: ROLES.find((r) => r.value === roleHint)?.value || '',
  });
  const [loginErrors, setLoginErrors] = useState({});
  const [showLoginPw, setShowLoginPw] = useState(false);

  // ─── Signup State ───
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    city: '',
    role: ROLES.find((r) => r.value === roleHint)?.value || '',
  });
  const [signupErrors, setSignupErrors] = useState({});
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ─── Mobile tab ───
  const [activeTab, setActiveTab] = useState('login');

  const { login, signup, isLoading } = useAuthStore();

  // ═══════════ LOGIN ═══════════
  const validateLogin = () => {
    const errs = {};
    if (!loginForm.email.trim()) errs.email = 'Email is required';
    else if (!validateEmail(loginForm.email)) errs.email = 'Invalid email format';
    if (!loginForm.password) errs.password = 'Password is required';
    else if (loginForm.password.length < 6) errs.password = 'Minimum 6 characters';
    if (!loginForm.role) errs.role = 'Select a role';
    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    try {
      const user = await login(loginForm.email, loginForm.password, loginForm.role);
      navigate(ROLE_ROUTES[user.role] || '/');
    } catch {
      // toast handled in store
    }
  };

  // ═══════════ SIGNUP ═══════════
  const validateSignup = () => {
    const errs = {};
    if (!signupForm.name.trim()) errs.name = 'Full name is required';
    if (!signupForm.email.trim()) errs.email = 'Email is required';
    else if (!validateEmail(signupForm.email)) errs.email = 'Invalid email format';
    if (!signupForm.password) errs.password = 'Password is required';
    else if (signupForm.password.length < 6) errs.password = 'Minimum 6 characters';
    if (!signupForm.confirm) errs.confirm = 'Confirm your password';
    else if (signupForm.confirm !== signupForm.password) errs.confirm = 'Passwords do not match';
    if (!signupForm.city.trim()) errs.city = 'City is required';
    if (!signupForm.role) errs.role = 'Select a role';
    setSignupErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;
    try {
      const user = await signup({
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        city: signupForm.city,
        role: signupForm.role,
      });
      navigate(ROLE_ROUTES[user.role] || '/');
    } catch {
      // toast handled in store
    }
  };

  // ═══════════ RENDER ═══════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-red-50 flex flex-col">
      {/* Top bar */}
      <div className="px-4 sm:px-8 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-4xl">
          {/* Logo header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-600 rounded-xl mb-3 shadow-lg shadow-red-600/20">
              <Shield size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Emergex</h1>
            <p className="text-sm text-gray-500 mt-0.5">Personnel Authentication Portal</p>
          </div>

          {/* Mobile Tabs */}
          <div className="flex lg:hidden mb-4 bg-white rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-200/80 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* ══════════ LOGIN SIDE ══════════ */}
              <div className={`p-6 sm:p-8 ${activeTab !== 'login' ? 'hidden lg:block' : ''}`}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <LogIn size={16} className="text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Login</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <FormInput
                    label="Email Address"
                    type="email"
                    placeholder="you@emergex.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    error={loginErrors.email}
                  />

                  <FormPassword
                    label="Password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    show={showLoginPw}
                    onToggle={() => setShowLoginPw(!showLoginPw)}
                    error={loginErrors.password}
                  />

                  <FormSelect
                    label="Role"
                    options={ROLES}
                    value={loginForm.role}
                    onChange={(e) => setLoginForm({ ...loginForm, role: e.target.value })}
                    error={loginErrors.role}
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn size={16} />
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-5 text-xs text-gray-400 text-center leading-relaxed">
                  Only authorized ERS, Ambulance, Hospital &amp; Traffic personnel can login.
                  Citizens do not need an account.
                </p>
              </div>

              {/* ══════════ SIGNUP SIDE ══════════ */}
              <div className={`p-6 sm:p-8 border-t lg:border-t-0 lg:border-l border-gray-200 ${activeTab !== 'signup' ? 'hidden lg:block' : ''}`}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <UserPlus size={16} className="text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Sign Up</h2>
                </div>

                <form onSubmit={handleSignup} className="space-y-4" noValidate>
                  <FormInput
                    label="Full Name"
                    type="text"
                    placeholder="John Doe"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    error={signupErrors.name}
                  />

                  <FormInput
                    label="Official Email"
                    type="email"
                    placeholder="john@emergex.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    error={signupErrors.email}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormPassword
                      label="Password"
                      placeholder="Min 6 chars"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      show={showSignupPw}
                      onToggle={() => setShowSignupPw(!showSignupPw)}
                      error={signupErrors.password}
                    />

                    <FormPassword
                      label="Confirm Password"
                      placeholder="Re-enter"
                      value={signupForm.confirm}
                      onChange={(e) => setSignupForm({ ...signupForm, confirm: e.target.value })}
                      show={showConfirmPw}
                      onToggle={() => setShowConfirmPw(!showConfirmPw)}
                      error={signupErrors.confirm}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput
                      label="City"
                      type="text"
                      placeholder="e.g. Pune"
                      value={signupForm.city}
                      onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                      error={signupErrors.city}
                    />

                    <FormSelect
                      label="Role"
                      options={ROLES}
                      value={signupForm.role}
                      onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                      error={signupErrors.role}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Create Account
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-5 text-xs text-gray-400 text-center leading-relaxed">
                  Signup requires admin approval. Your account will be verified before activation.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom note */}
          <p className="text-center text-xs text-gray-400 mt-6">
            All access is monitored and logged &bull; Emergex &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
