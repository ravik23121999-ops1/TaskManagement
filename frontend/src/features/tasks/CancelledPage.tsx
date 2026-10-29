import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task } from '../../api/tasks';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import {
  Search,
  Ban,
  Eye,
  Calendar,
  Building2,
  AlertCircle,
  ListTodo,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export const CancelledPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCancelledTasks();
  }, [page]);

  const loadCancelledTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.list({
        status: 'cancelled',
        search: search.trim() || undefined,
        page,
        per_page: 10,
      });
      setTasks(response.data || []);
      setPage(response.meta?.current_page || 1);
      setLastPage(response.meta?.last_page || 1);
      setTotal(response.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load cancelled tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCancelledTasks();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cancelled Tasks</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
              {total} cancelled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical log of tasks cancelled by task creators, administrators, or authorized sub-admins with cancellation reason notes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <ListTodo className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Tasks</span>
          </button>

          <button
            onClick={() => navigate('/tasks/completed')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed Archive</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cancelled tasks by code, title, creator, or cancellation reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Cancelled Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-24">Task Code</th>
                <th className="py-3.5 px-6">Task Title & Department</th>
                <th className="py-3.5 px-6">Creator</th>
                <th className="py-3.5 px-6">Cancelled By & Date</th>
                <th className="py-3.5 px-6">Cancellation Reason Note</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton rows={6} cols={6} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-400 flex items-center justify-center mx-auto mb-3">
                      <Ban className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">No cancelled tasks found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search
                        ? 'Try clearing your search query to see all cancelled tasks.'
                        : 'No tasks have been cancelled. When creators or administrators cancel a task with a reason note, it is archived here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const cancellerName = task.cancelled_by?.name || 'Creator / Admin';

                  return (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="hover:bg-rose-50/20 transition cursor-pointer group"
                    >
                      {/* Task Code */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-md text-xs group-hover:bg-rose-100 transition">
                          {task.task_code}
                        </span>
                      </td>

                      {/* Title & Department */}
                      <td className="py-4 px-6 max-w-xs">
                        <p className="font-bold text-slate-800 text-sm group-hover:text-rose-600 transition truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {task.department ? (
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {task.department.name}
                            </span>
                          ) : (
                            <span>General</span>
                          )}
                          <span>•</span>
                          <span className="capitalize">{task.handling_method.replace('_', ' ')}</span>
                        </div>
                      </td>

                      {/* Creator */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {task.creator?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="text-xs">
                            <p className="font-semibold text-slate-700">{task.creator?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-400 capitalize">{task.creator?.role?.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>

                      {/* Cancelled By & Date */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="font-semibold text-slate-800 text-xs">{cancellerName}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {task.cancelled_at
                              ? new Date(task.cancelled_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Cancelled'}
                          </p>
                        </div>
                      </td>

                      {/* Cancellation Reason Note */}
                      <td className="py-4 px-6 max-w-sm">
                        {task.cancellation_reason ? (
                          <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/70 text-rose-900 text-xs leading-relaxed flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span className="font-medium line-clamp-2" title={task.cancellation_reason}>
                              {task.cancellation_reason}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No explicit note recorded</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}`);
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Task</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
      </div>
    </div>
  );
};

export default CancelledPage;
