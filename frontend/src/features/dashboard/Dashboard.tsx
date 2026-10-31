import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { dashboardApi } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { DashboardTopFold } from './DashboardTopFold';
import { EnterpriseWorkflowGuide } from '../../components/EnterpriseWorkflowGuide';
import {
  Clock,
  Activity,
  Users,
  Bell,
  RotateCcw,
  GitBranch,
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

    const totalTasks = adminData.total_tasks || 0;
    const inProgressTasks = adminData.in_progress || 0;
    const pendingReviewTasks = adminData.pending_review || 0;
    const completedTasks = adminData.completed || 0;

    return (
      <div className="space-y-8">
        {/* TOP FOLD: HERO WELCOME + 6 KPIs SIDE-BY-SIDE */}
        <DashboardTopFold
          user={user}
          isAdmin={true}
          metrics={{
            totalTasks: totalTasks,
            pendingTasks: adminData.open_tasks || 0,
            inProgressTasks: inProgressTasks,
            completedTasks: completedTasks,
            reviewTasks: pendingReviewTasks,
            onHoldTasks: adminData.on_hold || 0,
            todayTasks: adminData.today_tasks ?? 0,
            todayProgressTasks: inProgressTasks,
          }}
        />

        {/* Operational Attention Alerts (Past Due / Returned) */}
        {(adminData.overdue > 0 || adminData.returned > 0) && (
          <div className="flex flex-wrap items-center gap-3">
            {adminData.overdue > 0 && (
              <div
                onClick={() => navigate('/reports')}
                className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer hover:bg-rose-100 transition shadow-2xs"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <span>{adminData.overdue} Tasks Past Due Date</span>
              </div>
            )}
            {adminData.returned > 0 && (
              <div
                onClick={() => navigate('/tasks/pending?status=post_comment')}
                className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer hover:bg-amber-100 transition shadow-2xs"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
                <span>{adminData.returned} Tasks Returned for Revision</span>
              </div>
            )}
          </div>
        )}

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

        {/* Charts Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart: Tasks by Status */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Tasks by Status
            </h2>
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
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-none">{adminData.total_tasks}</span>
                  <span className="text-xs text-slate-500 font-semibold mt-1">Total Tasks</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 w-full sm:w-auto">
                {tasksByStatus.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between sm:justify-start gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-700 font-semibold">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart: Tasks by Department */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              Tasks by Department
            </h2>
            <div className="space-y-4 pt-2">
              {tasksByDepartment.map((dept: any, idx: number) => {
                const maxVal = Math.max(...tasksByDepartment.map((d: any) => d.count || 0), 1);
                const percent = Math.round(((dept.count || 0) / maxVal) * 100);
                const colors = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                const color = colors[idx % colors.length];

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm font-semibold">
                      <span className="text-slate-800">{dept.name}</span>
                      <span className="text-slate-500 font-bold">{dept.count || 0} tasks</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
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
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Employee Workload Summary
              </h2>
              <button
                onClick={() => navigate('/reports')}
                className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 transition"
              >
                View Full Analytics →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-xs">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Active Tasks</th>
                    <th className="py-3.5 px-4">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeWorkload.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{emp.name}</td>
                      <td className="py-3.5 px-4 capitalize text-slate-600">{emp.role?.replace('_', ' ')}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{emp.department}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                          {emp.active_tasks} active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">{emp.completed_tasks}</td>
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
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Recent Activity
            </h2>
            <div className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-400 italic py-4">No recent activity recorded.</p>
              ) : (
                recentActivity.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="py-3.5 flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                        {log.actor?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{log.description}</p>
                        <p className="text-xs text-slate-400">By {log.actor?.name || 'System'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 font-medium">{log.time_ago}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Upcoming Deadlines
            </h2>
            <div className="divide-y divide-slate-100">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-400 italic py-4">No upcoming deadlines.</p>
              ) : (
                upcomingDeadlines.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="py-3 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-50 transition p-2 rounded-xl cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 hover:text-blue-600 transition">
                        <span className="font-bold text-blue-600 mr-1.5">{task.task_code}</span>
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Due: {task.due_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.is_overdue && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
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

    const myActionCount = employeeData.my_action || 0;
    const assignedToMeCount = employeeData.assigned_to_me || 0;
    const awaitingReviewCount = employeeData.awaiting_review || 0;
    const collaborationsCount = employeeData.my_collaborations || 0;

    return (
      <div className="space-y-8">
        {/* TOP FOLD: HERO WELCOME + 6 KPIs SIDE-BY-SIDE */}
        <DashboardTopFold
          user={user}
          isAdmin={false}
          metrics={{
            totalTasks: assignedToMeCount,
            pendingTasks: myActionCount,
            inProgressTasks: employeeData.my_in_progress ?? 0,
            completedTasks: employeeData.completed ?? 0,
            reviewTasks: awaitingReviewCount,
            onHoldTasks: collaborationsCount,
            todayTasks: employeeData.today_tasks ?? 0,
            todayProgressTasks: employeeData.my_in_progress ?? 0,
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

        {/* 2 Secondary Operational Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => navigate('/tasks/pending?status=post_comment')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-rose-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">Returned For Revision</p>
                <p className="text-xs text-slate-500">Submissions that need changes or re-work</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">{employeeData.returned_tasks ?? 0}</span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Needs Correction
              </span>
            </div>
          </div>

          <div
            onClick={() => navigate('/tasks/pending-with-others')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">My Initiated Tasks</p>
                <p className="text-xs text-slate-500">Tasks created and delegated by you</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{employeeData.my_created}</span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">My Upcoming Tasks</h2>
                  <p className="text-xs text-slate-500">High priority and active milestones scheduled for delivery</p>
                </div>
                <button
                  onClick={() => navigate('/tasks/pending')}
                  className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  View all ({employeeData.upcoming_tasks?.length || 0}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-bold uppercase text-xs text-left">
                      <th className="pb-3.5">Task</th>
                      <th className="pb-3.5">Status</th>
                      <th className="pb-3.5">Priority</th>
                      <th className="pb-3.5">Due Date</th>
                      <th className="pb-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic text-sm">
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
                                className="font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg cursor-pointer transition text-xs"
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
                          <td className="py-3.5 text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{task.due_date}</span>
                              {task.is_overdue && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              onClick={() => navigate(`/tasks/${task.id}`)}
                              className="px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 rounded-xl transition cursor-pointer group-hover:shadow-2xs"
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
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                My Task Status Distribution
              </h2>
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
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-none">
                      {employeeData.my_action}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold mt-1">My Action</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                  {tasksByStatus.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-700 font-medium truncate">{item.name}:</span>
                      <span className="font-extrabold text-slate-900 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Notifications Feed */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Recent Notifications
              </h2>
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                All →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentNotifications.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-400 italic py-6 text-center">No recent notifications.</p>
              ) : (
                recentNotifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    onClick={() => notif.task_id && navigate(`/tasks/${notif.task_id}`)}
                    className="py-3.5 hover:bg-slate-50 transition p-2.5 rounded-xl cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                        {notif.title}
                      </h4>
                      <span className="text-xs text-slate-400 shrink-0">{notif.time_ago}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notif.message}</p>
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
