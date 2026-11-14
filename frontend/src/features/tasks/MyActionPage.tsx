import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task, TaskSubmission } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { ReviewModal } from '../../components/ReviewModal';
import { Search, AlertCircle, Eye, Zap, Clock, FileCheck2, RotateCcw, X, CheckCircle2 } from 'lucide-react';

export const MyActionPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review Modal state for Quick Review
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Task | null>(null);
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState<TaskSubmission | null>(null);
  const [isQuickReviewModalOpen, setIsQuickReviewModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Fluent instant live search debounced by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadTasks();
  }, [page, status, priority, debouncedSearch]);

  const loadTasks = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await tasksApi.list({
        view: 'my_action',
        search: debouncedSearch.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
        page,
        per_page: 10,
      });
      setTasks(response.data || []);
      setPage(response.meta?.current_page || 1);
      setLastPage(response.meta?.last_page || 1);
      setTotal(response.meta?.total || 0);
    } catch (err: any) {
      console.error('Failed to load pending tasks', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load pending action tasks. Please try again.');
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

  const openQuickReview = async (task: Task) => {
    let sub = task.submissions?.find((s) => !s.reviews || s.reviews.length === 0) || task.submissions?.[0];
    if (!sub) {
      try {
        const fullTask = await tasksApi.get(task.id);
        sub = fullTask.submissions?.find((s) => !s.reviews || s.reviews.length === 0) || fullTask.submissions?.[0];
        if (sub) {
          setSelectedTaskForReview(fullTask);
          setSelectedSubmissionForReview(sub);
          setIsQuickReviewModalOpen(true);
          return;
        }
      } catch (err) {
        console.error('Failed to fetch submission details', err);
      }
      navigate(`/tasks/${task.id}`);
    } else {
      setSelectedTaskForReview(task);
      setSelectedSubmissionForReview(sub);
      setIsQuickReviewModalOpen(true);
    }
  };

  // Quick summary numbers from the current list (supports main task or branch status)
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress' || t.branches?.some((b) => b.status === 'in_progress' || b.status === 'pending')).length;
  const reviewCount = tasks.filter((t) => t.status === 'review' || t.branches?.some((b) => b.status === 'review')).length;
  const returnedCount = tasks.filter((t) => t.status === 'post_comment' || t.branches?.some((b) => b.status === 'post_comment')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Action Required</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {total} active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tasks that need your review, response, or submission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/tasks/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
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
            <span className="text-xs font-semibold text-slate-500">All Pending</span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{total}</div>
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
            <span className="text-xs font-semibold text-slate-500">In Progress</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-600 mt-2">{inProgressCount}</div>
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
            <span className="text-xs font-semibold text-slate-500">Awaiting Review</span>
            <FileCheck2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{reviewCount}</div>
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
            <span className="text-xs font-semibold text-slate-500">Returned for Revision</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{returnedCount}</div>
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
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-36">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Search
          </button>

          {(search || status !== 'all' || priority !== 'all') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => loadTasks()}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tasks Table (Desktop & Tablet) & Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-4 px-6 whitespace-nowrap">Task Code</th>
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
                <TableSkeleton rows={6} cols={7} />
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
                    <td className="py-4 px-6 font-bold text-blue-600 whitespace-nowrap">
                      {task.task_code}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.department && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                            {task.department.name}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 capitalize">
                          {task.handling_method.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {task.current_owners && task.current_owners.length > 1 ? (
                        <div className="flex items-center gap-2.5">
                          <div className="flex -space-x-2 overflow-hidden">
                            {task.current_owners.slice(0, 3).map((owner) => (
                              <div
                                key={owner.id}
                                title={owner.name}
                                className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center text-[11px] border-2 border-white ring-1 ring-blue-200"
                              >
                                {owner.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <div>
                            <p
                              className="font-semibold text-slate-800 leading-tight truncate max-w-[150px]"
                              title={task.current_owners.map((o) => o.name).join(', ')}
                            >
                              {task.current_owners.map((o) => o.name).join(', ')}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {task.current_owners.length} Assignees
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center text-[11px] shadow-2xs">
                            {task.current_owner?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">
                              {task.current_owner?.name || 'Unassigned'}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize">
                              {task.current_owner?.role?.replace('_', ' ') || 'Assignee'}
                            </p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {task.latest_clarification && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment')) ? (
                        <StatusBadge status="clarification_requested" customLabel="Clarification Needed" />
                      ) : task.latest_return && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment')) ? (
                        <StatusBadge status="returned" customLabel="Needs Correction" />
                      ) : (task.permissions.can_final_submit || (task as any).is_ready_for_final_signoff || (task as any).all_branches_completed) && task.handling_method !== 'work_alone' && task.status !== 'completed' ? (
                        <StatusBadge status="approval" customLabel="Final Sign-off" />
                      ) : (
                        <StatusBadge status={task.status} />
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="text-slate-700 font-medium">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                      </div>
                      {task.is_overdue && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-600">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {task.permissions?.can_review && (task.status === 'review' || task.branches?.some((b) => b.status === 'review')) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuickReview(task);
                            }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                            title="Quick review and decide without leaving page"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Quick Review</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}`);
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white font-semibold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Card List (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse text-xs">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">No action tasks pending right now.</p>
              <p className="text-xs text-slate-400 mt-1">You are all caught up!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="p-4 hover:bg-slate-50 transition cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-blue-600 text-xs">{task.task_code}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {task.title}
                  </h3>
                  {task.department && (
                    <span className="text-[10px] text-slate-400 mt-0.5 inline-block font-medium">
                      {task.department.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</span>
                    {task.is_overdue && (
                      <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">Late</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize">{task.handling_method.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {task.permissions?.can_review && (task.status === 'review' || task.branches?.some((b) => b.status === 'review')) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQuickReview(task);
                      }}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Quick Review</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tasks/${task.id}`);
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Task</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination
          currentPage={page}
          lastPage={lastPage}
          total={total}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Quick Review Modal Popup */}
      {selectedTaskForReview && selectedSubmissionForReview && (
        <ReviewModal
          isOpen={isQuickReviewModalOpen}
          onClose={() => {
            setIsQuickReviewModalOpen(false);
            setSelectedTaskForReview(null);
            setSelectedSubmissionForReview(null);
          }}
          task={selectedTaskForReview}
          submission={selectedSubmissionForReview}
          onReviewSubmitted={() => {
            setIsQuickReviewModalOpen(false);
            setSelectedTaskForReview(null);
            setSelectedSubmissionForReview(null);
            loadTasks();
          }}
        />
      )}
    </div>
  );
};

export default MyActionPage;
