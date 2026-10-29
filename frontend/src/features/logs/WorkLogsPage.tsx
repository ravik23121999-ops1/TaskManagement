import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workLogsApi, tasksApi } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import {
  Activity,
  MessageSquare,
  GitBranch,
  Paperclip,
  Search,
  FileCheck2,
  CheckCircle2,
  RotateCcw,
  Download,
  ArrowRight,
  Layers,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  CheckCircle,
  Clock,
  Building2,
} from 'lucide-react';

export const WorkLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: 'journeys' (Primary: separated task journeys creation to end) | 'stream' (flat raw audit feed) | 'dossier' (single task inspect)
  const [viewMode, setViewMode] = useState<'journeys' | 'stream' | 'dossier'>('journeys');

  // Stats
  const [stats, setStats] = useState<any>({
    total_logs: 0,
    total_comments: 0,
    total_status_changes: 0,
    total_attachments: 0,
    total_reviews: 0,
    total_tasks: 0,
  });

  // Task Journeys state
  const [taskJourneys, setTaskJourneys] = useState<any[]>([]);
  const [loadingJourneys, setLoadingJourneys] = useState(true);
  const [journeysPage, setJourneysPage] = useState(1);
  const [journeysLastPage, setJourneysLastPage] = useState(1);
  const [journeysTotal, setJourneysTotal] = useState(0);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());

  // Raw Stream state
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [streamPage, setStreamPage] = useState(1);
  const [streamLastPage, setStreamLastPage] = useState(1);
  const [streamTotal, setStreamTotal] = useState(0);

  // Common lists for dropdowns
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>(
    searchParams.get('task_id') ? Number(searchParams.get('task_id')) : undefined
  );
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(
    searchParams.get('user_id') ? Number(searchParams.get('user_id')) : undefined
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Single Dossier inspect state
  const [dossierTaskId, setDossierTaskId] = useState<number | null>(
    searchParams.get('inspect_task') ? Number(searchParams.get('inspect_task')) : null
  );
  const [dossierData, setDossierData] = useState<any>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierTab, setDossierTab] = useState<'timeline' | 'conversations' | 'attachments' | 'branches'>('timeline');

  // Download state
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownloadAttachment = async (attachmentId: number, fileName: string) => {
    setDownloadingId(attachmentId);
    try {
      await tasksApi.downloadAttachment(attachmentId, fileName);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.response?.data?.message || 'Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (viewMode === 'journeys') {
      loadTaskJourneys();
    } else if (viewMode === 'stream') {
      loadLogs();
    }
  }, [viewMode, journeysPage, streamPage, selectedTaskId, selectedUserId, statusFilter, typeFilter]);

  useEffect(() => {
    if (dossierTaskId && viewMode === 'dossier') {
      loadTaskDossier(dossierTaskId);
    }
  }, [dossierTaskId, viewMode]);

  const loadInitialData = async () => {
    try {
      const [statsRes, tasksRes, usersRes] = await Promise.all([
        workLogsApi.getStats(),
        workLogsApi.getTasksList(),
        workLogsApi.getUsersList(),
      ]);
      setStats(statsRes || {});
      setTasksList(tasksRes || []);
      setUsersList(usersRes || []);

      if (searchParams.get('inspect_task')) {
        const tId = Number(searchParams.get('inspect_task'));
        setDossierTaskId(tId);
        setViewMode('dossier');
      } else {
        loadTaskJourneys();
      }
    } catch (err) {
      console.error('Failed to load work log initial data', err);
    }
  };

  const loadTaskJourneys = async () => {
    setLoadingJourneys(true);
    try {
      const res = await workLogsApi.getTaskJourneys({
        task_id: selectedTaskId,
        user_id: selectedUserId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        page: journeysPage,
        per_page: 6,
      });
      setTaskJourneys(res.data || []);
      setJourneysPage(res.meta?.current_page || 1);
      setJourneysLastPage(res.meta?.last_page || 1);
      setJourneysTotal(res.meta?.total || 0);

      // Expand all tasks by default so their complete journeys are immediately visible
      const ids = new Set<number>((res.data || []).map((t: any) => t.task.id));
      setExpandedTaskIds(ids);
    } catch (err) {
      console.error('Failed to load task journeys', err);
    } finally {
      setLoadingJourneys(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await workLogsApi.getLogs({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        task_id: selectedTaskId,
        user_id: selectedUserId,
        search: searchQuery.trim() || undefined,
        page: streamPage,
        per_page: 15,
      });
      setLogs(res.data || []);
      setStreamPage(res.meta?.current_page || 1);
      setStreamLastPage(res.meta?.last_page || 1);
      setStreamTotal(res.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load work logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadTaskDossier = async (taskId: number) => {
    setLoadingDossier(true);
    try {
      const res = await workLogsApi.getTaskJourney(taskId);
      setDossierData(res);
    } catch (err) {
      console.error('Failed to load task journey', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode === 'journeys') {
      setJourneysPage(1);
      loadTaskJourneys();
    } else {
      setStreamPage(1);
      loadLogs();
    }
  };

  const handleResetFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setSelectedTaskId(undefined);
    setSelectedUserId(undefined);
    setSearchQuery('');
    setJourneysPage(1);
    setStreamPage(1);

    if (viewMode === 'journeys') {
      workLogsApi
        .getTaskJourneys({ page: 1, per_page: 6 })
        .then((res) => {
          setTaskJourneys(res.data || []);
          setJourneysPage(res.meta?.current_page || 1);
          setJourneysLastPage(res.meta?.last_page || 1);
          setJourneysTotal(res.meta?.total || 0);
          const ids = new Set<number>((res.data || []).map((t: any) => t.task.id));
          setExpandedTaskIds(ids);
        });
    } else {
      workLogsApi.getLogs({ page: 1, per_page: 15 }).then((res) => {
        setLogs(res.data || []);
        setStreamPage(res.meta?.current_page || 1);
        setStreamLastPage(res.meta?.last_page || 1);
        setStreamTotal(res.meta?.total || 0);
      });
    }
  };

  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<number>(taskJourneys.map((t) => t.task.id));
    setExpandedTaskIds(allIds);
  };

  const collapseAll = () => {
    setExpandedTaskIds(new Set());
  };

  const inspectSingleTaskDossier = (taskId: number) => {
    setDossierTaskId(taskId);
    setViewMode('dossier');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Work Logs & Task Journeys</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Task History & Timelines
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            See the story of every task from start to finish: track assignments, deliverables, comments, and approvals in simple chronological order.
          </p>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center bg-slate-200/70 p-1 rounded-xl self-start md:self-auto shadow-inner">
          <button
            onClick={() => setViewMode('journeys')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'journeys'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-blue-600" />
            <span>Task Journeys</span>
          </button>
          <button
            onClick={() => setViewMode('stream')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'stream'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Activity Stream</span>
          </button>
          {dossierTaskId && (
            <button
              onClick={() => setViewMode('dossier')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'dossier'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Detailed Task Story</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Elevated KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Work Events */}
        <div
          onClick={() => {
            setViewMode('journeys');
            setStatusFilter('all');
            setJourneysPage(1);
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden cursor-pointer group"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-sky-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Work Events</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
            {stats.total_logs}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Across all tasks</span>
            <span className="text-blue-600 font-semibold group-hover:underline">Explore Journeys →</span>
          </div>
        </div>

        {/* Card 2: Team Communications */}
        <div
          onClick={() => {
            setViewMode('stream');
            setTypeFilter('comment');
            setStreamPage(1);
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden cursor-pointer group"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Team Communications</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-indigo-600 mt-2 tracking-tight">
            {stats.total_comments}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Clarifications & team chat</span>
            <span className="text-indigo-600 font-semibold group-hover:underline">Review Chat →</span>
          </div>
        </div>

        {/* Card 3: Stage Transitions */}
        <div
          onClick={() => {
            setViewMode('journeys');
            setStatusFilter('review');
            setJourneysPage(1);
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden cursor-pointer group"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stage Transitions</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <GitBranch className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-amber-600 mt-2 tracking-tight">
            {stats.total_status_changes}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Handovers & reviews</span>
            <span className="text-amber-600 font-semibold group-hover:underline">View Stages →</span>
          </div>
        </div>

        {/* Card 4: Deliverables Vault */}
        <div
          onClick={() => {
            setViewMode('stream');
            setTypeFilter('attachment');
            setStreamPage(1);
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_12px_rgba(15,23,42,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden cursor-pointer group"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deliverables Uploaded</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <Paperclip className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-bold text-emerald-600 mt-2 tracking-tight">
            {stats.total_attachments}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Files & deliverables</span>
            <span className="text-emerald-600 font-semibold group-hover:underline">Browse Vault →</span>
          </div>
        </div>
      </div>

      {/* Search & Selection Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by task title, ID (e.g. T-016), actor, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Task Dropdown */}
          <div className="w-44">
            <select
              value={selectedTaskId || ''}
              onChange={(e) => {
                setSelectedTaskId(e.target.value ? Number(e.target.value) : undefined);
                setJourneysPage(1);
                setStreamPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="">Filter by Task...</option>
              {tasksList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.task_code}: {t.title.length > 25 ? t.title.substring(0, 25) + '...' : t.title}
                </option>
              ))}
            </select>
          </div>

          {/* User / Employee Dropdown */}
          <div className="w-40">
            <select
              value={selectedUserId || ''}
              onChange={(e) => {
                setSelectedUserId(e.target.value ? Number(e.target.value) : undefined);
                setJourneysPage(1);
                setStreamPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="">Filter by Employee...</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role?.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter for Journeys */}
          {viewMode === 'journeys' && (
            <div className="w-36">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setJourneysPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="review">Under Review</option>
                <option value="in_progress">In Progress</option>
                <option value="post_comment">Needs Correction</option>
                <option value="pending">Pending</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Filter
          </button>

          {(searchQuery || selectedTaskId || selectedUserId || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Reset
            </button>
          )}

          {/* Expand/Collapse All Buttons for Journeys */}
          {viewMode === 'journeys' && taskJourneys.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Expand All</span>
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Collapse All</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ======================================================== */}
      {/* VIEW MODE 1: SEPARATE TASK JOURNEYS (CREATION TO END)     */}
      {/* ======================================================== */}
      {viewMode === 'journeys' && (
        <div className="space-y-6">
          {loadingJourneys ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3" />
              <p className="font-semibold text-slate-700">Loading task journeys...</p>
              <p className="text-xs text-slate-400 mt-1">Organizing chronological milestones from creation to closure.</p>
            </div>
          ) : taskJourneys.length === 0 ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <GitBranch className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-base">No task journeys found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            taskJourneys.map((item: any) => {
              const task = item.task;
              const journey = item.journey || [];
              const isExpanded = expandedTaskIds.has(task.id);

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)] overflow-hidden transition-all duration-200 hover:border-slate-300"
                >
                  {/* Task Journey Header Bar */}
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 border-b border-slate-200/80">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Task Identifiers & Status */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-xs">
                            {task.task_code}
                          </span>
                          <h2 className="text-base font-bold text-slate-900 tracking-tight">
                            {task.title}
                          </h2>
                          <StatusBadge status={task.status} size="sm" />
                          <PriorityBadge priority={task.priority} />
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                            {task.handling_method?.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span>
                            <strong className="text-slate-700">Creator:</strong> {task.creator?.name || 'Creator'} ({task.creator?.role?.replace('_', ' ') || 'Admin'})
                          </span>
                          <span>•</span>
                          <span>
                            <strong className="text-slate-700">Current Owner:</strong> {task.current_owner?.name || 'Unassigned'}
                          </span>
                          {task.department && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {task.department.name}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            <strong className="text-slate-700">Initiated:</strong> {new Date(task.created_at).toLocaleDateString()}
                          </span>
                          {task.completed_at && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">
                                Closed: {new Date(task.completed_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Progress & Action Controls */}
                      <div className="flex items-center gap-4 shrink-0">
                        {/* Progress Meter */}
                        <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Progress</span>
                            <span className="text-sm font-bold text-blue-600">{task.progress}%</span>
                          </div>
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Open Task in Workspace */}
                        <button
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200/80 transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Open Task Workspace"
                        >
                          <span>Open Task</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Expand / Collapse Button */}
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer shrink-0"
                          title={isExpanded ? 'Collapse Journey' : 'Expand Journey'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Quick Journey Statistics Ribbon */}
                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap font-medium">
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>{journey.length} Journey Milestones (Creation → Completion)</span>
                        </span>
                        {item.stats?.submissions_count > 0 && (
                          <span className="text-slate-600">
                            {item.stats.submissions_count} Deliverable Submission(s)
                          </span>
                        )}
                        {item.stats?.reviews_count > 0 && (
                          <span className="text-slate-600">
                            • {item.stats.reviews_count} Evaluation Review(s)
                          </span>
                        )}
                        {item.stats?.attachments_count > 0 && (
                          <span className="text-slate-600">
                            • {item.stats.attachments_count} Uploaded Deliverable(s)
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleTaskExpansion(task.id)}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Task Journey' : 'View Full Top-to-Bottom Journey'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Task Journey Timeline: Top-to-Bottom from Creation to End */}
                  {isExpanded && (
                    <div className="p-6 sm:p-8 bg-slate-50/40">
                      <div className="mb-6 pb-3 border-b border-slate-200/80 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                            <span>Complete Task Journey (Top to Bottom: Creation to End)</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Every event is recorded in chronological sequence so you can follow the entire project lifecycle seamlessly.
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Step 1 of {journey.length} to Step {journey.length} of {journey.length}
                        </span>
                      </div>

                      {journey.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">
                          No milestone events recorded yet for this task.
                        </p>
                      ) : (
                        <div className="relative pl-6 sm:pl-8 border-l-2 border-blue-200/80 space-y-6 ml-3 my-2">
                          {journey.map((step: any, idx: number) => {
                            // Badge styling
                            let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                            let dotBg = 'bg-blue-600 ring-blue-100';
                            let IconComponent = Activity;

                            if (step.stage_type === 'creation') {
                              badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                              dotBg = 'bg-indigo-600 ring-indigo-100';
                              IconComponent = Sparkles;
                            } else if (step.stage_type === 'assignment') {
                              badgeClass = 'bg-sky-50 text-sky-700 border-sky-200';
                              dotBg = 'bg-sky-600 ring-sky-100';
                              IconComponent = User;
                            } else if (step.stage_type === 'submission') {
                              badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                              dotBg = 'bg-amber-600 ring-amber-100';
                              IconComponent = FileCheck2;
                            } else if (step.stage_type === 'review_approved') {
                              badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              dotBg = 'bg-emerald-600 ring-emerald-100';
                              IconComponent = CheckCircle2;
                            } else if (step.stage_type === 'review_returned') {
                              badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                              dotBg = 'bg-rose-600 ring-rose-100';
                              IconComponent = RotateCcw;
                            } else if (step.stage_type === 'clarification') {
                              badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                              dotBg = 'bg-purple-600 ring-purple-100';
                              IconComponent = MessageSquare;
                            } else if (step.stage_type === 'final_sign_off' || step.stage_type === 'completed') {
                              badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                              dotBg = 'bg-emerald-600 ring-emerald-200';
                              IconComponent = CheckCircle;
                            }

                            return (
                              <div key={idx} className="relative group">
                                {/* Milestone Node Dot */}
                                <div
                                  className={`absolute -left-[31px] sm:-left-[39px] top-1 w-4 h-4 rounded-full border-2 border-white ${dotBg} shadow-xs ring-4`}
                                />

                                {/* Milestone Card */}
                                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition space-y-3">
                                  {/* Milestone Top Row: Number, Stage Badge, Title, Timestamp */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {step.milestone_index}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badgeClass}`}>
                                        <IconComponent className="w-3 h-3" />
                                        <span>{step.badge_label}</span>
                                      </span>
                                      <h4 className="text-xs font-bold text-slate-900">
                                        {step.title}
                                      </h4>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>{step.formatted_time}</span>
                                      <span className="text-slate-300">({step.time_ago})</span>
                                    </div>
                                  </div>

                                  {/* Actor Information */}
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs shrink-0">
                                      {step.actor?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                      <span className="font-semibold text-slate-800">{step.actor?.name}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 capitalize">
                                        {step.actor?.role?.replace('_', ' ')}
                                      </span>
                                      {step.actor?.department && (
                                        <span className="text-slate-400 text-[10px]">
                                          • {step.actor.department}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Summary / Reason Payload */}
                                  {step.summary && (
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                      {step.summary}
                                    </div>
                                  )}

                                  {/* Attached Deliverable Files (if any uploaded during this step) */}
                                  {step.attachments && step.attachments.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Attached Deliverables ({step.attachments.length}):
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {step.attachments.map((file: any) => (
                                          <div
                                            key={file.id}
                                            className="flex items-center justify-between gap-2 p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                              <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 text-xs truncate" title={file.file_name}>
                                                  {file.file_name}
                                                </p>
                                                <span className="text-[10px] text-slate-400">{file.file_size}</span>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() => handleDownloadAttachment(file.id, file.file_name)}
                                              disabled={downloadingId === file.id}
                                              className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                                            >
                                              <Download className="w-3 h-3" />
                                              <span>{downloadingId === file.id ? 'Downloading...' : 'Download'}</span>
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Journey Outcome Banner at End of Journey */}
                      <div className="mt-6 pt-4 border-t border-slate-200/80">
                        {task.status === 'completed' ? (
                          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                            <div className="flex items-center gap-2 font-semibold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Journey Complete: All milestones executed, verified, and officially closed.</span>
                            </div>
                            <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                              Status: 100% Completed
                            </span>
                          </div>
                        ) : task.status === 'review' ? (
                          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                            <div className="flex items-center gap-2 font-semibold">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Active Journey: Currently under evaluation & review.</span>
                            </div>
                            <span className="font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                              Status: Under Review
                            </span>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs text-sky-900">
                            <div className="flex items-center gap-2 font-semibold">
                              <Activity className="w-4 h-4 text-sky-600 shrink-0" />
                              <span>Active Journey: Work currently in progress across task assignees.</span>
                            </div>
                            <span className="font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-200 capitalize">
                              Status: {task.status?.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Journeys Pagination */}
          {journeysLastPage > 1 && (
            <Pagination
              currentPage={journeysPage}
              lastPage={journeysLastPage}
              total={journeysTotal}
              onPageChange={(p) => setJourneysPage(p)}
            />
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 2: UNIFIED RAW LIVE ACTIVITY STREAM            */}
      {/* ======================================================== */}
      {viewMode === 'stream' && (
        <div className="space-y-6">
          {/* Quick Filter Type Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { key: 'all', label: 'All Logs', icon: Layers },
              { key: 'comment', label: 'Team Conversations', icon: MessageSquare },
              { key: 'status_change', label: 'Stage Transitions', icon: GitBranch },
              { key: 'review', label: 'Review Decisions', icon: FileCheck2 },
              { key: 'attachment', label: 'Deliverables & Files', icon: Paperclip },
            ].map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.key}
                  onClick={() => {
                    setTypeFilter(chip.key);
                    setStreamPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    typeFilter === chip.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Unified Logs Feed Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6 w-36">Event Type</th>
                    <th className="py-3.5 px-6 w-52">Task Associated</th>
                    <th className="py-3.5 px-6 w-44">Performed By</th>
                    <th className="py-3.5 px-6">Event Details & Communication Content</th>
                    <th className="py-3.5 px-6 w-32">Timestamp</th>
                    <th className="py-3.5 px-6 text-right w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                        <p>Loading enterprise work logs...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No logs found matching your filters.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try resetting the filter criteria to see all activities.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((item) => {
                      let typePill = { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Activity, label: 'Event' };

                      if (item.event_type === 'comment') {
                        typePill = { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: MessageSquare, label: 'Communication' };
                      } else if (item.event_type === 'status_change') {
                        typePill = { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: GitBranch, label: 'Transition' };
                      } else if (item.event_type === 'review') {
                        typePill = item.details?.decision === 'approved'
                          ? { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Approved' }
                          : { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: RotateCcw, label: 'Revision Requested' };
                      } else if (item.event_type === 'attachment') {
                        typePill = { bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: Paperclip, label: 'Deliverable' };
                      }

                      const TypeIcon = typePill.icon;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition group">
                          {/* Type */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${typePill.bg}`}>
                              <TypeIcon className="w-3.5 h-3.5" />
                              <span>{typePill.label}</span>
                            </span>
                          </td>

                          {/* Task */}
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-0.5">
                              <span
                                onClick={() => inspectSingleTaskDossier(item.task.id)}
                                className="font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer text-xs"
                              >
                                {item.task.task_code}
                              </span>
                              <span
                                onClick={() => inspectSingleTaskDossier(item.task.id)}
                                className="text-slate-800 font-semibold line-clamp-1 hover:text-blue-600 transition cursor-pointer text-xs"
                              >
                                {item.task.title}
                              </span>
                            </div>
                          </td>

                          {/* Actor */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs shrink-0">
                                {item.actor?.name?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-xs truncate">{item.actor?.name}</p>
                                <p className="text-[10px] text-slate-400 capitalize truncate">
                                  {item.actor?.role?.replace('_', ' ')} • {item.actor?.department}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Content / Detail Payload */}
                          <td className="py-4 px-6">
                            {item.event_type === 'comment' ? (
                              <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-slate-800 leading-relaxed text-xs">
                                <p className="whitespace-pre-wrap">{item.content}</p>
                                {item.details?.is_internal && (
                                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                    Internal Memo
                                  </span>
                                )}
                              </div>
                            ) : item.event_type === 'status_change' ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] uppercase">
                                    {item.details?.from_status || 'draft'}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-mono text-[10px] uppercase">
                                    {item.details?.to_status}
                                  </span>
                                </span>
                                {item.content && (
                                  <p className="text-slate-500 text-[11px] italic">"{item.content}"</p>
                                )}
                              </div>
                            ) : item.event_type === 'review' ? (
                              <div className="p-2.5 rounded-xl border text-xs space-y-1 bg-white border-slate-200">
                                <div className="font-bold text-slate-800">{item.action_title}</div>
                                {item.content && <p className="text-slate-600 leading-relaxed">{item.content}</p>}
                                {item.details?.return_to && (
                                  <p className="text-[10px] text-rose-600 font-medium">
                                    Returned directly to: {item.details.return_to}
                                  </p>
                                )}
                              </div>
                            ) : item.event_type === 'attachment' ? (
                              <div className="flex items-center gap-3 p-2 bg-sky-50/50 border border-sky-100 rounded-xl">
                                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                  <Paperclip className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-800 text-xs truncate">{item.details?.file_name}</p>
                                  <p className="text-[10px] text-slate-400">{item.details?.file_size_formatted}</p>
                                </div>
                                <button
                                  onClick={() => handleDownloadAttachment(item.details?.attachment_id || item.raw_id, item.details?.file_name || 'download')}
                                  disabled={downloadingId === (item.details?.attachment_id || item.raw_id)}
                                  className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{downloadingId === (item.details?.attachment_id || item.raw_id) ? 'Downloading...' : 'Download'}</span>
                                </button>
                              </div>
                            ) : (
                              <p className="text-slate-700 text-xs">{item.content}</p>
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex flex-col text-[11px]">
                              <span className="font-semibold text-slate-700">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.time_ago})
                              </span>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <button
                              onClick={() => inspectSingleTaskDossier(item.task.id)}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl font-semibold text-xs transition inline-flex items-center gap-1 border border-slate-200/80 cursor-pointer group-hover:border-blue-200"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={streamPage}
              lastPage={streamLastPage}
              total={streamTotal}
              onPageChange={(p) => setStreamPage(p)}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 3: SINGLE TASK DEEP DOSSIER                    */}
      {/* ======================================================== */}
      {viewMode === 'dossier' && (
        <div className="space-y-6">
          {/* Task Picker Selector Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-blue-600" />
                Select Task to Inspect:
              </span>
              <select
                value={dossierTaskId || ''}
                onChange={(e) => setDossierTaskId(Number(e.target.value))}
                className="w-full max-w-lg px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {tasksList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.task_code}: {t.title} ({t.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('journeys')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                ← Back to Task Journeys
              </button>
              {dossierTaskId && (
                <button
                  onClick={() => navigate(`/tasks/${dossierTaskId}`)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Task Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {loadingDossier ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3" />
              <p className="font-semibold text-slate-700">Compiling complete task journey dossier...</p>
              <p className="text-xs text-slate-400 mt-1">Retrieving all communications, attachments, timeline handovers, and decisions.</p>
            </div>
          ) : !dossierData ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <p className="font-semibold text-slate-700">Select a task above to view its journey dossier.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Task Header Summary Card */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
                      <span>Task Dossier</span>
                      <span>›</span>
                      <span className="font-bold text-blue-600">{dossierData.task.task_code}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 flex-wrap">
                      <span>{dossierData.task.title}</span>
                      <StatusBadge status={dossierData.task.status} />
                      <PriorityBadge priority={dossierData.task.priority} />
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-semibold block">Execution Progress</span>
                      <span className="text-lg font-bold text-blue-600">{dossierData.task.progress}%</span>
                    </div>
                    <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${dossierData.task.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Creator</span>
                    <span className="font-semibold text-slate-800">{dossierData.task.creator?.name || 'Creator'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Current Owner</span>
                    <span className="font-semibold text-slate-800">{dossierData.task.current_owner?.name || 'Unassigned'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Handling Method</span>
                    <span className="font-bold text-blue-600 uppercase">{dossierData.task.handling_method.replace('_', ' ')}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Department</span>
                    <span className="font-semibold text-slate-800">{dossierData.task.department?.name || 'General'}</span>
                  </div>
                </div>

                {/* Dossier Tabs Navigation */}
                <div className="flex gap-4 border-b border-slate-100 -mb-7 pt-2 text-xs font-semibold overflow-x-auto">
                  <button
                    onClick={() => setDossierTab('timeline')}
                    className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                      dossierTab === 'timeline'
                        ? 'border-blue-600 text-blue-600 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Complete Journey Timeline ({dossierData.timeline?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDossierTab('conversations')}
                    className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                      dossierTab === 'conversations'
                        ? 'border-blue-600 text-blue-600 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Communications Log ({dossierData.conversations?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDossierTab('attachments')}
                    className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                      dossierTab === 'attachments'
                        ? 'border-blue-600 text-blue-600 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Deliverables & Attachments ({dossierData.attachments?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDossierTab('branches')}
                    className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                      dossierTab === 'branches'
                        ? 'border-blue-600 text-blue-600 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Branches & Assignees ({dossierData.branches?.length || 0})</span>
                  </button>
                </div>
              </div>

              {/* Dossier Tab 1: Chronological Journey Timeline */}
              {dossierTab === 'timeline' && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Task Journey (Inception to Completion)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chronological progression of every milestone, status transition, review evaluation, and completion signoff.
                    </p>
                  </div>

                  <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-100 space-y-7 my-4 ml-3">
                    {dossierData.timeline?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No timeline entries found.</p>
                    ) : (
                      dossierData.timeline.map((step: any, idx: number) => {
                        let dotColor = 'bg-blue-600';
                        if (step.type === 'created' || step.stage_type === 'creation') dotColor = 'bg-indigo-600';
                        else if (step.type === 'approved' || step.type === 'completed' || step.stage_type === 'completed') dotColor = 'bg-emerald-600';
                        else if (step.type === 'returned' || step.stage_type === 'review_returned') dotColor = 'bg-rose-600';
                        else if (step.type === 'hold') dotColor = 'bg-amber-600';

                        return (
                          <div key={idx} className="relative group">
                            {/* Dot */}
                            <div className={`absolute -left-[31px] sm:-left-[39px] top-0 w-4 h-4 rounded-full border-2 border-white ${dotColor} shadow-xs ring-4 ring-slate-50`} />

                            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800">{step.title}</span>
                                <span className="text-[11px] font-medium text-slate-400">
                                  {step.formatted_time || step.timestamp}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">{step.summary || step.details}</p>

                              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                                <span>Action by:</span>
                                <span className="font-semibold text-slate-800">{step.actor?.name || step.actor}</span>
                                <span className="capitalize text-slate-400">
                                  ({(step.actor?.role || step.role)?.replace('_', ' ')})
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Dossier Tab 2: Communications Transcript */}
              {dossierTab === 'conversations' && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">All Communications Transcript</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Complete communication thread between everyone collaborating on this task.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {dossierData.conversations?.length || 0} messages
                    </span>
                  </div>

                  <div className="space-y-4">
                    {dossierData.conversations?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-8 text-center">
                        No team messages or notes logged for this task yet.
                      </p>
                    ) : (
                      dossierData.conversations.map((msg: any) => (
                        <div key={msg.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs">
                                {msg.user?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 text-xs">{msg.user?.name}</span>
                                <span className="ml-2 px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700 capitalize">
                                  {msg.user?.role?.replace('_', ' ')}
                                </span>
                                {msg.branch && (
                                  <span className="ml-1.5 text-[10px] text-slate-400">
                                    Branch: {msg.branch.title}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {new Date(msg.created_at).toLocaleString()} ({msg.time_ago})
                            </span>
                          </div>

                          <div className="text-xs text-slate-800 leading-relaxed pl-9 whitespace-pre-wrap">
                            {msg.comment}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Dossier Tab 3: Deliverables Vault */}
              {dossierTab === 'attachments' && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Deliverables & Attachments Vault</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Every document, design file, and deliverable attached to this task throughout its lifecycle.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {dossierData.attachments?.length || 0} files
                    </span>
                  </div>

                  {dossierData.attachments?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-8 text-center">
                      No files or deliverables attached to this task.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dossierData.attachments.map((file: any) => (
                        <div
                          key={file.id}
                          className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3 hover:border-blue-300 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <Paperclip className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-900 text-xs truncate" title={file.file_name}>
                                {file.file_name}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {file.file_size_formatted} • {file.uploaded_by?.name || 'User'}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDownloadAttachment(file.id, file.file_name)}
                            disabled={downloadingId === file.id}
                            className="w-full py-1.5 bg-white hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{downloadingId === file.id ? 'Downloading...' : 'Download File'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dossier Tab 4: Branches & Collaborators */}
              {dossierTab === 'branches' && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Task Branches & Delegations</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hierarchical branches, sub-assignees, and delegated scopes on this task.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dossierData.branches?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No separate branches created.</p>
                    ) : (
                      dossierData.branches.map((b: any) => (
                        <div key={b.id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{b.title}</span>
                            <StatusBadge status={b.status} size="sm" />
                          </div>
                          <div className="text-xs text-slate-600">
                            <strong>Owner:</strong> {b.owner?.name || 'Unassigned'} ({b.owner?.role?.replace('_', ' ') || 'Assignee'})
                          </div>
                          {b.description && (
                            <p className="text-[11px] text-slate-500">{b.description}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkLogsPage;
