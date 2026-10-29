import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task } from '../../api/tasks';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { Search, PauseCircle, PlayCircle, Eye, AlertCircle, Building2, Calendar } from 'lucide-react';

export const OnHoldPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadOnHoldTasks();
  }, [page]);

  const loadOnHoldTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.list({
        view: 'on_hold',
        search: search.trim() || undefined,
        page,
        per_page: 10,
      });
      setTasks(response.data || []);
      setPage(response.meta?.current_page || 1);
      setLastPage(response.meta?.last_page || 1);
      setTotal(response.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load on-hold tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (task: Task) => {
    if (!confirm(`Are you sure you want to resume task ${task.task_code}: "${task.title}"?`)) return;

    try {
      await tasksApi.resume(task.id);
      loadOnHoldTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume task');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOnHoldTasks();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">On Hold Tasks</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {total} paused
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tasks temporarily halted with recorded justifications. Authorized managers or assignees can resume work at any time.
          </p>
        </div>

        <button
          onClick={() => navigate('/tasks')}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          View Active Tasks
        </button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Currently Paused</span>
            <PauseCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Tasks requiring unblocking</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Documented Reason</span>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">100%</div>
          <div className="text-[10px] text-slate-400 mt-1">Mandatory hold rationale tracked</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Quick Resume</span>
            <PlayCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">1-Click</div>
          <div className="text-[10px] text-slate-400 mt-1">Immediate stage reactivation</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search paused tasks by title, code, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-24">Task Code</th>
                <th className="py-3.5 px-6">Task Title & Department</th>
                <th className="py-3.5 px-6">Reason for Hold</th>
                <th className="py-3.5 px-6">Held By</th>
                <th className="py-3.5 px-6">Hold Date</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton rows={6} cols={6} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <PauseCircle className="w-8 h-8 mx-auto text-amber-300 mb-2" />
                    <p className="font-semibold text-slate-600">No tasks currently on hold.</p>
                    <p className="text-[11px] text-slate-400 mt-1">All active deliverables are running normally.</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-bold text-amber-700 bg-amber-50 group-hover:bg-amber-100 px-2.5 py-1 rounded-md transition">
                        {task.task_code}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 group-hover:text-blue-600 transition text-xs">
                          {task.title}
                        </span>
                        {task.department && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {task.department.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-amber-900 font-medium text-xs max-w-sm">
                        {task.hold_record?.reason || 'Awaiting requirement clarity'}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {task.hold_record?.held_by?.charAt(0) || task.current_owner?.name?.charAt(0) || 'O'}
                        </div>
                        <span className="font-semibold text-slate-700">
                          {task.hold_record?.held_by || task.current_owner?.name || 'Owner'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-slate-500">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {task.hold_record?.held_at
                          ? new Date(task.hold_record.held_at).toLocaleDateString()
                          : new Date(task.updated_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}`);
                          }}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResume(task);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer group-hover:shadow-sm"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Resume</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
      </div>
    </div>
  );
};

export default OnHoldPage;
