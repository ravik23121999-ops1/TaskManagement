import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { dashboardApi } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { WelcomeBanner } from '../../components/WelcomeBanner';
import { EnterpriseWorkflowGuide } from '../../components/EnterpriseWorkflowGuide';
import {
  Clock,
  Activity,
  Sparkles,
  Users,
  Bell,
  ArrowRight,
  Zap,
  RotateCcw,
  GitBranch,
  FileCheck2,
  UserCheck
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'sub_admin';

  const [adminData, setAdminData] = useState<any>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user?.id, user?.role]);

  const loadDashboardData = async () => {
    if (!adminData && !employeeData) {
      setLoading(true);
    }
    try {
      if (isAdmin) {
        const data = await dashboardApi.getAdminMetrics();
        setAdminData(data);
      } else {
        const data = await dashboardApi.getEmployeeMetrics();
        setEmployeeData(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-2xl" />
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 2: ADMIN DASHBOARD
  // ==========================================
  if (isAdmin && adminData) {
    const tasksByStatus: any[] = Array.isArray(adminData.tasks_by_status) ? adminData.tasks_by_status : [];
    const tasksByDepartment: any[] = Array.isArray(adminData.tasks_by_department) ? adminData.tasks_by_department : [];
    const employeeWorkload: any[] = Array.isArray(adminData.employee_workload) ? adminData.employee_workload : [];
    const recentActivity: any[] = Array.isArray(adminData.recent_activity) ? adminData.recent_activity : [];
    const upcomingDeadlines: any[] = Array.isArray(adminData.upcoming_deadlines) ? adminData.upcoming_deadlines : [];
    const totalStatusCount = tasksByStatus.reduce((acc: number, item: any) => acc + (item?.value || 0), 0) || 1;

    return (
      <div className="space-y-8">
        {/* Executive Welcome Hero Banner */}
        <WelcomeBanner
          user={user}
          metrics={{
            totalTasks: adminData.total_tasks,
            inProgress: adminData.in_progress,
            pendingReview: adminData.pending_review,
            completed: adminData.completed,
          }}
        />

        {/* Enterprise 5-Stage Visual Workflow Stepper & Rule Guide */}
        <EnterpriseWorkflowGuide
          metrics={{
            openTasks: adminData.open_tasks,
            inProgress: adminData.in_progress,
            pendingReview: adminData.pending_review,
            completed: adminData.completed,
            awaitingSignoff: adminData.pending_review ? 1 : 0,
          }}
        />

        {/* Top 4 Primary Interactive Metric KPI Cards (Matching High-Fidelity Mockup) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Tasks */}
          <div
            onClick={() => navigate('/tasks')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-sky-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tasks</span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
              {adminData.total_tasks}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              <span>All tasks across company</span>
              <span className="text-blue-600 font-semibold group-hover:underline">View all →</span>
            </div>
          </div>

          {/* Card 2: In Progress */}
          <div
            onClick={() => navigate('/tasks?status=in_progress')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 transition-all duration-200 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-400" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
              <span className="p-2 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-sky-600 mt-2 tracking-tight flex items-center gap-2">
              <span>{adminData.in_progress}</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              <span>Currently being worked on</span>
              <span className="text-sky-600 font-semibold group-hover:underline">See active →</span>
            </div>
          </div>

          {/* Card 3: Pending Review */}
          <div
            onClick={() => navigate('/tasks/review')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-violet-400" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-purple-600 mt-2 tracking-tight">
              {adminData.pending_review}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              <span>Waiting for review & approval</span>
              <span className="text-purple-600 font-semibold group-hover:underline">Review now →</span>
            </div>
          </div>

          {/* Card 4: Completed */}
          <div
            onClick={() => navigate('/tasks/completed')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </span>
            </div>
            <div className="text-3xl font-bold text-emerald-600 mt-2 tracking-tight">
              {adminData.completed}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              <span>Finished & approved tasks</span>
              <span className="text-emerald-600 font-semibold group-hover:underline">View completed →</span>
            </div>
          </div>
        </div>

        {/* Secondary Operational Quick-Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div
            onClick={() => navigate('/tasks?status=pending')}
            className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-orange-200 hover:bg-orange-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Not Started Yet</p>
              <p className="text-lg font-bold text-orange-600 mt-0.5">{adminData.open_tasks}</p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700">Ready</span>
          </div>

          <div
            onClick={() => navigate('/tasks/pending?status=post_comment')}
            className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Returned for Changes</p>
              <p className="text-lg font-bold text-rose-600 mt-0.5">{adminData.returned ?? 0}</p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">Needs Fix</span>
          </div>

          <div
            onClick={() => navigate('/reports')}
            className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-red-200 hover:bg-red-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Past Due Date</p>
              <p className="text-lg font-bold text-red-600 mt-0.5">{adminData.overdue ?? 0}</p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700">Late</span>
          </div>

          <div
            onClick={() => navigate('/tasks/on-hold')}
            className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/20 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Hold</p>
              <p className="text-lg font-bold text-amber-600 mt-0.5">{adminData.on_hold}</p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">Paused</span>
          </div>
        </div>

        {/* Charts Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart: Tasks by Status */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Tasks by Status</h2>
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    let accumulated = 0;
                    return tasksByStatus.map((item: any, idx: number) => {
                      const pct = (item.value / totalStatusCount) * 100;
                      const strokeDasharray = `${pct} ${100 - pct}`;
                      const strokeDashoffset = -accumulated;
                      accumulated += pct;
                      return (
                        <circle
                          key={idx}
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="3.2"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-slate-800 leading-none">{adminData.total_tasks}</span>
                  <span className="text-[11px] text-slate-400 font-medium mt-0.5">Total Tasks</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2.5 w-full sm:w-auto">
                {tasksByStatus.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between sm:justify-start gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart: Tasks by Department */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Tasks by Department</h2>
            <div className="space-y-3.5 pt-2">
              {tasksByDepartment.map((dept: any, idx: number) => {
                const maxVal = Math.max(...tasksByDepartment.map((d: any) => d.count || 0), 1);
                const percent = Math.round(((dept.count || 0) / maxVal) * 100);
                const colors = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                const color = colors[idx % colors.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{dept.name}</span>
                      <span className="text-slate-500 font-medium">{dept.count || 0} tasks</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Employee Workload Distribution */}
        {employeeWorkload.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Employee Workload Summary
              </h2>
              <button
                onClick={() => navigate('/reports')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                View Full Analytics →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Active Tasks</th>
                    <th className="py-3 px-4">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeWorkload.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">{emp.name}</td>
                      <td className="py-3 px-4 capitalize text-slate-500">{emp.role?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{emp.department}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {emp.active_tasks} active
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">{emp.completed_tasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom Row: Recent Activity & Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Recent Activity
            </h2>
            <div className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">No recent activity recorded.</p>
              ) : (
                recentActivity.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-[10px] shrink-0 border border-blue-100">
                        {log.actor?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{log.description}</p>
                        <p className="text-[10px] text-slate-400">By {log.actor?.name || 'System'}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">{log.time_ago}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Upcoming Deadlines
            </h2>
            <div className="divide-y divide-slate-100">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">No upcoming deadlines.</p>
              ) : (
                upcomingDeadlines.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 transition p-2 rounded-xl cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 hover:text-blue-600 transition">
                        <span className="font-bold text-blue-600 mr-1.5">{task.task_code}</span>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Due: {task.due_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.is_overdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          Overdue
                        </span>
                      )}
                      <StatusBadge status={task.status} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 3: EMPLOYEE DASHBOARD
  // ==========================================
  if (employeeData) {
    const tasksByStatus: any[] = Array.isArray(employeeData.tasks_by_status) ? employeeData.tasks_by_status : [];
    const upcomingTasks: any[] = Array.isArray(employeeData.upcoming_tasks) ? employeeData.upcoming_tasks : [];
    const recentNotifications: any[] = Array.isArray(employeeData.recent_notifications) ? employeeData.recent_notifications : [];
    const totalEmpStatus = tasksByStatus.reduce((acc: number, item: any) => acc + (item?.value || 0), 0) || 1;

    return (
      <div className="space-y-8">
        {/* Contributor Welcome Hero Banner */}
        <WelcomeBanner
          user={user}
          metrics={{
            inProgress: employeeData.my_in_progress,
            myAction: employeeData.my_action,
            pendingReview: employeeData.my_pending_review,
          }}
        />

        {/* Enterprise 5-Stage Visual Workflow Stepper & Rule Guide */}
        <EnterpriseWorkflowGuide
          metrics={{
            myAction: employeeData.my_action,
            inProgress: employeeData.my_in_progress,
            pendingReview: employeeData.my_pending_review,
            completed: employeeData.completed,
          }}
          isEmployeeView={true}
        />

        {/* Top 4 Primary Interactive Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: My Action */}
          <div
            onClick={() => navigate('/tasks/pending')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-sky-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">My Action Tasks</span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                {employeeData.my_action}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                Active Now
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              <span>Items waiting for your step</span>
              <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:underline">
                View tasks <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 2: Assigned to Me */}
          <div
            onClick={() => navigate('/tasks')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md hover:border-cyan-300 transition-all duration-200 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-teal-400" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned to Me</span>
              <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl group-hover:scale-110 transition-transform">
                <UserCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-cyan-600 transition-colors">
              {employeeData.assigned_to_me}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              <span>Tasks assigned to you</span>
              <span className="text-cyan-600 font-semibold flex items-center gap-1 group-hover:underline">
                See all <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 3: Awaiting Review */}
          <div
            onClick={() => navigate('/tasks/review')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submitted for Review</span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-amber-600 transition-colors">
              {employeeData.awaiting_review ?? 0}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              <span>Waiting for reviewer approval</span>
              <span className="text-amber-600 font-semibold flex items-center gap-1 group-hover:underline">
                View list <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 4: Collaborations */}
          <div
            onClick={() => navigate('/tasks/collaborations')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Team Collaborations</span>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-purple-600 transition-colors">
              {employeeData.my_collaborations}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              <span>Tasks you are helping with</span>
              <span className="text-purple-600 font-semibold flex items-center gap-1 group-hover:underline">
                See team tasks <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* 2 Secondary Operational Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => navigate('/tasks/pending?status=post_comment')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-rose-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Returned For Revision</p>
                <p className="text-xs text-slate-400">Submissions that need changes or re-work</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-rose-600">{employeeData.returned_tasks ?? 0}</span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Needs Correction
              </span>
            </div>
          </div>

          <div
            onClick={() => navigate('/tasks/pending-with-others')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">My Initiated Tasks</p>
                <p className="text-xs text-slate-400">Tasks created and delegated by you</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-emerald-600">{employeeData.my_created}</span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Tracked
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: My Upcoming Tasks + Recent Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: My Upcoming Tasks & Status Donut */}
          <div className="lg:col-span-2 space-y-6">
            {/* Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">My Upcoming Tasks</h2>
                  <p className="text-[11px] text-slate-400">High priority and active milestones scheduled for delivery</p>
                </div>
                <button
                  onClick={() => navigate('/tasks/pending')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  View all ({employeeData.upcoming_tasks?.length || 0}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold text-left">
                      <th className="pb-3 font-semibold">Task</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Priority</th>
                      <th className="pb-3 font-semibold">Due Date</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          No upcoming tasks pending. You are completely caught up!
                        </td>
                      </tr>
                    ) : (
                      upcomingTasks.map((task: any) => (
                        <tr key={task.id} className="hover:bg-slate-50/70 transition group">
                          <td className="py-3.5 font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => navigate(`/tasks/${task.id}`)}
                                className="font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md cursor-pointer transition"
                              >
                                {task.task_code}
                              </span>
                              <span
                                onClick={() => navigate(`/tasks/${task.id}`)}
                                className="hover:text-blue-600 cursor-pointer transition font-semibold"
                              >
                                {task.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <StatusBadge status={task.status} size="sm" />
                          </td>
                          <td className="py-3.5">
                            <PriorityBadge priority={task.priority} />
                          </td>
                          <td className="py-3.5 text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span>{task.due_date}</span>
                              {task.is_overdue && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              onClick={() => navigate(`/tasks/${task.id}`)}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 rounded-xl transition cursor-pointer group-hover:shadow-2xs"
                            >
                              Open Task →
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Donut Graphic for Employee */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h2 className="text-sm font-bold text-slate-800 mb-4">My Task Status Distribution</h2>
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {(() => {
                      let accumulated = 0;
                      return tasksByStatus.map((item: any, idx: number) => {
                        const pct = (item.value / totalEmpStatus) * 100;
                        const strokeDasharray = `${pct} ${100 - pct}`;
                        const strokeDashoffset = -accumulated;
                        accumulated += pct;
                        return (
                          <circle
                            key={idx}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="3.2"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-300"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-slate-800 leading-none">
                      {employeeData.my_action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium mt-0.5">My Action</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                  {tasksByStatus.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs p-2 rounded-xl bg-slate-50/70">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 truncate">{item.name}:</span>
                      <span className="font-bold text-slate-800 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Notifications Feed */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                Recent Notifications
              </h2>
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                All →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentNotifications.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No recent notifications.</p>
              ) : (
                recentNotifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    onClick={() => notif.task_id && navigate(`/tasks/${notif.task_id}`)}
                    className="py-3 hover:bg-slate-50 transition p-2.5 rounded-xl cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{notif.time_ago}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Dashboard;
