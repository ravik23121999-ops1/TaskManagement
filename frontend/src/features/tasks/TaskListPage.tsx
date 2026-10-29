import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { Search, Plus, AlertCircle, Eye, Building2, Calendar, CheckCircle2 } from 'lucide-react';

export const TaskListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all');

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadTasks();
  }, [page, status, priority]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.list({
        search: search.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
        page,
        per_page: 10,
      });
      setTasks(response.data || []);
      setPage(response.meta?.current_page || 1);
      setLastPage(response.meta?.last_page || 1);
      setTotal(response.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load all tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTasks();
  };

  const statusPills = [
    { key: 'all', label: 'All Open Tasks' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Under Review' },
    { key: 'post_comment', label: 'Returned' },
    { key: 'on_hold', label: 'On Hold' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Open Tasks</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {total} active open
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Active organizational tasks across operational workflows. Completed tasks automatically move to the Completed phase.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => navigate('/tasks/completed')}
            className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold shadow-2xs transition cursor-pointer"
            title="View archive of 100% completed tasks"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>View Completed Phase</span>
          </button>

          <button
            onClick={() => navigate('/tasks/create')}
            className="inline-flex items-center gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Status Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">
        {statusPills.map((pill) => (
          <button
            key={pill.key}
            onClick={() => {
              setStatus(pill.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
              status === pill.key
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search task title, description, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="w-40">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Pending Review</option>
              <option value="post_comment">Returned</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="w-40">
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-xs">
                <th className="py-3.5 px-6 w-28">Task Code</th>
                <th className="py-3.5 px-6">Task Title & Department</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Priority</th>
                <th className="py-3.5 px-6">Current Owner</th>
                <th className="py-3.5 px-6">Due Date</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Loading tasks registry...</p>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No tasks found matching your filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Try broadening your search or resetting the status filter.</p>
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
                      <span className="font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2.5 py-1 rounded-md transition text-xs">
                        {task.task_code}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm">
                          {task.title}
                        </span>
                        {task.department && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {task.department.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {task.permissions?.can_final_submit && task.handling_method !== 'work_alone' && task.status !== 'completed' ? (
                        <StatusBadge status="approval" customLabel="Final Sign-off" />
                      ) : task.status === 'review' || task.branches?.some((b) => b.status === 'review') ? (
                        <StatusBadge status="review" customLabel="Under Review" />
                      ) : (
                        <StatusBadge status={task.status} />
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-100 shrink-0">
                          {task.current_owner?.name?.charAt(0) || task.creator?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-sm">
                            {task.current_owner?.name || task.creator?.name || 'Unassigned'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {task.status === 'review' || task.branches?.some((b) => b.status === 'review')
                              ? 'Under Review'
                              : task.permissions?.can_final_submit && task.handling_method !== 'work_alone'
                              ? 'Awaiting Sign-off'
                              : 'Active Assignee'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</span>
                        {task.is_overdue && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Late
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}`);
                        }}
                        className="h-8 px-3.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl font-semibold text-xs transition inline-flex items-center gap-1.5 border border-slate-200/80 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
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

export default TaskListPage;
