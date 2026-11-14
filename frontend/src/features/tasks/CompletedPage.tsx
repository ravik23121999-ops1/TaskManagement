import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { tasksApi } from '../../api/tasks';
import type { Task } from '../../api/tasks';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { Search, CheckCircle2, Eye, Building2, Trash2, X, User, Users, Share2, Layers } from 'lucide-react';

export const CompletedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const urlMethod = searchParams.get('method');
  const initialMethod = urlMethod && ['all', 'solo', 'team', 'collaboration'].includes(urlMethod)
    ? (urlMethod as 'all' | 'solo' | 'team' | 'collaboration')
    : 'all';

  const [methodFilter, setMethodFilter] = useState<'all' | 'solo' | 'team' | 'collaboration'>(initialMethod);
  const [methodCounts, setMethodCounts] = useState({
    all: 0,
    solo: 0,
    team: 0,
    collaboration: 0,
  });

  useEffect(() => {
    if (urlMethod && ['all', 'solo', 'team', 'collaboration'].includes(urlMethod)) {
      setMethodFilter(urlMethod as 'all' | 'solo' | 'team' | 'collaboration');
      setPage(1);
    }
  }, [urlMethod]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fluent instant live search debounced by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadCompletedTasks();
  }, [page, debouncedSearch, methodFilter]);

  const loadCompletedTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.list({
        view: 'completed',
        handling_method: methodFilter === 'all' ? undefined : methodFilter,
        search: debouncedSearch.trim() || undefined,
        page,
        per_page: 10,
      });
      setTasks(response.data || []);
      setPage(response.meta?.pagination?.current_page || response.meta?.current_page || 1);
      setLastPage(response.meta?.pagination?.last_page || response.meta?.last_page || 1);
      setTotal(response.meta?.pagination?.total ?? response.meta?.total ?? 0);
      if (response.meta?.method_counts) {
        setMethodCounts(response.meta.method_counts);
      }
    } catch (err) {
      console.error('Failed to load completed tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCompletedTasks();
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      await tasksApi.delete(taskToDelete.id);
      setTaskToDelete(null);
      setToastMessage('Task record permanently deleted successfully.');
      setTimeout(() => setToastMessage(null), 4000);
      loadCompletedTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Completed Tasks</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {total} completed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            All finished and approved tasks across your team.
          </p>
        </div>

        <button
          onClick={() => navigate('/tasks')}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          View Active Tasks
        </button>
      </div>

      {/* Top 4 Interactive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setMethodFilter('all');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition shadow-2xs cursor-pointer hover:shadow-xs ${
            methodFilter === 'all' ? 'border-slate-800 ring-1 ring-slate-800 bg-slate-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Total Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{methodCounts.all || total}</div>
          <div className="text-xs text-slate-400 mt-1">All archived tasks</div>
        </div>

        <div
          onClick={() => {
            setMethodFilter('solo');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition shadow-2xs cursor-pointer hover:shadow-xs ${
            methodFilter === 'solo' ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Solo (Independent)</span>
            <User className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{methodCounts.solo}</div>
          <div className="text-xs text-slate-400 mt-1">Single-assignee tasks</div>
        </div>

        <div
          onClick={() => {
            setMethodFilter('team');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition shadow-2xs cursor-pointer hover:shadow-xs ${
            methodFilter === 'team' ? 'border-sky-600 ring-1 ring-sky-600 bg-sky-50/30' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Team (Delegated)</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{methodCounts.team}</div>
          <div className="text-xs text-slate-400 mt-1">Subtasks & delegation</div>
        </div>

        <div
          onClick={() => {
            setMethodFilter('collaboration');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition shadow-2xs cursor-pointer hover:shadow-xs ${
            methodFilter === 'collaboration' ? 'border-purple-600 ring-1 ring-purple-600 bg-purple-50/30' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Collaboration</span>
            <Share2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{methodCounts.collaboration}</div>
          <div className="text-xs text-slate-400 mt-1">Joint team deliverables</div>
        </div>
      </div>

      {/* Segmented Navigation Tabs: All | Solo | Team | Collaboration */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => {
            setMethodFilter('all');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            methodFilter === 'all'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>All Completed</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            methodFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {methodCounts.all || total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMethodFilter('solo');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            methodFilter === 'solo'
              ? 'bg-white text-blue-700 shadow-2xs border border-blue-200/80'
              : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
          }`}
        >
          <User className="w-3.5 h-3.5 text-blue-600" />
          <span>Solo</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            methodFilter === 'solo' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {methodCounts.solo}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMethodFilter('team');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            methodFilter === 'team'
              ? 'bg-white text-sky-700 shadow-2xs border border-sky-200/80'
              : 'text-slate-600 hover:text-sky-700 hover:bg-white/60'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-600" />
          <span>Team</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            methodFilter === 'team' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {methodCounts.team}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMethodFilter('collaboration');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            methodFilter === 'collaboration'
              ? 'bg-white text-purple-700 shadow-2xs border border-purple-200/80'
              : 'text-slate-600 hover:text-purple-700 hover:bg-white/60'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-purple-600" />
          <span>Collaboration</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            methodFilter === 'collaboration' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {methodCounts.collaboration}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${methodFilter === 'all' ? 'all' : methodFilter} completed tasks by title, code, or creator...`}
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

          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Methods</option>
              <option value="solo">Solo (Work Alone)</option>
              <option value="team">Team (Assigned)</option>
              <option value="collaboration">Collaboration</option>
            </select>

            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-6 w-28 whitespace-nowrap">Task Code</th>
                <th className="py-3.5 px-6 min-w-[240px]">Task Title & Department</th>
                <th className="py-3.5 px-6 w-44">Created By</th>
                <th className="py-3.5 px-6 w-52">Executed By</th>
                <th className="py-3.5 px-6 w-32">Method</th>
                <th className="py-3.5 px-6 w-36">Completed On</th>
                <th className="py-3.5 px-6 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton rows={6} cols={7} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-300 mb-2" />
                    <p className="font-semibold text-slate-600">
                      No {methodFilter !== 'all' ? methodFilter : 'completed'} tasks found.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {methodFilter !== 'all'
                        ? `Try changing the method filter tab or clearing search keywords.`
                        : `When tasks pass all approvals, they will appear here.`}
                    </p>
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
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] border border-slate-200">
                          {task.creator?.name?.charAt(0) || 'C'}
                        </div>
                        <span className="font-semibold text-slate-700">{task.creator?.name || 'Creator'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {task.handling_method === 'work_alone' ? (
                        <span className="text-slate-500 text-xs font-medium">
                          Self (Creator)
                        </span>
                      ) : task.handling_method === 'collaborate' || (task.collaborators && task.collaborators.length > 0) ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.collaborators && task.collaborators.length > 0 ? (
                            task.collaborators.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium"
                                title={`Collaborator: ${c.name}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 font-bold flex items-center justify-center text-xs border border-purple-100">
                                {task.creator?.name?.charAt(0) || 'C'}
                              </div>
                              <span className="font-medium text-slate-700 text-xs">{task.creator?.name || 'Creator'}</span>
                            </div>
                          )}
                        </div>
                      ) : (() => {
                        const assignees = (task as any).assignees && (task as any).assignees.length > 0
                          ? (task as any).assignees
                          : (task.branches && task.branches.length > 0
                            ? Array.from(new Map(task.branches.filter((b: any) => b.owner).map((b: any) => [b.owner.id, b.owner])).values())
                            : (task.current_owners || (task.current_owner ? [task.current_owner] : [])));

                        if (assignees && assignees.length > 0) {
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {assignees.map((a: any) => (
                                <span
                                  key={a.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-medium"
                                  title={`Assignee: ${a.name}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                  {a.name}
                                </span>
                              ))}
                            </div>
                          );
                        }
                        return <span className="text-slate-400 text-xs">Unassigned</span>;
                      })()}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {task.handling_method === 'work_alone' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-200">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>Solo</span>
                        </span>
                      ) : task.handling_method === 'collaborate' || (task.collaborators && task.collaborators.length > 0) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200">
                          <Share2 className="w-3 h-3 text-purple-600" />
                          <span>Collaboration</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-sky-50 text-sky-700 border-sky-200">
                          <Users className="w-3 h-3 text-sky-600" />
                          <span>Team</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {task.completed_at
                          ? new Date(task.completed_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Completed'}
                      </span>
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
                Are you sure you want to permanently delete completed task <strong className="text-slate-900">{taskToDelete.task_code}: {taskToDelete.title}</strong>?
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

export default CompletedPage;
