import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { tasksApi } from '../../api/tasks';
import type { Task } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { Search, Plus, AlertCircle, Eye, Building2, Calendar, CheckCircle2, Ban, Trash2, X, Zap, Clock } from 'lucide-react';

export const TaskListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all');

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync internal state when URL searchParams change
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlStatus = searchParams.get('status') || 'all';
    const urlPriority = searchParams.get('priority') || 'all';
    setSearch(urlSearch);
    setStatus(urlStatus);
    setPriority(urlPriority);
  }, [searchParams]);

  // Fluent instant live search debounced by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const urlSearch = searchParams.get('search') || '';
      if (search.trim() !== urlSearch.trim()) {
        setPage(1);
        const params: Record<string, string> = {};
        if (search.trim()) params.search = search.trim();
        if (status !== 'all') params.status = status;
        if (priority !== 'all') params.priority = priority;
        if (searchParams.get('view')) params.view = searchParams.get('view')!;
        setSearchParams(params, { replace: true });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadTasks();
  }, [page, status, priority, searchParams]);

  const loadTasks = async () => {
    if (tasks.length === 0) {
      setLoading(true);
    } else {
      setIsFetching(true);
    }
    try {
      const currentSearch = searchParams.get('search') ?? search;
      const response = await tasksApi.list({
        search: currentSearch.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
        view: searchParams.get('view') || undefined,
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
      setIsFetching(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      await tasksApi.delete(taskToDelete.id);
      setTaskToDelete(null);
      setToastMessage('Task record permanently deleted.');
      setTimeout(() => setToastMessage(null), 4000);
      loadTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params: Record<string, string> = {};
    if (search.trim()) params.search = search.trim();
    if (status !== 'all') params.status = status;
    if (priority !== 'all') params.priority = priority;
    setSearchParams(params);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    const params: Record<string, string> = {};
    if (status !== 'all') params.status = status;
    if (priority !== 'all') params.priority = priority;
    setSearchParams(params);
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
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {searchParams.get('view') === 'assigned_to_me'
                ? 'Tasks Assigned to Me'
                : search.trim()
                ? 'Search Results'
                : 'All Open Tasks'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {total} {searchParams.get('view') === 'assigned_to_me' ? 'assigned' : search.trim() ? 'found' : 'active open'}
            </span>
            {searchParams.get('view') === 'assigned_to_me' && (
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer ml-1"
              >
                (View All Tasks)
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {searchParams.get('view') === 'assigned_to_me'
              ? 'Tasks assigned to you.'
              : search.trim()
              ? `Results matching "${search.trim()}".`
              : 'All active team tasks.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => navigate('/tasks/completed')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="View archive of 100% completed tasks"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>View Completed Phase</span>
          </button>

          <button
            onClick={() => navigate('/tasks/cancelled')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="View archive of cancelled tasks"
          >
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            <span>View Cancelled Archive</span>
          </button>

          <button
            onClick={() => navigate('/tasks/create')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Status Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {statusPills.map((pill) => (
          <button
            key={pill.key}
            onClick={() => {
              setStatus(pill.key);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
              status === pill.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search task title, description, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
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

          <div className="w-36">
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
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

          {search.trim() && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Search</span>
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 animate-pulse z-10" />
        )}
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto min-h-[380px]">
          <table className="w-full table-fixed text-left text-xs min-w-[880px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-6 w-28 whitespace-nowrap">Task Code</th>
                <th className="py-3.5 px-6 min-w-[240px]">Task Title & Department</th>
                <th className="py-3.5 px-6 w-32">Status</th>
                <th className="py-3.5 px-6 w-28">Priority</th>
                <th className="py-3.5 px-6 w-48">Action Needed By</th>
                <th className="py-3.5 px-6 w-32">Due Date</th>
                <th className="py-3.5 px-6 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${isFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
              {loading && tasks.length === 0 ? (
                <TableSkeleton rows={8} cols={7} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No tasks found matching your filters.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try broadening your search or resetting the status filter.</p>
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
                      <span className="font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2.5 py-1 rounded-md transition">
                        {task.task_code}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 group-hover:text-blue-600 transition text-xs">
                            {task.title}
                          </span>
                          {/* Personal Status / Action Needed Badge */}
                          {(() => {
                            if (!currentUser) return null;
                            const isCreator = task.creator?.id === currentUser.id;
                            const isOwner = (task.current_owners?.some((o) => o.id === currentUser.id)) || (task.current_owner?.id === currentUser.id);
                            const myBranch = task.my_branch;
                            const isReadyForFinal = Boolean((task as any).is_ready_for_final_signoff) || Boolean((task as any).all_branches_completed);

                            if (task.status === 'completed') {
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Completed
                                </span>
                              );
                            }

                            if (task.status === 'cancelled') {
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 inline-flex items-center gap-1">
                                  <Ban className="w-2.5 h-2.5 text-rose-600" />
                                  Cancelled
                                </span>
                              );
                            }

                            if (task.permissions?.can_review) {
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                  <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                                  Action: Review Needed
                                </span>
                              );
                            }

                            if (isCreator && isReadyForFinal) {
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-300 inline-flex items-center gap-1 shadow-2xs">
                                  <Zap className="w-2.5 h-2.5 text-teal-600 fill-teal-500" />
                                  Action: Final Sign-off
                                </span>
                              );
                            }

                            if (myBranch) {
                              if (myBranch.status === 'review') {
                                return (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-purple-600" />
                                    Submitted · In Review
                                  </span>
                                );
                              }
                              if (myBranch.status === 'post_comment') {
                                return (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 animate-pulse">
                                    <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                    Action: Fix Deliverable
                                  </span>
                                );
                              }
                              if (myBranch.status === 'completed') {
                                return (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    Your Part Done
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-300 inline-flex items-center gap-1 shadow-2xs">
                                  <Zap className="w-2.5 h-2.5 text-sky-600 fill-sky-500" />
                                  Action: Your Deliverable Due
                                </span>
                              );
                            }

                            if (isCreator) {
                              const ownerName = task.current_owner?.name || (task.current_owners && task.current_owners.length > 0 ? task.current_owners[0].name : 'Assignees');
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                                  Waiting on {ownerName}
                                </span>
                              );
                            }

                            if (isOwner) {
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                  <Zap className="w-2.5 h-2.5 text-blue-600 fill-blue-500" />
                                  Action Needed By You
                                </span>
                              );
                            }

                            return null;
                          })()}
                        </div>
                        {task.department && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {task.department.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {(Boolean((task as any).is_ready_for_final_signoff) || Boolean((task as any).all_branches_completed) || (task.permissions?.can_final_submit && task.handling_method !== 'work_alone')) && task.status !== 'completed' ? (
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
                      {(() => {
                        const isIsolatedAssignee = Boolean(task.is_peer_isolated || (task.my_branch && task.creator?.id !== currentUser?.id));
                        let rowOwners = task.current_owners && task.current_owners.length > 0
                          ? task.current_owners
                          : (task.current_owner ? [task.current_owner] : []);

                        if (isIsolatedAssignee && currentUser) {
                          rowOwners = rowOwners.filter((o) => o.id === currentUser.id || o.id === task.creator?.id);
                          if (rowOwners.length === 0) {
                            rowOwners = [{
                              id: currentUser.id,
                              name: currentUser.name,
                              email: currentUser.email || '',
                              role: currentUser.role || 'Assignee',
                            }];
                          }
                        }

                        if (rowOwners.length > 1) {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2 overflow-hidden">
                                {rowOwners.slice(0, 3).map((owner) => (
                                  <div
                                    key={owner.id}
                                    title={owner.name}
                                    className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-[10px] border-2 border-white ring-1 ring-blue-200"
                                  >
                                    {owner.name.charAt(0)}
                                  </div>
                                ))}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span
                                  className="font-semibold text-slate-700 truncate max-w-[150px]"
                                  title={rowOwners.map((o) => o.name).join(', ')}
                                >
                                  {rowOwners.map((o) => o.name).join(', ')}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {rowOwners.length} Active Assignees
                                </span>
                              </div>
                            </div>
                          );
                        }

                        const singleOwner = rowOwners[0] || task.creator;
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-[10px] border border-blue-100">
                              {singleOwner?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">
                                {singleOwner?.name || 'Unassigned'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {(() => {
                                  if (!singleOwner) return 'Unassigned';
                                  const ownerBranch = task.branches?.find((b) => b.owner?.id === singleOwner.id);
                                  if (ownerBranch) {
                                    if (ownerBranch.status === 'review') return 'Submitted (In Review)';
                                    if (ownerBranch.status === 'post_comment') return 'Corrections Needed';
                                    if (ownerBranch.status === 'completed') return 'Deliverable Approved';
                                    return 'Working on Deliverable';
                                  }
                                  if (task.creator?.id === singleOwner.id) {
                                    if (Boolean((task as any).is_ready_for_final_signoff)) return 'Final Sign-off Required';
                                    return 'Task Assigner / Creator';
                                  }
                                  return 'Active Assignee';
                                })()}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</span>
                        {task.is_overdue && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Late
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}`);
                          }}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1.5 border border-slate-200/80 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskToDelete(task);
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                            title="Permanently Delete Task Record (Admin Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse text-xs">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">No tasks found.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="p-4 hover:bg-slate-50 transition cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-blue-600 text-xs bg-blue-50 px-2.5 py-1 rounded-md">
                    {task.task_code}
                  </span>
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

                {/* Mobile Waiting On / Pending Action badge */}
                <div className="text-xs">
                  {task.current_owners && task.current_owners.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-[11px]">
                        <strong>Waiting on:</strong> {task.current_owners.map((o) => o.name).join(', ')}
                      </span>
                    </div>
                  ) : task.current_owner ? (
                    <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-[11px]">
                        <strong>Waiting on:</strong> {task.current_owner.name}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</span>
                    {task.is_overdue && (
                      <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">Late</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tasks/${task.id}`);
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskToDelete(task);
                      }}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-rose-200 cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination currentPage={page} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Admin Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Delete Task Record</h3>
                  <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Admin Only Action</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Are you sure you want to permanently delete task <strong className="text-slate-900">{taskToDelete.task_code}: {taskToDelete.title}</strong>?
              </p>
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                ⚠️ This action is permanent and will remove all branches, attachments, and logs from the system.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default TaskListPage;
