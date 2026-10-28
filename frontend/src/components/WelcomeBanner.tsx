import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarCustomizerModal } from './AvatarCustomizerModal';
import {
  Crown,
  Shield,
  Zap,
  ClipboardList,
  PlusCircle,
  FileCheck2,
  Users2,
  Clock,
  ChevronRight,
  TrendingUp,
  Camera,
} from 'lucide-react';

interface WelcomeBannerProps {
  user: {
    id?: number;
    name: string;
    role: string;
    email?: string;
  } | null;
  metrics?: {
    totalTasks?: number;
    inProgress?: number;
    pendingReview?: number;
    completed?: number;
    myAction?: number;
  };
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ user, metrics }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const role = user?.role || 'employee';
  const isAdmin = role === 'admin';
  const isSubAdmin = role === 'sub_admin';

  const gender = (user as any)?.gender || 'female';
  const avatarSrc = (user as any)?.avatar_url || `/assets/roles/${role}_${gender}.png`;

  // Time of day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Role Configuration
  const roleConfig = {
    admin: {
      tag: 'EXECUTIVE COMMAND CENTER',
      tagColor: 'from-amber-400 to-amber-500 text-amber-950 shadow-amber-500/20',
      badgeBorder: 'border-amber-400/30',
      gradientBg: 'from-[#0b132b] via-[#121c42] to-[#0a0f24]',
      glowColor: 'bg-blue-500/20',
      accentColor: 'text-amber-400',
      roleTitle: 'System Administrator',
      tagline: 'Full operational control and company-wide transparency active. Oversee all task journeys, employee communications, and deliverable handovers.',
      avatarImg: '/assets/roles/admin_avatar.png',
      icon: Crown,
      kpi1Label: 'Live Oversight',
      kpi1Val: `${metrics?.totalTasks ?? 0} Tasks`,
      kpi2Label: 'Awaiting Sign-off',
      kpi2Val: `${metrics?.pendingReview ?? 0} Reviews`,
      actions: [
        {
          label: 'Audit Work Logs',
          icon: ClipboardList,
          onClick: () => navigate('/work-logs'),
          primary: true,
        },
        {
          label: 'Create New Task',
          icon: PlusCircle,
          onClick: () => navigate('/tasks/create'),
          primary: false,
        },
      ],
    },
    sub_admin: {
      tag: 'OPERATIONS & REVIEW HEAD',
      tagColor: 'from-purple-400 to-violet-500 text-purple-950 shadow-purple-500/20',
      badgeBorder: 'border-purple-400/30',
      gradientBg: 'from-[#140f28] via-[#1d1640] to-[#0c091d]',
      glowColor: 'bg-purple-500/20',
      accentColor: 'text-purple-400',
      roleTitle: 'Operations Sub-Admin',
      tagline: 'Cross-department velocity is running smoothly. Evaluate stage submissions, resolve bottlenecks, and unblock collaborating team members.',
      avatarImg: '/assets/roles/sub_admin_avatar.png',
      icon: Shield,
      kpi1Label: 'In Progress',
      kpi1Val: `${metrics?.inProgress ?? 0} Tasks`,
      kpi2Label: 'Review Queue',
      kpi2Val: `${metrics?.pendingReview ?? 0} Pending`,
      actions: [
        {
          label: 'Review Submissions',
          icon: FileCheck2,
          onClick: () => navigate('/tasks/review'),
          primary: true,
        },
        {
          label: 'Inspect Work Logs',
          icon: ClipboardList,
          onClick: () => navigate('/work-logs'),
          primary: false,
        },
      ],
    },
    employee: {
      tag: 'PERSONAL PRODUCTIVITY HUB',
      tagColor: 'from-emerald-400 to-teal-500 text-emerald-950 shadow-emerald-500/20',
      badgeBorder: 'border-emerald-400/30',
      gradientBg: 'from-[#0a1826] via-[#0d2238] to-[#08121f]',
      glowColor: 'bg-teal-500/20',
      accentColor: 'text-teal-400',
      roleTitle: 'Productivity Specialist',
      tagline: 'Your focus station is primed. Execute assigned deliverables, collaborate with your teammates, and submit stages for approval.',
      avatarImg: '/assets/roles/employee_avatar.png',
      icon: Zap,
      kpi1Label: 'My Action Required',
      kpi1Val: `${metrics?.myAction ?? 0} Active`,
      kpi2Label: 'In Progress',
      kpi2Val: `${metrics?.inProgress ?? 0} Ongoing`,
      actions: [
        {
          label: 'My Pending Tasks',
          icon: Zap,
          onClick: () => navigate('/tasks/pending'),
          primary: true,
        },
        {
          label: 'My Collaborations',
          icon: Users2,
          onClick: () => navigate('/tasks/collaborations'),
          primary: false,
        },
      ],
    },
  };

  const current = isAdmin ? roleConfig.admin : isSubAdmin ? roleConfig.sub_admin : roleConfig.employee;
  const RoleIcon = current.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${current.gradientBg} p-6 sm:p-8 text-white shadow-2xl border border-white/10 select-none transition-all duration-300`}
    >
      {/* Background Animated Ambient Mesh and Glow Orbs */}
      <div className={`pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full ${current.glowColor} blur-3xl animate-pulse`} />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />

      {/* Grid Pattern Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Column: Greeting, Role Tag, Tagline, Action Buttons */}
        <div className="flex-1 max-w-2xl space-y-4">
          {/* Top Tag & Live Status Pill */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r ${current.tagColor} shadow-md`}
            >
              <RoleIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{current.tag}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/10 border border-white/10 text-slate-200 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>System Operational</span>
            </span>
          </div>

          {/* Headline Greeting with Name */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3 flex-wrap">
              <span>{greeting}, {user?.name || 'Commander'}!</span>
              <span className="text-2xl animate-bounce">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 mt-1 font-medium leading-relaxed">
              {current.tagline}
            </p>
          </div>

          {/* Quick Metrics Bar inside Banner */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] text-slate-300 font-medium">{current.kpi1Label}:</span>
              <span className="text-xs font-bold text-white">{current.kpi1Val}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-slate-300 font-medium">{current.kpi2Label}:</span>
              <span className="text-xs font-bold text-white">{current.kpi2Val}</span>
            </div>
          </div>

          {/* Action Button Links */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            {current.actions.map((act, idx) => {
              const ActionIcon = act.icon;
              return (
                <button
                  key={idx}
                  onClick={act.onClick}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md ${
                    act.primary
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 hover:-translate-y-0.5'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md hover:-translate-y-0.5'
                  }`}
                >
                  <ActionIcon className="w-4 h-4" />
                  <span>{act.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: 3D Illustration / Animated Avatar Visual */}
        <div className="relative flex items-center justify-center lg:justify-end shrink-0">
          {/* Animated Halo Rings */}
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 flex items-center justify-center">
            {/* Outer Rotating Glow Ring */}
            <div
              className={`absolute inset-0 rounded-full border border-dashed border-white/20 animate-[spin_25s_linear_infinite]`}
            />
            {/* Middle Pulsing Ring */}
            <div
              className={`absolute inset-3 rounded-full border border-white/10 ${current.glowColor} animate-ping opacity-25`}
            />
            {/* Inner Glass Orb Backdrop with Change Avatar Trigger */}
            <div
              onClick={() => setIsModalOpen(true)}
              className="absolute inset-4 rounded-full bg-gradient-to-tr from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden cursor-pointer group/avatar"
              title="Click to customize avatar or upload photo"
            >
              {/* If image loads successfully */}
              {!imgError ? (
                <img
                  src={avatarSrc}
                  alt={current.roleTitle}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-500 drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)] animate-float"
                />
              ) : (
                /* Fallback SVG 3D Badge */
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${
                      isAdmin
                        ? 'from-amber-500 to-yellow-300'
                        : isSubAdmin
                        ? 'from-purple-500 to-violet-300'
                        : 'from-emerald-500 to-teal-300'
                    } flex items-center justify-center text-slate-900 shadow-xl shadow-black/30 mb-2 transform hover:rotate-6 transition`}
                  >
                    <RoleIcon className="w-9 h-9" />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {current.roleTitle}
                  </span>
                </div>
              )}

              {/* Hover Badge to change avatar */}
              <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-xs">
                <Camera className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="text-[10px] font-extrabold tracking-wide uppercase">Change Photo</span>
              </div>
            </div>

            {/* Orbiting Floating Badge with Edit Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="absolute -bottom-2 -right-1 px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-[10px] font-bold text-white shadow-xl flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition hover:scale-105"
            >
              <Camera className="w-3 h-3 text-cyan-400" />
              <span>{isAdmin ? 'Commander' : isSubAdmin ? 'Operations' : 'Active Contributor'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Avatar / Photo Customizer Modal */}
      <AvatarCustomizerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
