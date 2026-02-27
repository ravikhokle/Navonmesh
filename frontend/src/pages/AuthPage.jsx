import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, LogIn, UserPlus, Mail, ArrowRight } from 'lucide-react';
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

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleHint = searchParams.get('role') || '';

  const [activeTab, setActiveTab] = useState('login');

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
  const [signupSuccess, setSignupSuccess] = useState(false);

  const { login, signup, isLoading } = useAuthStore();

  // ═══════ LOGIN ═══════
  const validateLogin = () => {
    const errs = {};
    if (!loginForm.email.trim()) errs.email = 'Email is required';
    else if (!validateEmail(loginForm.email)) errs.email = 'Invalid email format';
    if (!loginForm.password) errs.password = 'Password is required';
    else if (loginForm.password.length < 6) errs.password = 'Min 6 characters';
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

  // ═══════ SIGNUP ═══════
  const validateSignup = () => {
    const errs = {};
    if (!signupForm.name.trim()) errs.name = 'Full name is required';
    if (!signupForm.email.trim()) errs.email = 'Email is required';
    else if (!validateEmail(signupForm.email)) errs.email = 'Invalid email format';
    if (!signupForm.password) errs.password = 'Password is required';
    else if (signupForm.password.length < 6) errs.password = 'Min 6 characters';
    if (!signupForm.confirm) errs.confirm = 'Confirm your password';
    else if (signupForm.confirm !== signupForm.password) errs.confirm = "Passwords don't match";
    if (!signupForm.city.trim()) errs.city = 'City is required';
    if (!signupForm.role) errs.role = 'Select a role';
    setSignupErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;
    try {
      await signup({
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        city: signupForm.city,
        role: signupForm.role,
      });
      setSignupSuccess(true);
    } catch {
      // toast handled in store
    }
  };

  // ═══════ RENDER ═══════
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* ── Logo ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-600 rounded-xl mb-3 shadow-lg shadow-red-600/20">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Emergex</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your dashboard</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/60 p-1.5 mx-4 mt-4 rounded-xl">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setSignupSuccess(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <UserPlus size={15} />
              Sign Up
            </button>
          </div>

          {/* ══════════ LOGIN TAB ══════════ */}
          {activeTab === 'login' && (
            <div className="p-6 pt-5">
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-all ${
                      loginErrors.email
                        ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                    }`}
                  />
                  {loginErrors.email && <p className="mt-1 text-xs text-red-500">{loginErrors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showLoginPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm outline-none transition-all ${
                        loginErrors.password
                          ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                          : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPw(!showLoginPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showLoginPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="mt-1 text-xs text-red-500">{loginErrors.password}</p>}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <select
                    value={loginForm.role}
                    onChange={(e) => setLoginForm({ ...loginForm, role: e.target.value })}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-all bg-white cursor-pointer ${
                      loginErrors.role
                        ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                    } ${!loginForm.role ? 'text-gray-400' : 'text-gray-900'}`}
                  >
                    <option value="">Select role...</option>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {loginErrors.role && <p className="mt-1 text-xs text-red-500">{loginErrors.role}</p>}
                </div>

                {/* Forgot password */}
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 hover:from-gray-800 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-gray-900/20"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Footer */}
              <p className="mt-5 text-center text-sm text-gray-400">
                Citizens don't need an account.{' '}
                <Link to="/citizen" className="text-red-600 hover:text-red-700 font-semibold transition-colors">
                  Go to SOS <ArrowRight size={13} className="inline mb-0.5" />
                </Link>
              </p>
            </div>
          )}

          {/* ══════════ SIGNUP TAB ══════════ */}
          {activeTab === 'signup' && (
            <div className="p-6 pt-5">
              {signupSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={28} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Check Your Email</h3>
                  <p className="text-sm text-gray-500 mb-1">
                    We've sent a verification link to
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mb-4">{signupForm.email}</p>
                  <p className="text-xs text-gray-400 mb-6">
                    Click the link to verify, then come back and sign in.
                  </p>
                  <button
                    onClick={() => { setSignupSuccess(false); setActiveTab('login'); }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-gray-900/20 hover:from-gray-800 hover:to-gray-700"
                  >
                    <LogIn size={16} />
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSignup} className="space-y-4" noValidate>
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={signupForm.name}
                        onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-all ${
                          signupErrors.name ? 'border-red-400' : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                        }`}
                      />
                      {signupErrors.name && <p className="mt-1 text-xs text-red-500">{signupErrors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-all ${
                          signupErrors.email ? 'border-red-400' : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                        }`}
                      />
                      {signupErrors.email && <p className="mt-1 text-xs text-red-500">{signupErrors.email}</p>}
                    </div>

                    {/* Password + Confirm */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showSignupPw ? 'text' : 'password'}
                            placeholder="Min 6 chars"
                            value={signupForm.password}
                            onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                            className={`w-full px-3.5 py-2.5 pr-9 border rounded-lg text-sm outline-none transition-all ${
                              signupErrors.password ? 'border-red-400' : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                            }`}
                          />
                          <button type="button" onClick={() => setShowSignupPw(!showSignupPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                            {showSignupPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {signupErrors.password && <p className="mt-1 text-xs text-red-500">{signupErrors.password}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm</label>
                        <div className="relative">
                          <input
                            type={showConfirmPw ? 'text' : 'password'}
                            placeholder="Re-enter"
                            value={signupForm.confirm}
                            onChange={(e) => setSignupForm({ ...signupForm, confirm: e.target.value })}
                            className={`w-full px-3.5 py-2.5 pr-9 border rounded-lg text-sm outline-none transition-all ${
                              signupErrors.confirm ? 'border-red-400' : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                            }`}
                          />
                          <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                            {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {signupErrors.confirm && <p className="mt-1 text-xs text-red-500">{signupErrors.confirm}</p>}
                      </div>
                    </div>

                    {/* City + Role */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                        <input
                          type="text"
                          placeholder="e.g. Pune"
                          value={signupForm.city}
                          onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                          className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-all ${
                            signupErrors.city ? 'border-red-400' : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                          }`}
                        />
                        {signupErrors.city && <p className="mt-1 text-xs text-red-500">{signupErrors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                        <select
                          value={signupForm.role}
                          onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                          className={`w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-all bg-white cursor-pointer ${
                            signupErrors.role ? 'border-red-400' : 'border-gray-200 focus:ring-2 focus:ring-red-100 focus:border-red-400'
                          } ${!signupForm.role ? 'text-gray-400' : 'text-gray-900'}`}
                        >
                          <option value="">Select...</option>
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        {signupErrors.role && <p className="mt-1 text-xs text-red-500">{signupErrors.role}</p>}
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 hover:from-gray-800 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-gray-900/20 mt-1"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </form>

                  {/* Footer */}
                  <p className="mt-5 text-center text-sm text-gray-400">
                    Citizens don't need an account.{' '}
                    <Link to="/citizen" className="text-red-600 hover:text-red-700 font-semibold transition-colors">
                      Go to SOS <ArrowRight size={13} className="inline mb-0.5" />
                    </Link>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
