import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarCustomizerModal } from '../../components/AvatarCustomizerModal';
import {
  ListTodo,
  Clock,
  Activity,
  FileCheck2,
  PauseCircle,
  Plus,
  Eye,
  Camera,
  CalendarCheck,
  Users,
} from 'lucide-react';

export interface DashboardTopFoldMetrics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  reviewTasks: number;
  onHoldTasks: number;
  todayTasks?: number;
  todayProgressTasks?: number;
}

interface DashboardTopFoldProps {
  user: any;
  isAdmin: boolean;
  metrics: DashboardTopFoldMetrics;
}

export const DashboardTopFold: React.FC<DashboardTopFoldProps> = ({
  user,
  isAdmin,
  metrics,
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const role = user?.role || 'employee';
  const gender = (user as any)?.gender || 'female';
  const avatarSrc = (user as any)?.avatar_url || `/assets/roles/${role}_${gender}.png`;

  // 6 KPI cards definition
  const kpiCards = [
    {
      id: 'total',
      label: isAdmin ? 'Total Task' : 'Total Assigned Tasks',
      value: metrics.totalTasks,
      icon: ListTodo,
      path: '/tasks',
    },
    {
      id: 'pending',
      label: isAdmin ? 'Total Pending Tasks' : 'My Action Required',
      value: metrics.pendingTasks,
      icon: Clock,
      path: '/tasks/pending',
    },
    {
      id: 'in_progress',
      label: 'Total In Progress Tasks',
      value: metrics.inProgressTasks,
      icon: Activity,
      path: '/tasks?status=in_progress',
    },
    {
      id: 'completed',
      label: 'Total Completed Tasks',
      value: metrics.completedTasks,
      icon: CalendarCheck,
      path: '/tasks/completed',
    },
    {
      id: 'review',
      label: 'Awaiting Review',
      value: metrics.reviewTasks,
      icon: FileCheck2,
      path: '/tasks/review',
    },
    {
      id: 'on_hold',
      label: isAdmin ? 'On Hold Tasks' : 'My Collaborations',
      value: metrics.onHoldTasks,
      icon: isAdmin ? PauseCircle : Users,
      path: isAdmin ? '/tasks/on-hold' : '/tasks/collaborations',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Real-time overview of tasks, team performance, and operational milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Live Pipeline
          </span>
        </div>
      </div>

      {/* TOP FOLD: HERO WELCOME + 6 KPIs SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Side: Soft Pastel-Blue "Welcome Back!" Hero Card */}
        <div className="lg:col-span-5 xl:col-span-4 bg-gradient-to-br from-[#EEF4FF] via-[#E2ECFF] to-[#D5E4FF] border border-blue-200/80 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col justify-between group">
          {/* Subtle Ambient Decorative Glow */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-400/15 rounded-full blur-2xl pointer-events-none" />

          {/* Card Top: Greeting & Subtitle */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E3A8A] tracking-tight leading-tight">
              Welcome <br /> Back !
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#2563EB] mt-1">
              Quick Life Task Management Dashboard
            </p>
          </div>

          {/* Card Middle: Profile, Stats & 3D Illustration */}
          <div className="my-5 flex items-center justify-between gap-4">
            <div className="space-y-3.5">
              {/* User Avatar & Info */}
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white shadow-md bg-white overflow-hidden shrink-0 relative group/avatar cursor-pointer transition-transform hover:scale-105"
                  title="Click to customize 3D avatar"
                >
                  <img
                    src={avatarSrc}
                    alt={user?.name || 'User Avatar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/roles/admin_avatar.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    {user?.name || 'Admin User'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 capitalize mt-0.5">
                    {user?.role ? user.role.replace('_', ' ') : 'Administrator'}
                  </p>
                </div>
              </div>

              {/* Today Stats Row */}
              <div className="flex items-center gap-6 pt-1">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-800 leading-none">
                    {metrics.todayTasks ?? 0}
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-1">
                    Today Tasks
                  </div>
                </div>
                <div className="h-8 w-px bg-blue-200/80" />
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-800 leading-none">
                    {metrics.todayProgressTasks ?? metrics.inProgressTasks ?? 0}
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-1">
                    Today Progress
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Desk Illustration */}
            <div className="shrink-0 -mr-2 sm:-mr-3">
              <img
                src="/assets/desk_work_3d.png"
                alt="Workspace 3D Illustration"
                className="h-28 sm:h-36 xl:h-40 w-auto object-contain drop-shadow-md select-none pointer-events-none transition-transform group-hover:scale-105 duration-300"
              />
            </div>
          </div>

          {/* Card Bottom: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => navigate('/tasks/create')}
              className="px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shadow-blue-500/25 transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Task</span>
            </button>

            <button
              onClick={() => navigate(isAdmin ? '/tasks' : '/tasks/pending')}
              className="px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shadow-indigo-500/25 transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>View Tasks</span>
            </button>
          </div>
        </div>

        {/* Right Side: 6 Core Task KPI Cards in 3x2 Grid */}
        <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.id}
                onClick={() => navigate(kpi.path)}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400/80 transition-all duration-200 cursor-pointer flex items-center justify-between group"
              >
                <div className="pr-2">
                  <span className="text-sm font-semibold text-slate-500 tracking-normal block">
                    {kpi.label}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight block mt-2 group-hover:text-blue-600 transition-colors">
                    {kpi.value}
                  </span>
                </div>

                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avatar Customizer Modal */}
      <AvatarCustomizerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
