import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../../api/tasks';
import { Calendar, Download, TrendingUp, CheckCircle2, AlertTriangle, Sparkles, Building2 } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [range, setRange] = useState('last_30_days');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [range]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getReports(range);
      setData(res);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxStatusCount = Math.max(...data.tasks_by_status.map((s: any) => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time organizational performance, task completion trends, and team workload distribution.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 px-3.5 h-10 rounded-xl shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="last_year">Last Year</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="h-10 px-4 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export / Print</span>
          </button>
        </div>
      </div>

      {/* Top 4 Elevated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tasks Created */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-sky-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Tasks Created</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
            {data.total_tasks}
          </div>
          <div className="text-xs text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
            During selected reporting window
          </div>
        </div>

        {/* Card 2: Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Completion Rate</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-emerald-600 mt-2 tracking-tight">
            {data.completion_rate}%
          </div>
          <div className="text-xs text-emerald-700 mt-2.5 pt-2.5 border-t border-slate-100 font-semibold">
            {data.completed_count} verified completed tasks
          </div>
        </div>

        {/* Card 3: Overdue Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Overdue SLA</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-rose-600 mt-2 tracking-tight">
            {data.overdue_count}
          </div>
          <div className="text-xs text-rose-700 mt-2.5 pt-2.5 border-t border-slate-100 font-semibold">
            Requires immediate management action
          </div>
        </div>

        {/* Card 4: Completed Deliverables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Archived Deliverables</span>
            <span className="p-2 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-sky-600 mt-2 tracking-tight">
            {data.completed_count}
          </div>
          <div className="text-xs text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
            Successfully closed in repository
          </div>
        </div>
      </div>

      {/* Charts Row matching Mockup Screen 18 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status Vertical Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-6">Tasks by Status</h2>
          <div className="h-56 flex items-end justify-between gap-4 px-2 pt-6 border-b border-slate-100">
            {data.tasks_by_status.map((item: any, idx: number) => {
              const heightPct = Math.max(Math.round((item.count / maxStatusCount) * 100), 8);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-xs font-bold text-slate-700 opacity-90">{item.count}</span>
                  <div
                    className="w-full max-w-[48px] rounded-t-xl transition-all duration-500 group-hover:scale-y-105 origin-bottom"
                    style={{ height: `${heightPct}%`, backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-slate-600 truncate mt-2 w-full text-center">
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks by Department */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Tasks by Department</span>
          </h2>
          <div className="space-y-4 pt-2">
            {data.tasks_by_department.map((dept: any, idx: number) => {
              const maxDept = Math.max(...data.tasks_by_department.map((d: any) => d.count), 1);
              const pct = Math.round((dept.count / maxDept) * 100);
              const colors = ['#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];
              const color = colors[idx % colors.length];

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-slate-700">{dept.department}</span>
                    <span className="text-slate-500 font-medium">{dept.count} tasks ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Employee Workload Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Employee Workload Overview</h2>
          <span className="text-xs font-semibold text-slate-500">{data.employee_workload?.length || 0} employees</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-xs">
                <th className="py-3 px-6">Employee</th>
                <th className="py-3 px-6">Department</th>
                <th className="py-3 px-6">Assigned</th>
                <th className="py-3 px-6">Completed</th>
                <th className="py-3 px-6">Pending</th>
                <th className="py-3 px-6">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.employee_workload?.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-6 font-bold text-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shadow-2xs">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="font-bold">{emp.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">{emp.department}</td>
                  <td className="py-3.5 px-6 font-semibold text-blue-600">{emp.assigned}</td>
                  <td className="py-3.5 px-6 font-semibold text-emerald-600">{emp.completed}</td>
                  <td className="py-3.5 px-6 font-semibold text-amber-600">{emp.pending}</td>
                  <td className="py-3.5 px-6 font-semibold text-rose-600">{emp.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
