import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { Search, AlertCircle, Eye, Zap, Clock, FileCheck2, RotateCcw } from 'lucide-react';

export const MyActionPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');

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
        view: 'my_action',
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
      console.error('Failed to load pending tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTasks();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setPriority('all');
    setPage(1);
  };

  // Quick summary numbers from the current list
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const reviewCount = tasks.filter((t) => t.status === 'review').length;
  const returnedCount = tasks.filter((t) => t.status === 'post_comment').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Pending Action</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {total} requiring your input
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tasks where the ball is currently in your court — active deliverables, inquiries awaiting your response, or submissions returned for revision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/tasks/create')}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            + Create New Task
          </button>
        </div>
      </div>

      {/* Quick Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => { setStatus('all'); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            status === 'all'
              ? 'bg-blue-50/70 border-blue-200 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">All Pending</span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{total}</div>
        </div>

        <div
          onClick={() => { setStatus('in_progress'); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            status === 'in_progress'
              ? 'bg-sky-50/70 border-sky-200 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">In Progress</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-bold text-sky-600 mt-2">{inProgressCount}</div>
        </div>

        <div
          onClick={() => { setStatus('review'); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            status === 'review'
              ? 'bg-amber-50/70 border-amber-200 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Awaiting Review</span>
            <FileCheck2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{reviewCount}</div>
        </div>

        <div
          onClick={() => { setStatus('post_comment'); setPage(1); }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            status === 'post_comment'
              ? 'bg-rose-50/70 border-rose-200 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Returned for Revision</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-bold text-rose-600 mt-2">{returnedCount}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, ID, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="w-36">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Pending Review</option>
              <option value="post_comment">Returned</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div className="w-36">
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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

          {(search || status !== 'all' || priority !== 'all') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-10 px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-4 px-6 w-24"># Task ID</th>
                <th className="py-4 px-6">Task Title</th>
                <th className="py-4 px-6">Owner / Assignee</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p className="font-medium">Loading pending tasks...</p>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No action tasks pending right now.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      You are all caught up! When tasks are assigned to you or require review, they will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="hover:bg-blue-50/20 transition cursor-pointer group"
                  >
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 inline-block">{task.task_code}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.department && (
                          <span className="px-2.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                            {task.department.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 capitalize">
                          {task.handling_method.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                          {task.current_owner?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">
                            {task.current_owner?.name || 'Unassigned'}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {task.current_owner?.role?.replace('_', ' ') || 'Assignee'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {task.latest_clarification && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment')) ? (
                        <StatusBadge status="clarification_requested" customLabel="Clarification Needed" />
                      ) : task.latest_return && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment')) ? (
                        <StatusBadge status="returned" customLabel="Needs Correction" />
                      ) : task.permissions.can_final_submit && task.handling_method !== 'work_alone' && task.status === 'in_progress' ? (
                        <StatusBadge status="in_progress" customLabel="Ready for Sign-off" />
                      ) : (
                        <StatusBadge status={task.status} />
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="text-slate-700 font-medium">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                      </div>
                      {task.is_overdue && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}`);
                        }}
                        className="h-8 px-3.5 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white font-semibold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
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

        <Pagination
          currentPage={page}
          lastPage={lastPage}
          total={total}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
};

export default MyActionPage;
