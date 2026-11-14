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
  User,
  CheckCircle,
  Clock,
  Building2,
  AlertCircle,
  X,
  UserPlus,
  UserX,
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.get('search') || '');

  // Single Dossier inspect state
  const [dossierTaskId, setDossierTaskId] = useState<number | null>(
    searchParams.get('inspect_task') ? Number(searchParams.get('inspect_task')) : null
  );
  const [dossierData, setDossierData] = useState<any>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierTab, setDossierTab] = useState<'timeline' | 'conversations' | 'attachments' | 'branches'>('timeline');

  // Download state
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const handleDownloadAttachment = async (attachmentId: number, fileName: string) => {
    setDownloadingId(attachmentId);
    try {
      await tasksApi.downloadAttachment(attachmentId, fileName);
    } catch (err: any) {
      console.error('Download error:', err);
      // Fallback: direct window download via tokenized endpoint
      try {
        const directUrl = tasksApi.getAttachmentDownloadUrl(attachmentId);
        const link = document.createElement('a');
        link.href = directUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackErr) {
        showToast(err.response?.data?.message || err.message || 'Failed to download file', 'error');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fluent instant live search debounced by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setJourneysPage(1);
      setStreamPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (viewMode === 'journeys') {
      loadTaskJourneys();
    } else if (viewMode === 'stream') {
      loadLogs();
    }
  }, [viewMode, journeysPage, streamPage, selectedTaskId, selectedUserId, statusFilter, typeFilter, debouncedSearchQuery]);

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
        search: debouncedSearchQuery.trim() || undefined,
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
        search: debouncedSearchQuery.trim() || undefined,
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity Logs</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Task History
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track assignments, submissions, comments, and approvals across all tasks.
          </p>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200">
          <button
            onClick={() => setViewMode('journeys')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
              viewMode === 'journeys'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>By Task</span>
          </button>
          <button
            onClick={() => setViewMode('stream')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
              viewMode === 'stream'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>All Activity</span>
          </button>
          {dossierTaskId && (
            <button
              onClick={() => setViewMode('dossier')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'dossier'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Task Details</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events */}
        <div
          onClick={() => {
            setViewMode('journeys');
            setStatusFilter('all');
            setJourneysPage(1);
          }}
          className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Events</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
            {stats.total_logs}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>All recorded actions</span>
            <span className="text-blue-600 font-medium group-hover:underline">View by Task →</span>
          </div>
        </div>

        {/* Card 2: Comments & Discussions */}
        <div
          onClick={() => {
            setViewMode('stream');
            setTypeFilter('comment');
            setStreamPage(1);
          }}
          className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Comments & Notes</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-indigo-600 transition-colors">
            {stats.total_comments}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Team discussions</span>
            <span className="text-indigo-600 font-medium group-hover:underline">View Comments →</span>
          </div>
        </div>

        {/* Card 3: Status Updates */}
        <div
          onClick={() => {
            setViewMode('stream');
            setTypeFilter('status_change');
            setStreamPage(1);
          }}
          className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Status Changes</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
              <GitBranch className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-amber-600 transition-colors">
            {stats.total_status_changes}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Workflow transitions</span>
            <span className="text-amber-600 font-medium group-hover:underline">View Changes →</span>
          </div>
        </div>

        {/* Card 4: Files Uploaded */}
        <div
          onClick={() => {
            setViewMode('stream');
            setTypeFilter('attachment');
            setStreamPage(1);
          }}
          className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Files Uploaded</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
              <Paperclip className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tracking-tight group-hover:text-emerald-600 transition-colors">
            {stats.total_attachments}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Deliverables & assets</span>
            <span className="text-emerald-600 font-medium group-hover:underline">Browse Files →</span>
          </div>
        </div>
      </div>

      {/* Search & Selection Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by task title, ID, user, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
              <option value="">Filter by User...</option>
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
                <option value="cancelled">Cancelled</option>
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
              const progress = typeof task.progress === 'number'
                ? task.progress
                : (task.status === 'completed' ? 100 : (task.status === 'review' ? 80 : (task.status === 'in_progress' ? 50 : 10)));

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all duration-200 hover:border-slate-300"
                >
                  {/* Task Card Header Bar */}
                  <div className="p-4 sm:p-5 bg-white border-b border-slate-100">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: Task Identifiers & Status */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-xs">
                            {task.task_code}
                          </span>
                          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                            {task.title}
                          </h2>
                          <StatusBadge status={task.status} size="sm" />
                          <PriorityBadge priority={task.priority} />
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                            {task.handling_method?.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span>
                            <strong className="text-slate-700">Created by:</strong> {task.creator?.name || 'Creator'} ({task.creator?.role?.replace('_', ' ') || 'Admin'})
                          </span>
                          <span>•</span>
                          <span>
                            <strong className="text-slate-700">Assignee:</strong> {task.current_owner?.name || 'Unassigned'}
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
                            <strong className="text-slate-700">Created:</strong> {new Date(task.created_at).toLocaleDateString()}
                          </span>
                          {task.completed_at && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">
                                Completed: {new Date(task.completed_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Progress & Action Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Progress Meter */}
                        <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Progress</span>
                            <span className="text-xs font-bold text-slate-800">{progress}%</span>
                          </div>
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Open Task in Workspace */}
                        <button
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold border border-slate-200 transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Open Task Workspace"
                        >
                          <span>Open Task</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Expand / Collapse Button */}
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition cursor-pointer shrink-0"
                          title={isExpanded ? 'Collapse Timeline' : 'Expand Timeline'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Quick Statistics Ribbon */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap font-medium text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-slate-500" />
                          <span>{journey.length} events</span>
                        </span>
                        {item.stats?.submissions_count > 0 && (
                          <span>
                            • {item.stats.submissions_count} submission{item.stats.submissions_count > 1 ? 's' : ''}
                          </span>
                        )}
                        {item.stats?.reviews_count > 0 && (
                          <span>
                            • {item.stats.reviews_count} review{item.stats.reviews_count > 1 ? 's' : ''}
                          </span>
                        )}
                        {item.stats?.attachments_count > 0 && (
                          <span>
                            • {item.stats.attachments_count} file{item.stats.attachments_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleTaskExpansion(task.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Activity' : 'View Activity'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Task Timeline */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 bg-slate-50/50 border-t border-slate-100">
                      <div className="mb-4 pb-2 border-b border-slate-200/80 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Activity Timeline
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {journey.length} recorded events
                        </span>
                      </div>

                      {journey.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">
                          No activity recorded yet for this task.
                        </p>
                      ) : (
                        <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 ml-2 my-2">
                          {journey.map((step: any, idx: number) => {
                            let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                            let dotBg = 'bg-blue-500';
                            let IconComponent = Activity;

                            if (step.stage_type === 'creation') {
                              badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                              dotBg = 'bg-indigo-500';
                              IconComponent = Activity;
                            } else if (step.stage_type === 'assignment') {
                              badgeClass = 'bg-sky-50 text-sky-700 border-sky-200';
                              dotBg = 'bg-sky-500';
                              IconComponent = User;
                            } else if (step.stage_type === 'status_change') {
                              badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                              dotBg = 'bg-amber-500';
                              IconComponent = GitBranch;
                            } else if (step.stage_type === 'submission') {
                              badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                              dotBg = 'bg-amber-500';
                              IconComponent = FileCheck2;
                            } else if (step.stage_type === 'review_approved') {
                              badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              dotBg = 'bg-emerald-500';
                              IconComponent = CheckCircle2;
                            } else if (step.stage_type === 'review_returned') {
                              badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                              dotBg = 'bg-rose-500';
                              IconComponent = RotateCcw;
                            } else if (step.stage_type === 'clarification' || step.stage_type === 'communication') {
                              badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                              dotBg = 'bg-purple-500';
                              IconComponent = MessageSquare;
                            } else if (step.stage_type === 'final_sign_off' || step.stage_type === 'completed') {
                              badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                              dotBg = 'bg-emerald-600';
                              IconComponent = CheckCircle;
                            }

                            return (
                              <div key={idx} className="relative group">
                                {/* Milestone Node Dot */}
                                <div
                                  className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${dotBg} shadow-2xs`}
                                />

                                {/* Milestone Card */}
                                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-2">
                                  {/* Milestone Top Row: Badge, Title, Timestamp */}
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1 ${badgeClass}`}>
                                        <IconComponent className="w-3 h-3" />
                                        <span>{step.badge_label}</span>
                                      </span>
                                      <h4 className="text-xs font-semibold text-slate-900">
                                        {step.title}
                                      </h4>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                      <Clock className="w-3 h-3" />
                                      <span>{step.formatted_time}</span>
                                      <span className="text-slate-300">({step.time_ago})</span>
                                    </div>
                                  </div>

                                  {/* Actor Information */}
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-[10px] shrink-0">
                                      {step.actor?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                      <span className="font-semibold text-slate-800">{step.actor?.name}</span>
                                      <span className="text-slate-400 capitalize">
                                        • {step.actor?.role?.replace('_', ' ')}
                                      </span>
                                      {step.actor?.department && (
                                        <span className="text-slate-400">
                                          ({step.actor.department})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Summary / Notes Payload */}
                                  {step.summary && (
                                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                      {step.summary}
                                    </div>
                                  )}

                                  {/* Attached Files */}
                                  {step.attachments && step.attachments.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                        Attachments ({step.attachments.length}):
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {step.attachments.map((file: any) => (
                                          <div
                                            key={file.id}
                                            className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                              <div className="min-w-0">
                                                <p className="font-medium text-slate-800 text-xs truncate" title={file.file_name}>
                                                  {file.file_name}
                                                </p>
                                                <span className="text-[10px] text-slate-400">{file.file_size}</span>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() => handleDownloadAttachment(file.id, file.file_name)}
                                              disabled={downloadingId === file.id}
                                              className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium transition flex items-center gap-1 shrink-0 cursor-pointer"
                                            >
                                              <Download className="w-3 h-3" />
                                              <span>{downloadingId === file.id ? '...' : 'Download'}</span>
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
                      <div className="mt-5 pt-3 border-t border-slate-200">
                        {task.status === 'completed' ? (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
                            <div className="flex items-center gap-2 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Task completed and verified.</span>
                            </div>
                            <span className="font-semibold text-emerald-700 bg-white px-2.5 py-0.5 rounded border border-emerald-200">
                              Completed (100%)
                            </span>
                          </div>
                        ) : task.status === 'review' ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
                            <div className="flex items-center gap-2 font-medium">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Task is currently under review.</span>
                            </div>
                            <span className="font-semibold text-amber-700 bg-white px-2.5 py-0.5 rounded border border-amber-200">
                              Under Review
                            </span>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-700">
                            <div className="flex items-center gap-2 font-medium">
                              <Activity className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>Work in progress.</span>
                            </div>
                            <span className="font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded border border-slate-200 capitalize">
                              {task.status?.replace('_', ' ')}
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
              { key: 'all', label: 'All Activity', icon: Layers },
              { key: 'comment', label: 'Comments', icon: MessageSquare },
              { key: 'status_change', label: 'Status Updates', icon: GitBranch },
              { key: 'review', label: 'Reviews', icon: FileCheck2 },
              { key: 'attachment', label: 'Files', icon: Paperclip },
            ].map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.key}
                  onClick={() => {
                    setTypeFilter(chip.key);
                    setStreamPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    typeFilter === chip.key
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Unified Logs Feed Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-5 w-36">Event</th>
                    <th className="py-3 px-5 w-48">Task</th>
                    <th className="py-3 px-5 w-40">User</th>
                    <th className="py-3 px-5">Details</th>
                    <th className="py-3 px-5 w-32">Date</th>
                    <th className="py-3 px-5 text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
                        <p>Loading activity logs...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No activity logs found.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try adjusting the filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((item) => {
                      let typePill = { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Activity, label: 'Event' };

                      if (item.event_type === 'comment') {
                        typePill = { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: MessageSquare, label: 'Comment' };
                      } else if (item.event_type === 'status_change') {
                        const isWithdrawn = item.action_title?.toLowerCase().includes('withdrawn') || item.content?.toLowerCase().includes('withdrawn') || item.content?.toLowerCase().includes('cancelled');
                        const isAssigned = item.action_title?.toLowerCase().includes('assigned') || item.content?.toLowerCase().includes('assigned');
                        if (isWithdrawn) {
                          typePill = { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: UserX, label: 'Withdrawn' };
                        } else if (isAssigned) {
                          typePill = { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: UserPlus, label: 'Assigned' };
                        } else {
                          typePill = { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: GitBranch, label: 'Status' };
                        }
                      } else if (item.event_type === 'review') {
                        typePill = item.details?.decision === 'approved'
                          ? { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Approved' }
                          : { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: RotateCcw, label: 'Returned' };
                      } else if (item.event_type === 'attachment') {
                        typePill = { bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: Paperclip, label: 'File' };
                      }

                      const TypeIcon = typePill.icon;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition group">
                          {/* Type */}
                          <td className="py-3 px-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typePill.bg}`}>
                              <TypeIcon className="w-3.5 h-3.5" />
                              <span>{typePill.label}</span>
                            </span>
                          </td>

                          {/* Task */}
                          <td className="py-3 px-5">
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
                          <td className="py-3 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-[10px] shrink-0">
                                {item.actor?.name?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-xs truncate">{item.actor?.name}</p>
                                <p className="text-[10px] text-slate-400 capitalize truncate">
                                  {item.actor?.role?.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Content / Detail Payload */}
                          <td className="py-3 px-5">
                            {item.event_type === 'comment' ? (
                              <div className="p-2.5 bg-indigo-50/40 border border-indigo-100 rounded-lg text-slate-800 leading-relaxed text-xs">
                                <p className="whitespace-pre-wrap">{item.content}</p>
                                {item.details?.is_internal && (
                                  <span className="mt-1 inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                    Internal Note
                                  </span>
                                )}
                              </div>
                            ) : item.event_type === 'status_change' ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] uppercase">
                                    {item.details?.from_status || 'draft'}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-mono text-[10px] uppercase">
                                    {item.details?.to_status}
                                  </span>
                                </span>
                                {item.content && (
                                  <p className="text-slate-500 text-[11px] italic">"{item.content}"</p>
                                )}
                              </div>
                            ) : item.event_type === 'review' ? (
                              <div className="p-2 rounded-lg border text-xs space-y-1 bg-white border-slate-200">
                                <div className="font-semibold text-slate-800">{item.action_title}</div>
                                {item.content && <p className="text-slate-600 leading-relaxed">{item.content}</p>}
                                {item.details?.return_to && (
                                  <p className="text-[10px] text-rose-600 font-medium">
                                    Returned to: {item.details.return_to}
                                  </p>
                                )}
                              </div>
                            ) : item.event_type === 'attachment' ? (
                              <div className="flex items-center gap-2.5 p-2 bg-sky-50/50 border border-sky-100 rounded-lg">
                                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                  <Paperclip className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-slate-800 text-xs truncate">{item.details?.file_name}</p>
                                  <p className="text-[10px] text-slate-400">{item.details?.file_size_formatted}</p>
                                </div>
                                <button
                                  onClick={() => handleDownloadAttachment(item.details?.attachment_id || item.raw_id, item.details?.file_name || 'download')}
                                  disabled={downloadingId === (item.details?.attachment_id || item.raw_id)}
                                  className="px-2 py-0.5 bg-white hover:bg-sky-50 text-sky-600 border border-sky-200 rounded text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{downloadingId === (item.details?.attachment_id || item.raw_id) ? '...' : 'Download'}</span>
                                </button>
                              </div>
                            ) : (
                              <p className="text-slate-700 text-xs">{item.content}</p>
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-5 whitespace-nowrap">
                            <div className="flex flex-col text-[11px]">
                              <span className="font-medium text-slate-700">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.time_ago})
                              </span>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <button
                              onClick={() => inspectSingleTaskDossier(item.task.id)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 border border-slate-200 cursor-pointer group-hover:border-blue-200"
                            >
                              <span>View</span>
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
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-semibold text-slate-700 text-xs shrink-0 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-blue-600" />
                Select Task:
              </span>
              <select
                value={dossierTaskId || ''}
                onChange={(e) => setDossierTaskId(Number(e.target.value))}
                className="w-full max-w-lg px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                ← Back to Task List
              </button>
              {dossierTaskId && (
                <button
                  onClick={() => navigate(`/tasks/${dossierTaskId}`)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Task</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {loadingDossier ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3" />
              <p className="font-semibold text-slate-700">Loading task details...</p>
              <p className="text-xs text-slate-400 mt-1">Retrieving timeline, comments, and attachments.</p>
            </div>
          ) : !dossierData ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-700">Select a task above to view its details.</p>
            </div>
          ) : (() => {
            const dossierProgress = typeof dossierData.task.progress === 'number'
              ? dossierData.task.progress
              : (dossierData.task.status === 'completed' ? 100 : (dossierData.task.status === 'review' ? 80 : 50));

            return (
              <div className="space-y-6">
                {/* Task Header Summary Card */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-xs text-slate-400">
                        <span>Task Overview</span>
                        <span>›</span>
                        <span className="font-bold text-blue-600">{dossierData.task.task_code}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                        <span>{dossierData.task.title}</span>
                        <StatusBadge status={dossierData.task.status} />
                        <PriorityBadge priority={dossierData.task.priority} />
                      </h2>
                    </div>

                    <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Progress</span>
                        <span className="text-xs font-bold text-slate-800">{dossierProgress}%</span>
                      </div>
                      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${dossierProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metadata Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Creator</span>
                      <span className="font-semibold text-slate-800">{dossierData.task.creator?.name || 'Creator'}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Assignee</span>
                      <span className="font-semibold text-slate-800">{dossierData.task.current_owner?.name || 'Unassigned'}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Type</span>
                      <span className="font-semibold text-blue-600 uppercase">{dossierData.task.handling_method.replace('_', ' ')}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Department</span>
                      <span className="font-semibold text-slate-800">{dossierData.task.department?.name || 'General'}</span>
                    </div>
                  </div>

                  {/* Dossier Tabs Navigation */}
                  <div className="flex gap-4 border-b border-slate-100 -mb-6 pt-1 text-xs font-semibold overflow-x-auto">
                    <button
                      onClick={() => setDossierTab('timeline')}
                      className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                        dossierTab === 'timeline'
                          ? 'border-blue-600 text-blue-600 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Timeline ({dossierData.timeline?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setDossierTab('conversations')}
                      className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                        dossierTab === 'conversations'
                          ? 'border-blue-600 text-blue-600 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Comments ({dossierData.conversations?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setDossierTab('attachments')}
                      className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                        dossierTab === 'attachments'
                          ? 'border-blue-600 text-blue-600 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Files ({dossierData.attachments?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setDossierTab('branches')}
                      className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                        dossierTab === 'branches'
                          ? 'border-blue-600 text-blue-600 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Subtasks ({dossierData.branches?.length || 0})</span>
                    </button>
                  </div>
                </div>

                {/* Dossier Tab 1: Chronological Journey Timeline */}
                {dossierTab === 'timeline' && (
                  <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activity Timeline</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chronological progression of status updates, reviews, and decisions.
                      </p>
                    </div>

                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 my-2 ml-2">
                      {dossierData.timeline?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No timeline entries found.</p>
                      ) : (
                        dossierData.timeline.map((step: any, idx: number) => {
                          let dotColor = 'bg-blue-500';
                          if (step.type === 'created' || step.stage_type === 'creation') dotColor = 'bg-indigo-500';
                          else if (step.type === 'approved' || step.type === 'completed' || step.stage_type === 'completed') dotColor = 'bg-emerald-500';
                          else if (step.type === 'returned' || step.stage_type === 'review_returned') dotColor = 'bg-rose-500';
                          else if (step.type === 'hold') dotColor = 'bg-amber-500';
                          else if (step.stage_type === 'status_change') dotColor = 'bg-amber-500';

                          return (
                            <div key={idx} className="relative group">
                              {/* Dot */}
                              <div className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${dotColor} shadow-2xs`} />

                              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 hover:bg-slate-100/70 transition space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-800">{step.title}</span>
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
                  <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Comments & Discussion</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Notes and messages exchanged on this task.
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {dossierData.conversations?.length || 0} messages
                      </span>
                    </div>

                    <div className="space-y-3">
                      {dossierData.conversations?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">
                          No messages or notes logged for this task yet.
                        </p>
                      ) : (
                        dossierData.conversations.map((msg: any) => (
                          <div key={msg.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-[10px]">
                                  {msg.user?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900 text-xs">{msg.user?.name}</span>
                                  <span className="ml-1.5 text-[10px] text-slate-400 capitalize">
                                    • {msg.user?.role?.replace('_', ' ')}
                                  </span>
                                  {msg.branch && (
                                    <span className="ml-1 text-[10px] text-slate-400">
                                      ({msg.branch.title})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>

                            <div className="text-xs text-slate-700 leading-relaxed pl-8 whitespace-pre-wrap">
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
                  <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Files & Attachments</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Documents and deliverables uploaded to this task.
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {dossierData.attachments?.length || 0} files
                      </span>
                    </div>

                    {dossierData.attachments?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        No files or deliverables attached to this task.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dossierData.attachments.map((file: any) => (
                          <div
                            key={file.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                <Paperclip className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-slate-900 text-xs truncate" title={file.file_name}>
                                  {file.file_name}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                  {file.file_size_formatted} • {file.uploaded_by?.name || 'User'}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDownloadAttachment(file.id, file.file_name)}
                              disabled={downloadingId === file.id}
                              className="w-full py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
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
                  <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subtasks & Team Members</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Assigned subtasks and team members for this task.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dossierData.branches?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No subtasks created.</p>
                      ) : (
                        dossierData.branches.map((b: any) => (
                          <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 text-xs">{b.title}</span>
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
            );
          })()}
        </div>
      )}
    
      {/* Floating Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 text-xs font-semibold select-none bg-white/95 text-slate-800 border-slate-200 max-w-md">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
</div>
  );
};

export default WorkLogsPage;
