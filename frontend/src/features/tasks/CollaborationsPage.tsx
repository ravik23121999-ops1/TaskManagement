import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task, UserSummary } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { Search, Users2, Eye, Plus, CheckCircle2, Clock, GitBranch } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const CollaborationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');

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
        view: 'collaborations',
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
      console.error('Failed to load collaborations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTasks();
  };

  // Metrics for top cards
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const inReviewCount = tasks.filter((t) => t.status === 'review').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Collaborations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Shared tasks and parallel branches where you are collaborating or contributing with 1 or more team members.
          </p>
        </div>

        <button
          onClick={() => navigate('/tasks/create')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Collaborative Task</span>
        </button>
      </div>

      {/* Top 4 Quick Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Collaborations</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{total}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
            <p className="text-xl font-bold text-blue-600 mt-0.5">{inProgressCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Review</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{inReviewCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shared tasks by title, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
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
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
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
        </form>
      </div>

      {/* Collaborations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-20">#</th>
                <th className="py-3.5 px-6">Task Title</th>
                <th className="py-3.5 px-6">My Role</th>
                <th className="py-3.5 px-6">Collaborators (1 to Many)</th>
                <th className="py-3.5 px-6">Priority</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Due Date</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton rows={6} cols={8} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No collaborative tasks found.</p>
                    <p className="text-xs text-slate-400 mt-1">Tasks you collaborate on with colleagues will appear here.</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isBranchOwner = task.branches?.some((b) => b.owner?.id === user?.id);
                  const isCreator = task.creator?.id === user?.id;
                  const myRole = isCreator ? 'Lead Creator' : isBranchOwner ? 'Branch Owner' : 'Collaborator';

                  // All collaborators on this task
                  const branchOwners: UserSummary[] = (task.branches || [])
                    .map((b) => b.owner)
                    .filter((o): o is UserSummary => Boolean(o));
                  const teamMembers: UserSummary[] = [
                    ...(task.creator ? [task.creator] : []),
                    ...branchOwners,
                    ...(task.collaborators || []),
                  ].filter((u, index, self) => u && self.findIndex((s) => s.id === u.id) === index);

                  return (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="hover:bg-blue-50/20 transition cursor-pointer"
                    >
                      <td className="py-4 px-6 font-bold text-blue-600 whitespace-nowrap">{task.task_code}</td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 hover:text-blue-600 transition">
                          {task.title}
                        </span>
                        {task.department && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-medium">
                            {task.department.name}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCreator
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : isBranchOwner
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {myRole}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center -space-x-1.5">
                          {teamMembers.slice(0, 4).map((tm) => (
                            <div
                              key={tm.id}
                              title={`${tm.name} (${tm.role || 'Member'})`}
                              className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-sky-400 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white shadow-xs cursor-default"
                            >
                              {tm.name.charAt(0)}
                            </div>
                          ))}
                          {teamMembers.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                              +{teamMembers.length - 4}
                            </div>
                          )}
                          <span className="ml-2.5 text-[11px] text-slate-500 font-medium">
                            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-slate-600 font-medium">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}`);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
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

export default CollaborationsPage;
