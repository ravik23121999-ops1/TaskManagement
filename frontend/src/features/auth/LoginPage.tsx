import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  Layers,
  Eye,
  EyeOff,
  Crown,
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  GitBranch,
  FileCheck2,
  ClipboardList,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('ravi@company.com');
  const [password, setPassword] = useState('password');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'sub_admin' | 'employee'>('admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (roleKey: 'admin' | 'sub_admin' | 'employee', roleEmail: string) => {
    setSelectedRole(roleKey);
    setEmail(roleEmail);
    setPassword('password');
    setError('');
  };

  const handleInstantSignIn = async (roleEmail: string, roleKey: 'admin' | 'sub_admin' | 'employee') => {
    setSelectedRole(roleKey);
    setEmail(roleEmail);
    setPassword('password');
    setError('');
    setLoading(true);

    try {
      await login(roleEmail, 'password');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#080d1e] selection:bg-blue-600 selection:text-white">
      {/* ======================================================== */}
      {/* LEFT COLUMN: Clean, Pleasant, Professional Auth Console */}
      {/* ======================================================== */}
      <div className="w-full lg:w-[48%] xl:w-[45%] p-6 sm:p-10 lg:p-14 flex flex-col justify-between bg-white z-10 shadow-2xl relative">
        <div className="max-w-md w-full mx-auto my-auto py-2">
          {/* Brand Header */}
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 border border-white/20">
              <Layers className="w-6 h-6 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">QuickLifeNow</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-tight">Internal Enterprise Management Suite</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign in to your workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select an authorized demo role for instant 1-click access, or sign in manually.
            </p>
          </div>

          {/* 1-CLICK QUICK ACCESS ROLE CARDS */}
          <div className="space-y-2.5 mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Authorized Role Accounts
              </span>
              <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>1-Click Instant Login</span>
              </span>
            </div>

            {/* Admin Role Card */}
            <div
              onClick={() => handleSelectRole('admin', 'ravi@company.com')}
              className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                selectedRole === 'admin'
                  ? 'border-amber-400 bg-amber-50/70 shadow-sm ring-2 ring-amber-400/25'
                  : 'border-slate-200/90 hover:border-amber-300 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">System Administrator</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                      Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">ravi@company.com • Full Audit & Logs</p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstantSignIn('ravi@company.com', 'admin');
                }}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition hover:scale-105 cursor-pointer shrink-0 flex items-center gap-1"
                title="Log in immediately as Administrator"
              >
                <span>Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sub-Admin Role Card */}
            <div
              onClick={() => handleSelectRole('sub_admin', 'priya@company.com')}
              className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                selectedRole === 'sub_admin'
                  ? 'border-purple-400 bg-purple-50/70 shadow-sm ring-2 ring-purple-400/25'
                  : 'border-slate-200/90 hover:border-purple-300 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">Operations Sub-Admin</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-800">
                      Operations
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">priya@company.com • Review Queue Gate</p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstantSignIn('priya@company.com', 'sub_admin');
                }}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs shadow-xs transition hover:scale-105 cursor-pointer shrink-0 flex items-center gap-1"
                title="Log in immediately as Operations Sub-Admin"
              >
                <span>Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Employee Role Card */}
            <div
              onClick={() => handleSelectRole('employee', 'karan@gmail.com')}
              className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                selectedRole === 'employee'
                  ? 'border-emerald-400 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-400/25'
                  : 'border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">Team Contributor</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                      Employee
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">karan@gmail.com • Tasks & Branch Work</p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstantSignIn('karan@gmail.com', 'employee');
                }}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition hover:scale-105 cursor-pointer shrink-0 flex items-center gap-1"
                title="Log in immediately as Employee"
              >
                <span>Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Form Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold text-[10px] tracking-wider">
                Or sign in with email credentials
              </span>
            </div>
          </div>

          {/* Manual Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Company Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-medium">Remember on this browser</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Please contact your System Administrator to reset your password.')}
                className="text-blue-600 hover:text-blue-800 font-bold transition cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:from-blue-700 active:to-cyan-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Console Footer */}
        <div className="max-w-md w-full mx-auto pt-6 text-center text-xs text-slate-400 flex items-center justify-between border-t border-slate-100">
          <span>© 2026 QuickLifeNow Inc.</span>
          <span>Enterprise Suite v2.5</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: Prestigious 3D Enterprise Showcase         */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] bg-gradient-to-br from-[#070b1a] via-[#0c1633] to-[#060a17] p-10 xl:p-14 flex-col justify-between items-center text-white relative overflow-hidden select-none">
        {/* Soft Ambient Radial Flares */}
        <div className="pointer-events-none absolute -top-28 -right-28 w-[450px] h-[450px] bg-blue-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)]" />

        {/* Top Operational Pill */}
        <div className="w-full flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Enterprise Engine Active</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>SOC-2 Compliant</span>
            <span>•</span>
            <span>TLS 1.3 Guard</span>
          </div>
        </div>

        {/* Centerpiece 3D Visual & Showcase */}
        <div className="w-full max-w-lg my-auto relative z-10 flex flex-col items-center text-center space-y-6">
          {/* Master 3D Showcase Artwork Container */}
          <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-white/15 bg-white/[0.03] backdrop-blur-2xl p-2 group">
            <div className="rounded-2xl overflow-hidden relative">
              <img
                src="/assets/enterprise_showcase.png"
                alt="QuickLifeNow Enterprise Studio Showcase"
                className="w-full h-auto object-cover group-hover:scale-103 transition-transform duration-700 drop-shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b1a]/90 via-transparent to-transparent" />
            </div>

            {/* Floating Glassmorphism Badge 1 (Top Left) */}
            <div className="absolute top-5 left-5 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-white/20 text-[11px] font-bold text-white shadow-xl flex items-center gap-2 backdrop-blur-md">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Branch Collaboration</span>
            </div>

            {/* Floating Glassmorphism Badge 2 (Top Right) */}
            <div className="absolute top-5 right-5 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-white/20 text-[11px] font-bold text-white shadow-xl flex items-center gap-2 backdrop-blur-md">
              <FileCheck2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Stage Review Gates</span>
            </div>

            {/* Floating Glassmorphism Badge 3 (Bottom Center) */}
            <div className="absolute bottom-5 inset-x-8 px-4 py-2 rounded-xl bg-slate-900/90 border border-white/20 text-xs font-bold text-white shadow-2xl flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <span>Work Logs & Audit Dossier</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Verified
              </span>
            </div>
          </div>

          {/* Inspirational Enterprise Headline */}
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white">
              Internal Enterprise Orchestration Built for Velocity
            </h2>
            <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed font-medium max-w-md mx-auto">
              Automated delegation chains, real-time stage approvals, and full transparency across all deliverables from creation to completion.
            </p>
          </div>
        </div>

        {/* Bottom Security Footer */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 relative z-10 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-medium">Sanctum Token Guard Protected</span>
          </div>
          <span>Internal Enterprise Management Suite</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
