import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import {
  LayoutDashboard,
  Zap,
  ListTodo,
  Clock,
  Users2,
  FileCheck2,
  CheckCircle2,
  PauseCircle,
  PlusCircle,
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Layers,
  ClipboardList,
  Crown,
  Shield,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Ban,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleNav = (path: string) => {
    navigate(path);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const mainMenuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks/pending', label: 'My Action Required', icon: Zap, badge: 'Active' },
    { path: '/tasks/pending-with-others', label: 'Waiting on Others', icon: Clock },
    { path: '/tasks', label: 'All Tasks', icon: ListTodo },
    { path: '/tasks/collaborations', label: 'My Collaborations', icon: Users2 },
    { path: '/messages', label: 'Work Messages', icon: MessageSquare, badge: 'Direct' },
    { path: '/tasks/review', label: 'Review Queue', icon: FileCheck2 },
    { path: '/tasks/completed', label: 'Completed', icon: CheckCircle2 },
    { path: '/tasks/on-hold', label: 'On Hold', icon: PauseCircle },
    { path: '/tasks/cancelled', label: 'Cancelled Tasks', icon: Ban },
  ];

  const manageMenuItems = [
    { path: '/work-logs', label: 'Work Logs', icon: ClipboardList, badge: 'Audit' },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/departments', label: 'Departments', icon: Building2 },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/tasks') {
      const specialSubPages = ['pending', 'pending-with-others', 'my-action', 'collaborations', 'review', 'completed', 'on-hold', 'cancelled', 'create'];
      const isSpecial = specialSubPages.some((sub) => location.pathname.startsWith(`/tasks/${sub}`));
      return location.pathname === '/tasks' || (location.pathname.startsWith('/tasks/') && !isSpecial);
    }
    if (path === '/tasks/pending') {
      return (
        location.pathname === '/tasks/pending' ||
        location.pathname === '/pending' ||
        location.pathname === '/tasks/my-action'
      );
    }
    if (path === '/settings') {
      return location.pathname === '/settings' || location.pathname === '/profile';
    }
    if (path !== '/' && location.pathname === path) return true;
    if (path.startsWith('/tasks/') && location.pathname.startsWith(path)) return true;
    return false;
  };

  const role = user?.role || 'employee';
  const isAdmin = role === 'admin';
  const isSubAdmin = role === 'sub_admin';
  const isAdminOrSubAdmin = isAdmin || isSubAdmin;

  const gender = user?.gender || 'female';
  const avatarSrc = user?.avatar_url || `/assets/roles/${role}_${gender}.png`;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`bg-gradient-to-b from-[#080d1e] via-[#0b1328] to-[#050814] text-slate-300 h-screen max-h-screen flex flex-col fixed left-0 top-0 z-50 shadow-2xl border-r border-slate-800/80 select-none overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Ambient Top Glow Accent */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-52 h-52 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -left-24 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* Brand Header */}
        <div
          className={`border-b border-slate-800/80 flex items-center relative z-10 shrink-0 bg-[#070b18]/70 backdrop-blur-md transition-all duration-300 ${
            collapsed ? 'p-3 justify-center' : 'p-4 sm:p-5 justify-between'
          }`}
        >
          {collapsed ? (
            <div
              className="relative group cursor-pointer"
              onClick={() => handleNav('/')}
              title="QuickLifeNow"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.45)] border border-white/20 hover:scale-105 transition-transform duration-200">
                <Layers className="w-5 h-5 drop-shadow" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080d1e] shadow-[0_0_8px_#34d399] animate-pulse" />

              {/* Floating Tooltip in Collapsed Mode */}
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                QuickLifeNow
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => handleNav('/')}>
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.45)] border border-white/20 group-hover:scale-105 transition-transform duration-200">
                    <Layers className="w-5 h-5 drop-shadow" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080d1e] shadow-[0_0_8px_#34d399] animate-pulse" />
                </div>
                <div className="cursor-pointer" onClick={() => handleNav('/')}>
                  <h1 className="text-base font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    QuickLifeNow
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    <p className="text-[10px] text-slate-400 font-medium tracking-tight">Internal Enterprise Management</p>
                  </div>
                </div>
              </div>

              {/* Desktop Quick Collapse Button */}
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={onMobileClose}
                className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Quick Create Task Action Button */}
        <div className={`pt-3 shrink-0 transition-all duration-300 ${collapsed ? 'px-2 flex justify-center' : 'px-3'}`}>
          {collapsed ? (
            <button
              onClick={() => handleNav('/tasks/create')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative group ${
                location.pathname === '/tasks/create'
                  ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-blue-500/35 border border-cyan-300/40'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-600/25 hover:scale-105 border border-blue-400/30'
              }`}
              title="Create New Task"
            >
              <PlusCircle className="w-5 h-5 text-white" />
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                Create New Task
              </div>
            </button>
          ) : (
            <button
              onClick={() => handleNav('/tasks/create')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                location.pathname === '/tasks/create'
                  ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-blue-500/35 border border-cyan-300/40'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-500/35 border border-blue-400/30 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-cyan-200" />
                <span>Create New Task</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
            </button>
          )}
        </div>

        {/* Navigation List - Flexibly scrollable without pushing footer off screen */}
        <nav
          className={`flex-1 min-h-0 py-3 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800/80 hover:scrollbar-thumb-slate-700 scrollbar-track-transparent ${
            collapsed ? 'px-2' : 'px-3'
          }`}
        >
          {/* Core Workspace Section */}
          <div>
            {collapsed ? (
              <div className="my-2 h-px bg-slate-800/80 mx-2" />
            ) : (
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400/90">
                  Core Workspace
                </span>
                <span className="h-px flex-1 ml-3 bg-gradient-to-r from-slate-700/80 via-slate-800/40 to-transparent" />
              </div>
            )}

            <ul className="space-y-1">
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNav(item.path)}
                      className={`w-full group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        collapsed
                          ? 'justify-center p-2.5'
                          : 'justify-between px-3.5 py-2'
                      } ${
                        active
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 font-bold border border-blue-400/30'
                          : 'text-slate-300/90 hover:bg-white/[0.07] hover:text-white hover:border hover:border-white/5'
                      }`}
                    >
                      {active && (
                        <span
                          className={`absolute left-0 bg-cyan-400 rounded-r-full shadow-[0_0_10px_#22d3ee] ${
                            collapsed ? 'top-2 bottom-2 w-1' : 'top-1.5 bottom-1.5 w-1.5'
                          }`}
                        />
                      )}
                      <div className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                            active
                              ? 'text-white'
                              : 'text-slate-400 group-hover:text-cyan-400 group-hover:scale-110'
                          }`}
                        />
                        {!collapsed && (
                          <span className="transition-transform duration-150 group-hover:translate-x-0.5 whitespace-nowrap">
                            {item.label}
                          </span>
                        )}
                      </div>

                      {!collapsed && item.badge && !active && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/20 text-cyan-300 border border-blue-400/30 shadow-xs shrink-0 whitespace-nowrap ml-1.5">
                          {item.badge}
                        </span>
                      )}

                      {!collapsed && !active && !item.badge && (
                        <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}

                      {/* Floating Tooltip in Collapsed Mode */}
                      {collapsed && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-500/30 text-cyan-300 border border-blue-400/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Administration & Audit Section (Admin & Sub-Admin only) */}
          {isAdminOrSubAdmin && (
            <div>
              {collapsed ? (
                <div className="my-2 h-px bg-slate-800/80 mx-2" />
              ) : (
                <div className="px-3 mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400/90">
                    Administration & Audit
                  </span>
                  <span className="h-px flex-1 ml-3 bg-gradient-to-r from-slate-700/80 via-slate-800/40 to-transparent" />
                </div>
              )}

              <ul className="space-y-1">
                {manageMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => handleNav(item.path)}
                        className={`w-full group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          collapsed
                            ? 'justify-center p-2.5'
                            : 'justify-between px-3.5 py-2'
                        } ${
                          active
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 font-bold border border-blue-400/30'
                            : 'text-slate-300/90 hover:bg-white/[0.07] hover:text-white hover:border hover:border-white/5'
                        }`}
                      >
                        {active && (
                          <span
                            className={`absolute left-0 bg-cyan-400 rounded-r-full shadow-[0_0_10px_#22d3ee] ${
                              collapsed ? 'top-2 bottom-2 w-1' : 'top-1.5 bottom-1.5 w-1.5'
                            }`}
                          />
                        )}
                        <div className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                              active
                                ? 'text-white'
                                : 'text-slate-400 group-hover:text-cyan-400 group-hover:scale-110'
                            }`}
                          />
                          {!collapsed && (
                            <span className="transition-transform duration-150 group-hover:translate-x-0.5 whitespace-nowrap">
                              {item.label}
                            </span>
                          )}
                        </div>

                        {!collapsed && item.badge && !active && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-xs shrink-0 whitespace-nowrap ml-1.5">
                            {item.badge}
                          </span>
                        )}

                        {!collapsed && !active && !item.badge && (
                          <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}

                        {/* Floating Tooltip in Collapsed Mode */}
                        {collapsed && (
                          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/35">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* User Footer Profile & Session Card - Always 100% visible, fully padded, never cut off */}
        <div
          className={`border-t border-slate-800/80 bg-[#060a16]/95 backdrop-blur-xl shrink-0 transition-all duration-300 ${
            collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'
          }`}
        >
          {collapsed ? (
            <>
              {/* Collapsed Avatar with Quick Tooltip */}
              <div
                onClick={() => handleNav('/settings')}
                className="relative shrink-0 cursor-pointer group"
                title={`${user?.name || 'User'} (${user?.role || 'Admin'})`}
              >
                <div
                  className={`w-10 h-10 rounded-xl overflow-hidden shadow-lg border relative flex items-center justify-center bg-slate-900 ${
                    isAdmin
                      ? 'border-amber-400/60 ring-2 ring-amber-400/20'
                      : isSubAdmin
                      ? 'border-purple-400/60 ring-2 ring-purple-400/20'
                      : 'border-cyan-400/60 ring-2 ring-cyan-400/20'
                  }`}
                >
                  <img
                    src={avatarSrc}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-black text-white absolute">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                {isAdmin ? (
                  <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                ) : isSubAdmin ? (
                  <Shield className="w-3.5 h-3.5 text-purple-400 absolute -top-1.5 -right-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-emerald-400 absolute -top-1.5 -right-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                )}

                {/* Floating Tooltip in Collapsed Mode */}
                <div className="pointer-events-none absolute left-full bottom-0 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  <p className="font-bold text-white">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {isAdmin ? 'Administrator' : isSubAdmin ? 'Operations Lead' : 'Team Member'}
                  </p>
                </div>
              </div>

              {/* Compact Logout Icon */}
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                title="Sign Out Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-200 shadow-xl relative group">
              {/* Avatar Photo / 3D Character */}
              <div
                onClick={() => handleNav('/settings')}
                className="relative shrink-0 cursor-pointer"
                title="Click to customize profile avatar & photo"
              >
                <div
                  className={`w-10 h-10 rounded-xl overflow-hidden shadow-lg border relative flex items-center justify-center bg-slate-900 ${
                    isAdmin
                      ? 'border-amber-400/60 ring-2 ring-amber-400/20'
                      : isSubAdmin
                      ? 'border-purple-400/60 ring-2 ring-purple-400/20'
                      : 'border-cyan-400/60 ring-2 ring-cyan-400/20'
                  }`}
                >
                  <img
                    src={avatarSrc}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-black text-white absolute">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                {isAdmin ? (
                  <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                ) : isSubAdmin ? (
                  <Shield className="w-3.5 h-3.5 text-purple-400 absolute -top-1.5 -right-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-emerald-400 absolute -top-1.5 -right-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                )}
              </div>

              {/* User Details */}
              <div
                onClick={() => handleNav('/settings')}
                className="flex-1 min-w-0 cursor-pointer"
                title="View Profile Settings"
              >
                <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                  {user?.name || 'Authorized User'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse shrink-0" />
                  <span className="text-[10px] text-slate-400 capitalize font-medium truncate">
                    {isAdmin
                      ? 'Administrator'
                      : isSubAdmin
                      ? 'Operations Lead'
                      : 'Team Contributor'}
                  </span>
                </div>
              </div>

              {/* Compact Sign Out Button */}
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer shrink-0"
                title="Sign Out Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
