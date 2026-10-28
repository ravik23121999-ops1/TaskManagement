import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task, TaskSubmission } from '../../api/tasks';
import { ReviewModal } from '../../components/ReviewModal';
import { Pagination } from '../../components/Pagination';
import { PriorityBadge } from '../../components/StatusBadge';
import { Search, FileCheck2, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Eye } from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('all');

  // Review Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadReviewTasks();
  }, [page, priority]);

  const loadReviewTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.list({
        view: 'review',
        search: search.trim() || undefined,
        priority: priority !== 'all' ? priority : undefined,
        page,
        per_page: 10,
      });
      setTasks(response.data || []);
      setPage(response.meta?.current_page || 1);
      setLastPage(response.meta?.last_page || 1);
      setTotal(response.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load review queue tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadReviewTasks();
  };

  const openReviewModal = (task: Task) => {
    const submission = task.submissions?.find((s) => !s.reviews || s.reviews.length === 0) || task.submissions?.[0];
    if (submission) {
      setSelectedTask(task);
      setSelectedSubmission(submission);
      setIsReviewModalOpen(true);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  // Quick stats
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
  const overdueCount = tasks.filter((t) => t.is_overdue).length;
  const finalCheckCount = tasks.filter((t) => t.progress >= 90).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {total} awaiting decision
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deliverables and task submissions awaiting your evaluation, approval, or return for corrections.
          </p>
        </div>

        <button
          onClick={() => navigate('/tasks')}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          View All Tasks
        </button>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total in Queue</span>
            <FileCheck2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Pending evaluation</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">High / Urgent</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{urgentCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Requires fast response</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Final Sign-off</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{finalCheckCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Creator completion approval</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Overdue SLA</span>
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Past scheduled due date</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by task code, title, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="w-40">
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Priorities</option>
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-24">Task Code</th>
                <th className="py-3.5 px-6">Task Title & Department</th>
                <th className="py-3.5 px-6">Submitted By</th>
                <th className="py-3.5 px-6">Priority</th>
                <th className="py-3.5 px-6">Stage</th>
                <th className="py-3.5 px-6">Due Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Loading review queue...</p>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileCheck2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No submissions awaiting review.</p>
                    <p className="text-[11px] text-slate-400 mt-1">When team members submit deliverables, they will appear here.</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const latestSub = task.submissions?.[0];
                  const stage = task.progress >= 90 ? 'Creator Final Check' : 'Stage Review';

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md cursor-pointer transition"
                        >
                          {task.task_code}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="font-bold text-slate-800 hover:text-blue-600 transition cursor-pointer text-xs"
                          >
                            {task.title}
                          </span>
                          {task.department && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Dept: {task.department.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs">
                            {latestSub?.submitted_by?.name?.charAt(0) || task.current_owner?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">
                              {latestSub?.submitted_by?.name || task.current_owner?.name || 'Assignee'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {latestSub?.submitted_at ? new Date(latestSub.submitted_at).toLocaleDateString() : 'Pending'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          task.progress >= 90
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {stage}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
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
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="View Full Task Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openReviewModal(task)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition shadow-xs cursor-pointer inline-flex items-center gap-1.5 group-hover:shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Review & Decide</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Review Action Modal (Screen 10) */}
      {isReviewModalOpen && selectedTask && selectedSubmission && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          task={selectedTask}
          submission={selectedSubmission}
          onReviewSubmitted={() => loadReviewTasks()}
        />
      )}
    </div>
  );
};

export default ReviewPage;
