import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task, TaskSubmission } from '../../api/tasks';
import { usersApi } from '../../api/users';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { ReviewModal } from '../../components/ReviewModal';
import {
  FileText,
  GitBranch,
  Users,
  MessageSquare,
  Paperclip,
  History,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  XCircle,
  Send,
  Upload,
  Check,
  UserPlus,
  Search,
  X,
  Plus,
  Target,
  Clock,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Download,
  HelpCircle,
  Zap,
  Sparkles,
  Ban,
  Trash2,
} from 'lucide-react';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'assignments' | 'comments' | 'attachments' | 'history'>('overview');

  // Interactive Action states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionDesc, setSubmissionDesc] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [submittingWork, setSubmittingWork] = useState(false);

  // Final Completion Modal state (Final Approval & Complete with Description + Attachments)
  const [isFinalCompleteModalOpen, setIsFinalCompleteModalOpen] = useState(false);
  const [finalCompleteDesc, setFinalCompleteDesc] = useState('');
  const [finalCompleteFiles, setFinalCompleteFiles] = useState<File[]>([]);
  const [submittingFinal, setSubmittingFinal] = useState(false);

  // Request Missing Details Modal state (Assignee -> Assigner)
  const [isRequestDetailsModalOpen, setIsRequestDetailsModalOpen] = useState(false);
  const [requestDetailsQuestion, setRequestDetailsQuestion] = useState('');
  const [requestDetailsFiles, setRequestDetailsFiles] = useState<File[]>([]);
  const [submittingRequestDetails, setSubmittingRequestDetails] = useState(false);

  // Provide Missing Details Modal state (Assigner -> Assignee)
  const [isProvideDetailsModalOpen, setIsProvideDetailsModalOpen] = useState(false);
  const [provideDetailsResponse, setProvideDetailsResponse] = useState('');
  const [provideDetailsFiles, setProvideDetailsFiles] = useState<File[]>([]);
  const [submittingProvideDetails, setSubmittingProvideDetails] = useState(false);

  // Review Modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);

  // Assign & Collaborate Modal state (1 to Many)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalType, setAssignModalType] = useState<'assign' | 'collaborate'>('assign');
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedModalUserIds, setSelectedModalUserIds] = useState<number[]>([]);
  const [submittingModal, setSubmittingModal] = useState(false);
  const [modalError, setModalError] = useState('');

  // Cancellation Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingTask, setCancellingTask] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Delete Task Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Hold Task Modal state
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [holdingTask, setHoldingTask] = useState(false);
  const [holdError, setHoldError] = useState('');

  // Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    if (id) loadTask(Number(id));
  }, [id]);

  const loadTask = async (taskId: number) => {
    setLoading(true);
    try {
      const data = await tasksApi.get(taskId);
      setTask(data);
    } catch (err) {
      console.error('Failed to load task details', err);
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = async (type: 'assign' | 'collaborate') => {
    setAssignModalType(type);
    setModalSearch('');
    setSelectedModalUserIds([]);
    setModalError('');
    setIsAssignModalOpen(true);
    if (allUsersList.length === 0) {
      try {
        const res = await usersApi.list({ per_page: 100 });
        setAllUsersList(res.data || []);
      } catch (err) {
        console.error('Failed to load users for assignment', err);
      }
    }
  };

  const toggleModalUser = (userId: number) => {
    setSelectedModalUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAssignModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || selectedModalUserIds.length === 0) return;

    setSubmittingModal(true);
    setModalError('');
    try {
      if (assignModalType === 'assign') {
        await tasksApi.addAssignees(task.id, selectedModalUserIds);
      } else {
        await tasksApi.addCollaborators(task.id, selectedModalUserIds);
      }
      setIsAssignModalOpen(false);
      setSelectedModalUserIds([]);
      loadTask(task.id);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to update task');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleOpenHoldModal = () => {
    setHoldReason('');
    setHoldError('');
    setIsHoldModalOpen(true);
  };

  const handleConfirmHold = async () => {
    if (!task) return;
    if (!holdReason.trim()) {
      setHoldError('Please provide a reason note for placing this task on hold.');
      return;
    }

    setHoldingTask(true);
    setHoldError('');
    try {
      await tasksApi.hold(task.id, holdReason.trim());
      setIsHoldModalOpen(false);
      setHoldReason('');
      showToast('Task has been placed on hold.', 'info');
      loadTask(task.id);
    } catch (err: any) {
      setHoldError(err.response?.data?.message || 'Failed to place task on hold');
    } finally {
      setHoldingTask(false);
    }
  };

  const handleResume = async () => {
    if (!task) return;
    try {
      await tasksApi.resume(task.id);
      showToast('Task resumed and returned to active workflow.', 'success');
      loadTask(task.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to resume task', 'error');
    }
  };

  const handleOpenCancelModal = () => {
    setCancelReason('');
    setCancelError('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!task) return;
    if (!cancelReason || cancelReason.trim().length < 3) {
      setCancelError('Please enter a cancellation reason note (minimum 3 characters).');
      return;
    }

    setCancellingTask(true);
    setCancelError('');
    try {
      await tasksApi.cancel(task.id, cancelReason.trim());
      setIsCancelModalOpen(false);
      setCancelReason('');
      loadTask(task.id);
    } catch (err: any) {
      setCancelError(err.response?.data?.message || 'Failed to cancel task.');
    } finally {
      setCancellingTask(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!task) return;
    setDeletingTask(true);
    setDeleteError('');
    try {
      await tasksApi.delete(task.id);
      setIsDeleteModalOpen(false);
      navigate('/tasks');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete task.');
    } finally {
      setDeletingTask(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !submissionDesc.trim()) return;

    setSubmittingWork(true);
    try {
      const formData = new FormData();
      formData.append('description', submissionDesc.trim());
      submissionFiles.forEach((file) => {
        formData.append('attachments[]', file);
      });

      await tasksApi.submitWork(task.id, formData);
      setIsSubmitModalOpen(false);
      setSubmissionDesc('');
      setSubmissionFiles([]);
      showToast('Work submitted for review successfully.', 'success');
      loadTask(task.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit work', 'error');
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!task) return;

    setSubmittingFinal(true);
    try {
      const formData = new FormData();
      if (finalCompleteDesc.trim()) {
        formData.append('description', finalCompleteDesc.trim());
      }
      finalCompleteFiles.forEach((file) => {
        formData.append('attachments[]', file);
      });

      await tasksApi.finalSubmit(task.id, formData);
      setIsFinalCompleteModalOpen(false);
      setFinalCompleteDesc('');
      setFinalCompleteFiles([]);
      showToast('Task approved and completed successfully!', 'success');
      loadTask(task.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to complete task', 'error');
    } finally {
      setSubmittingFinal(false);
    }
  };

  const handleRequestDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !requestDetailsQuestion.trim()) return;

    setSubmittingRequestDetails(true);
    try {
      const formData = new FormData();
      formData.append('question', requestDetailsQuestion.trim());
      requestDetailsFiles.forEach((f) => formData.append('attachments[]', f));

      await tasksApi.requestDetails(task.id, formData);
      setIsRequestDetailsModalOpen(false);
      setRequestDetailsQuestion('');
      setRequestDetailsFiles([]);
      showToast('Clarification request sent to assigner.', 'info');
      loadTask(task.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send request for missing details', 'error');
    } finally {
      setSubmittingRequestDetails(false);
    }
  };

  const handleProvideDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !provideDetailsResponse.trim()) return;

    setSubmittingProvideDetails(true);
    try {
      const formData = new FormData();
      formData.append('response', provideDetailsResponse.trim());
      provideDetailsFiles.forEach((f) => formData.append('attachments[]', f));

      await tasksApi.provideDetails(task.id, formData);
      setIsProvideDetailsModalOpen(false);
      setProvideDetailsResponse('');
      setProvideDetailsFiles([]);
      showToast('Clarification details submitted successfully.', 'success');
      loadTask(task.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to provide clarification details', 'error');
    } finally {
      setSubmittingProvideDetails(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !commentText.trim()) return;

    setPostingComment(true);
    try {
      await tasksApi.addComment({
        task_id: task.id,
        comment: commentText.trim(),
      });
      setCommentText('');
      showToast('Comment posted.', 'success');
      loadTask(task.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add comment', 'error');
    } finally {
      setPostingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', String(task.id));

    setUploadingFile(true);
    try {
      await tasksApi.uploadAttachment(formData);
      showToast('Attachment uploaded successfully.', 'success');
      loadTask(task.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to upload attachment', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownloadAttachment = async (attachmentId: number, fileName: string) => {
    setDownloadingId(attachmentId);
    try {
      await tasksApi.downloadAttachment(attachmentId, fileName);
    } catch (err: any) {
      console.error('Download error:', err);
      showToast(err.response?.data?.message || 'Failed to download attachment', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-72" />
        <div className="h-40 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 rounded-2xl md:col-span-2" />
          <div className="h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Task Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested task does not exist or you lack permission to view it.</p>
        <button
          onClick={() => navigate('/tasks')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  // Find latest pending submission if available for review (must NOT be current user's own submission)
  const latestPendingSubmission = task.submissions?.find((s) => {
    if (s.reviews && s.reviews.length > 0) return false;
    if (s.submitted_by?.id === currentUser?.id) return false;
    if (currentUser?.role === 'admin' || currentUser?.role === 'sub_admin') return true;

    // Check if the current user assigned this submission's branch
    const branch = task.branches?.find((b) => b.id === s.branch_id);
    if (branch && branch.assigned_by?.id === currentUser?.id) return true;
    if (!branch && task.creator?.id === currentUser?.id) return true;
    return false;
  }) || task.submissions?.find(
    (s) => (!s.reviews || s.reviews.length === 0) && (!currentUser || currentUser.role === 'admin' || currentUser.role === 'sub_admin' || s.submitted_by?.id !== currentUser.id)
  );

  const getSlaBadge = () => {
    if (task.status === 'completed') {
      return { text: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (!task.due_date) {
      return { text: 'No SLA Set', color: 'bg-slate-50 text-slate-500 border-slate-200' };
    }
    const due = new Date(task.due_date);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d Overdue`, color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
    }
    if (diffDays === 0) {
      return { text: 'Due Today', color: 'bg-amber-50 text-amber-700 border-amber-200 font-bold' };
    }
    if (diffDays === 1) {
      return { text: 'Due Tomorrow', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { text: `${diffDays} days left`, color: 'bg-blue-50 text-blue-700 border-blue-200 font-medium' };
  };

  const slaBadge = getSlaBadge();

  const isWorkAlone = task.handling_method === 'work_alone';
  const isCompleted = task.status === 'completed';
  const isReadyForFinalSignOff = !isWorkAlone && Boolean(task.permissions.can_final_submit) && !isCompleted;
  const isUnderReview = !isCompleted && !isReadyForFinalSignOff && (task.status === 'review' || task.branches?.some((b) => b.status === 'review'));

  const getLifecycleStageState = (stageKey: string) => {
    if (stageKey === 'created') return 'completed';

    if (stageKey === 'in_progress') {
      if (isCompleted || isReadyForFinalSignOff || isUnderReview) return 'completed';
      if (task.status === 'on_hold') return 'paused';
      if (task.status === 'in_progress' || task.status === 'post_comment' || task.status === 'pending') return 'current';
      return 'upcoming';
    }

    if (stageKey === 'review') {
      if (isCompleted || isReadyForFinalSignOff) return 'completed';
      if (isUnderReview) return 'current';
      return 'upcoming';
    }

    if (stageKey === 'approval') {
      if (isCompleted) return 'completed';
      if (isReadyForFinalSignOff) return 'current';
      return 'upcoming';
    }

    if (stageKey === 'completed') {
      if (isCompleted) return 'completed';
      return 'upcoming';
    }

    return 'upcoming';
  };

  // For Work Alone mode, there is no intermediate Evaluation/Under Review or Sign-off from a separate party
  const lifecycleStages = isWorkAlone
    ? [
        { key: 'created', label: '1. Created', desc: 'Task Started' },
        { key: 'in_progress', label: '2. Working', desc: 'Doing the Work' },
        { key: 'completed', label: '3. Completed', desc: 'Approved & Closed' },
      ]
    : [
        { key: 'created', label: '1. Created', desc: 'Task Started' },
        { key: 'in_progress', label: '2. Working', desc: 'Doing the Work' },
        { key: 'review', label: '3. In Review', desc: 'Reviewing Work' },
        { key: 'approval', label: '4. Final Sign-off', desc: 'Creator Check' },
        { key: 'completed', label: '5. Completed', desc: 'Approved & Closed' },
      ];

  return (
    <div className="space-y-6">
      {/* Top Header Card matching Mockup Screen 7 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/tasks')}>Tasks</span>
              <span>›</span>
              <span className="text-slate-600 font-semibold">{task.task_code}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                <span className="text-blue-600 mr-2">{task.task_code}</span>
                {task.title}
              </span>
              <StatusBadge
                status={
                  task.status === 'completed'
                    ? 'completed'
                    : isReadyForFinalSignOff
                    ? 'approval'
                    : isUnderReview
                    ? 'review'
                    : task.status
                }
                customLabel={
                  task.status === 'completed'
                    ? 'Completed'
                    : isReadyForFinalSignOff
                    ? 'Final Sign-off'
                    : isUnderReview
                    ? 'Under Review'
                    : undefined
                }
              />
              <PriorityBadge priority={task.priority} />
              <span className={`px-2.5 py-0.5 rounded-full text-xs border flex items-center gap-1.5 ${slaBadge.color}`}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{slaBadge.text}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Assign (1 or More) */}
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <button
                onClick={() => openAssignModal('assign')}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Assign one or more employees to this task"
              >
                <UserPlus className="w-3.5 h-3.5 text-sky-600" />
                <span>+ Assign (1 or More)</span>
              </button>
            )}

            {/* Collaborate (1 or More) */}
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <button
                onClick={() => openAssignModal('collaborate')}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Invite one or more team members to collaborate"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>+ Collaborate (1 or More)</span>
              </button>
            )}

            {/* Submit Work button - only for delegated/collaborative work where reviewer needs to evaluate */}
            {task.permissions.can_submit && !isWorkAlone && (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Review</span>
              </button>
            )}

            {/* Request Missing Details (Assignee -> Assigner) */}
            {task.permissions.can_request_details && (
              <button
                onClick={() => {
                  setRequestDetailsQuestion('');
                  setRequestDetailsFiles([]);
                  setIsRequestDetailsModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Ask assigner for missing details, instructions, or credentials"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Request Missing Details</span>
              </button>
            )}

            {/* Provide Missing Details (Assigner -> Assignee) */}
            {task.permissions.can_provide_details && (
              <button
                onClick={() => {
                  setProvideDetailsResponse('');
                  setProvideDetailsFiles([]);
                  setIsProvideDetailsModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                title="Answer assignee question and resume work"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Provide Missing Details</span>
              </button>
            )}

            {/* Review Action button (if task is in review and user can review) */}
            {task.permissions.can_review && latestPendingSubmission && (
              <button
                onClick={() => {
                  setSelectedSubmission(latestPendingSubmission);
                  setIsReviewModalOpen(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Review Submission</span>
              </button>
            )}

            {/* Final Submit button (Creator Final Approval & Complete) */}
            {task.permissions.can_final_submit && (
              <button
                onClick={() => {
                  setFinalCompleteDesc(
                    isWorkAlone
                      ? 'Work completed and all deliverables verified.'
                      : 'Final deliverables verified and approved for project completion.'
                  );
                  setFinalCompleteFiles([]);
                  setIsFinalCompleteModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Final Approval & Complete</span>
              </button>
            )}

            {/* Put on Hold / Resume */}
            {task.permissions.can_hold && (
              <button
                onClick={handleOpenHoldModal}
                className="px-3.5 py-2 border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Place task temporarily on hold with an explanation note"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold</span>
              </button>
            )}

            {task.permissions.can_resume && (
              <button
                onClick={handleResume}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}

            {/* Cancel Task */}
            {task.permissions.can_cancel && (
              <button
                onClick={handleOpenCancelModal}
                className="px-3.5 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Cancel this task with a mandatory reason note"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Task</span>
              </button>
            )}

            {/* Delete Task Record (Admin / Authorized Sub-Admin) */}
            {task.permissions?.can_delete && (
              <button
                onClick={() => { setDeleteError(''); setIsDeleteModalOpen(true); }}
                className="px-3.5 py-2 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Permanently delete this task record"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Cancelled Task Banner */}
        {task.status === 'cancelled' && (
          <div className="mt-4 p-4 bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 border border-rose-200/90 rounded-2xl flex flex-col gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-rose-950 text-sm">Task Cancelled</span>
                  {task.cancelled_at && (
                    <span className="text-[10px] text-rose-600 bg-rose-100/70 border border-rose-200 px-2.5 py-0.5 rounded-full font-semibold">
                      Cancelled on {new Date(task.cancelled_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-rose-900 mt-1 font-medium">
                  Cancelled by <span className="font-bold">{task.cancelled_by?.name || task.creator?.name || 'Authorized User'}</span>
                </p>
                {task.cancellation_reason && (
                  <div className="mt-2.5 p-3 bg-white/80 border border-rose-200/90 rounded-xl text-rose-900">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block mb-0.5">Cancellation Reason Note:</span>
                    <p className="text-xs italic whitespace-pre-wrap font-medium leading-relaxed">
                      "{task.cancellation_reason}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contextual Workflow Action Banners */}
        {/* 1. Missing Details Requested Banner */}
        {task.latest_clarification && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment')) && (
          <div className="mt-4 p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">
                  Missing Details Requested by {task.latest_clarification.requested_by?.name || 'Assignee'}
                </p>
                <p className="text-amber-800 mt-0.5 whitespace-pre-wrap">
                  "{task.latest_clarification.comment.replace(/^❓\s*Missing Details Requested by [^:]*:\s*/, '')}"
                </p>
                <p className="text-[10px] text-amber-600 mt-1">
                  Requested on {new Date(task.latest_clarification.requested_at).toLocaleString()} • Task is pending assigner input.
                </p>
              </div>
            </div>
            {task.permissions.can_provide_details && (
              <button
                type="button"
                onClick={() => {
                  setProvideDetailsResponse('');
                  setProvideDetailsFiles([]);
                  setIsProvideDetailsModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Provide Missing Details</span>
              </button>
            )}
          </div>
        )}

        {/* 2. Returned for Correction Banner */}
        {task.latest_return && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment')) && !task.latest_clarification && (
          <div className="mt-4 p-4 bg-red-50/90 border border-red-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">
                  Changes Requested by {task.latest_return.reviewer?.name || 'Reviewer'}
                </p>
                <p className="text-red-800 mt-0.5 whitespace-pre-wrap">
                  "{task.latest_return.comments}"
                </p>
                <p className="text-[10px] text-red-600 mt-1">
                  Reviewed on {new Date(task.latest_return.reviewed_at).toLocaleString()} • Please review the feedback, update your work, and resubmit.
                </p>
              </div>
            </div>
            {task.permissions.can_submit && (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Resubmit Work for Review</span>
              </button>
            )}
          </div>
        )}

        {/* 3. Creator Final Approval Ready Banner */}
        {task.permissions.can_final_submit && !isWorkAlone && (
          <div className="mt-4 p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-950">All Deliverables Approved & Ready for Final Sign-off</p>
                <p className="text-emerald-800 mt-0.5">
                  All assigned parts of this task have been completed and approved. You can now complete the project with final remarks and deliverable files.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFinalCompleteDesc('Final deliverables verified and approved for project completion.');
                setFinalCompleteFiles([]);
                setIsFinalCompleteModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Final Approval & Complete</span>
            </button>
          </div>
        )}

        {/* Real-time Turn & Responsibility Tracker */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_#2563eb] shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800">Current Responsibility:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                {isCompleted
                  ? 'Completed & Archived'
                  : isReadyForFinalSignOff
                  ? `Task Creator: ${task.creator?.name || 'Creator'} (Final Sign-off)`
                  : isUnderReview
                  ? `Reviewer (Checking deliverables from ${latestPendingSubmission?.submitted_by?.name || 'Assignee'})`
                  : task.latest_clarification && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment'))
                  ? `Task Assigner: ${task.creator?.name || 'Assigner'} (Question to Answer)`
                  : task.latest_return && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment'))
                  ? `Submitter (Updating changes)`
                  : `Assignee: ${task.current_owner?.name || 'In Progress'}`}
              </span>
            </div>
          </div>

          {(task.permissions.can_submit || task.permissions.can_review || task.permissions.can_final_submit || task.permissions.can_provide_details) && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs self-start sm:self-auto">
              <Zap className="w-3.5 h-3.5 text-cyan-200 animate-bounce" />
              <span>Ball is in YOUR court</span>
            </div>
          )}
        </div>

        {/* Interactive Lifecycle Workflow Stepper */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="relative">
            {/* Step progress line behind icons */}
            <div className="hidden sm:block absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-slate-100 -z-0" />

            <div className={`grid grid-cols-1 ${isWorkAlone ? 'sm:grid-cols-3' : 'sm:grid-cols-5'} gap-3 relative z-10`}>
              {lifecycleStages.map((stg) => {
                const state = getLifecycleStageState(stg.key);
                const isCompleted = state === 'completed';
                const isCurrent = state === 'current';
                const isPaused = state === 'paused';

                return (
                  <div
                    key={stg.key}
                    className={`flex sm:flex-col items-center gap-3 p-2.5 sm:p-2 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-blue-50/80 border border-blue-200 shadow-2xs'
                        : isPaused
                        ? 'bg-amber-50/80 border border-amber-200'
                        : isCompleted
                        ? 'bg-white'
                        : 'bg-white opacity-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs'
                          : isPaused
                          ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : isPaused ? (
                        <PauseCircle className="w-4 h-4" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div className="text-left sm:text-center min-w-0">
                      <p className={`text-[11px] font-bold truncate ${isCurrent ? 'text-blue-900' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                        {stg.label}
                      </p>
                      <p className={`text-[10px] truncate ${isCurrent ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                        {stg.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper Status Alert Banners */}
          {task.status === 'on_hold' && task.hold_record && (
            <div className="mt-4 p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Task is currently On Hold:</strong> {task.hold_record.reason} (Held by {task.hold_record.held_by})
                </span>
              </div>
              {task.permissions.can_resume && (
                <button
                  onClick={handleResume}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition cursor-pointer text-xs"
                >
                  Resume Now
                </button>
              )}
            </div>
          )}

          {task.status === 'post_comment' && (
            <div className="mt-4 p-3 bg-rose-50/90 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Action Required: Returned For Revision.</strong> The reviewer requested corrections on deliverables. Check notes below.
                </span>
              </div>
              {task.permissions.can_submit && (
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition cursor-pointer text-xs"
                >
                  Submit Fixes
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs matching Mockup Screen 7 & 8 */}
        <div className="flex gap-4 border-b border-slate-100 mt-6 -mb-6 px-1 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'workflow'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Workflow & History</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Assignments & Collaborations ({((task.branches?.length || 0) + (task.collaborators?.length || 0))})</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'comments'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments ({task.comments?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'attachments'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attachments ({task.attachments?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Log</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SCREEN 7: OVERVIEW TAB CONTENT                           */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Basic Information */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Task Overview & Deliverables</span>
              </h2>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                ID: {task.task_code}
              </span>
            </div>

            <div className="space-y-5 text-xs">
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Task Title</span>
                <p className="text-slate-900 font-bold text-base leading-snug">{task.title}</p>
              </div>

              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
                <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </div>
              </div>

              {task.expected_result && (
                <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-900 font-bold text-[11px] uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-sky-600" />
                    <span>Expected Result & Outcome</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-xs pl-5">
                    {task.expected_result}
                  </p>
                </div>
              )}

              {task.acceptance_criteria && (
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                      <span>Acceptance Criteria Checklist</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Required quality gates</span>
                  </div>

                  <div className="space-y-2">
                    {task.acceptance_criteria
                      .split(/\r?\n/)
                      .filter((line: string) => line.trim().length > 0)
                      .map((criterion: string, cIdx: number) => (
                        <div
                          key={cIdx}
                          className="flex items-start gap-2.5 text-xs text-slate-800 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs hover:border-blue-200 transition"
                        >
                          <span className="w-4 h-4 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="leading-relaxed font-medium">
                            {criterion.replace(/^[-*•\d\.\s]+/, '')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100/80">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Department</span>
                  <p className="font-semibold text-slate-800 text-xs">{task.department?.name || 'Unassigned'}</p>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100/80">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Handling Method</span>
                  <p className="font-bold text-blue-600 uppercase text-xs tracking-wide">
                    {task.handling_method.replace('_', ' ')}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100/80">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Created By</span>
                  <p className="font-semibold text-slate-800 text-xs">{task.creator?.name || 'Creator'}</p>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100/80">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Start Date</span>
                  <p className="font-semibold text-slate-800 text-xs">
                    {task.start_date ? new Date(task.start_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100/80">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Due Date</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-slate-800 text-xs">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                    </p>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] border ${slaBadge.color}`}>
                      {slaBadge.text}
                    </span>
                  </div>
                </div>

                {task.completed_at && (
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block mb-1">Completed At</span>
                    <p className="font-bold text-emerald-800 text-xs">
                      {new Date(task.completed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Task Progress & Current Owner Card */}
          <div className="space-y-6">
            {/* Task Progress Card matching Mockup */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">Task Progress</h3>
                <span className="text-xs font-bold text-blue-600">{task.progress}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              {/* Progress Milestones Checklist */}
              <div className="space-y-3 text-xs">
                {isWorkAlone ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                      <span className="font-semibold text-slate-800">Direct Execution Mode (Work Alone)</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          task.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {task.status === 'completed' ? (
                          <Check className="w-2.5 h-2.5" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span
                        className={`font-medium ${
                          task.status === 'completed' ? 'text-slate-800 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {task.status === 'completed'
                          ? 'Verified & Completed by Creator'
                          : 'In Progress (Creator Working)'}
                      </span>
                      <span className="ml-auto">
                        <StatusBadge status={task.status} size="sm" />
                      </span>
                    </div>
                  </div>
                ) : task.branches && task.branches.length > 0 ? (
                  task.branches.map((b) => {
                    const ownerName = b.owner?.name || b.title;
                    const reviewerName = b.assigned_by?.name || task.creator?.name || 'Assigner';

                    let statusLabel: string | undefined = undefined;
                    if (b.status === 'review') {
                      statusLabel = `Under Review: ${reviewerName}`;
                    } else if (b.status === 'post_comment') {
                      statusLabel = 'Needs Correction';
                    } else if (b.status === 'completed') {
                      statusLabel = 'Completed';
                    } else if (b.status === 'in_progress') {
                      statusLabel = 'In Progress';
                    }

                    return (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                b.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : b.status === 'review'
                                  ? 'bg-amber-100 text-amber-600 animate-pulse'
                                  : b.status === 'post_comment'
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              {b.status === 'completed' ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 text-xs block truncate">
                                {ownerName}
                              </span>
                              {b.assigned_by && b.owner && b.assigned_by.id !== b.owner.id && (
                                <span className="text-[10px] text-slate-400 block truncate">
                                  Assigned by {b.assigned_by.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0">
                            <StatusBadge status={b.status} size="sm" customLabel={statusLabel} />
                          </span>
                        </div>
                        {b.status === 'review' && (
                          <div className="mt-1 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Under Review by:</span>
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {reviewerName}
                            </span>
                          </div>
                        )}
                        {b.status === 'post_comment' && (
                          <div className="mt-1 pt-1.5 border-t border-rose-100 flex items-center justify-between text-[11px]">
                            <span className="text-rose-600 font-medium">Returned for Correction</span>
                            <span className="text-[10px] text-slate-500">Awaiting revision</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-800">Work in Progress</span>
                    </div>
                    {task.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-emerald-600">Final Verification Complete</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Current Owner Card matching Mockup */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Current Owner</h3>
              {task.current_owner ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                      {task.current_owner.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{task.current_owner.name}</h4>
                      <p className="text-[11px] text-slate-500 capitalize">{task.current_owner.role?.replace('_', ' ') || 'Assignee'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{task.current_owner.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('comments')}
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-between border border-slate-200/80 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Leave Message / Note</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No owner assigned.</p>
              )}
            </div>

            {/* On Hold alert if currently on hold */}
            {task.status === 'on_hold' && task.hold_record && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Task is On Hold</span>
                </div>
                <p className="text-rose-600">{task.hold_record.reason}</p>
                <p className="text-[10px] text-rose-400 mt-1">
                  Put on hold by {task.hold_record.held_by} on {new Date(task.hold_record.held_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 8: WORKFLOW & HISTORY TIMELINE                     */}
      {/* ======================================================== */}
      {activeTab === 'workflow' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-900">Task Journey / Chronological Workflow</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visual history of assignments, submissions, review decisions, returns, and stage handovers.
            </p>
          </div>

          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-100 space-y-8 my-4 ml-3">
            {task.status_history && task.status_history.length > 0 ? (
              task.status_history.map((item, idx) => {
                const isLast = idx === task.status_history.length - 1;
                let dotColor = 'bg-blue-600';
                if (item.to_status === 'completed') dotColor = 'bg-emerald-500';
                else if (item.to_status === 'review') dotColor = 'bg-amber-500';
                else if (item.to_status === 'post_comment') dotColor = 'bg-rose-500';
                else if (item.to_status === 'on_hold') dotColor = 'bg-orange-500';

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[31px] sm:-left-[39px] top-0 w-4 h-4 rounded-full border-2 border-white ${dotColor} shadow-xs ring-4 ring-slate-50`}
                    />

                    <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {item.reason || `Transitioned to ${item.to_status.replace('_', ' ')}`}
                          </span>
                          {isLast && task.status !== 'completed' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                              Current Stage
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400">
                          {new Date(item.changed_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Action by:</span>
                        <span className="font-semibold text-slate-700">{item.changed_by?.name || 'System'}</span>
                        <span className="text-[10px] text-slate-400 capitalize">({item.changed_by?.role?.replace('_', ' ') || 'User'})</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic">No workflow history records yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ASSIGNMENTS & COLLABORATIONS TAB                         */}
      {/* ======================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Section 1: Assigned Team Members & Branches (1 to Many) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-sky-600" />
                  <span>Assigned Team Members & Work Branches ({task.branches?.length || 0})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accountable owners managing parallel branches or assigned deliverables.
                </p>
              </div>
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <button
                  onClick={() => openAssignModal('assign')}
                  className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign More (1 or Many)</span>
                </button>
              )}
            </div>

            {task.branches && task.branches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {task.branches.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {b.owner?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{b.owner?.name || 'Unassigned'}</h4>
                          <p className="text-[10px] text-slate-400 capitalize">
                            {b.owner?.role?.replace('_', ' ') || 'Assignee'} • {b.owner?.email || ''}
                          </p>
                          {b.assigned_by && (
                            <p className="text-[10px] text-sky-700 font-medium">
                              Delegated by: {b.assigned_by.name} ({b.assigned_by.role?.replace('_', ' ')})
                            </p>
                          )}
                        </div>
                      </div>
                      <StatusBadge
                        status={b.status}
                        size="sm"
                        customLabel={
                          b.status === 'review'
                            ? `Under Review: ${b.assigned_by?.name || task.creator?.name || 'Assigner'}`
                            : b.status === 'post_comment'
                            ? 'Needs Correction'
                            : undefined
                        }
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 text-xs">
                      <p className="font-semibold text-slate-800">{b.title}</p>
                      {b.description && (
                        <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{b.description}</p>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span>Due: {b.due_date ? new Date(b.due_date).toLocaleDateString() : 'Task deadline'}</span>
                        {b.completed_at && (
                          <span className="text-emerald-600 font-semibold">Done: {new Date(b.completed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-400 italic">No assigned members or branches yet.</p>
              </div>
            )}
          </div>

          {/* Section 2: Collaborators (1 to Many) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Task Collaborators ({task.collaborators?.length || 0})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Team members collaborating, contributing, or reviewing alongside the primary owners.
                </p>
              </div>
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <button
                  onClick={() => openAssignModal('collaborate')}
                  className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Invite Collaborators (1 or Many)</span>
                </button>
              )}
            </div>

            {task.collaborators && task.collaborators.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {task.collaborators.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center gap-3 text-xs"
                  >
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {c.name?.charAt(0) || 'C'}
                    </div>
                    <div className="truncate flex-1">
                      <p className="font-bold text-slate-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 capitalize mt-1">
                        {c.role?.replace('_', ' ') || 'Collaborator'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-400 italic">No external collaborators invited yet.</p>
                {task.status !== 'completed' && (
                  <button
                    onClick={() => openAssignModal('collaborate')}
                    className="mt-2 text-xs font-semibold text-purple-600 hover:underline cursor-pointer"
                  >
                    + Invite one or more collaborators
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COMMENTS TAB                                             */}
      {/* ======================================================== */}
      {activeTab === 'comments' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-sm font-bold text-slate-900">Task Discussion & Review Notes</h2>

          {/* Assigner / Delegator Direct Communication Banner */}
          {(() => {
            const myBranch = task.branches?.find((b) => b.owner?.id === currentUser?.id);
            const assigner = myBranch?.assigned_by || (task.creator?.id !== currentUser?.id ? task.creator : null);
            if (!assigner || assigner.id === currentUser?.id) return null;

            return (
              <div className="p-3 bg-sky-50/80 border border-sky-100 rounded-xl flex items-center justify-between text-xs text-sky-900">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    Need clarification or something missing? Post a comment to discuss directly with your assigner (<strong>{assigner.name}</strong>).
                  </span>
                </div>
              </div>
            );
          })()}

          {/* New Comment Box */}
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              rows={3}
              placeholder="Write a comment or update for this task..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={postingComment || !commentText.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{postingComment ? 'Posting...' : 'Post Comment'}</span>
              </button>
            </div>
          </form>

          {/* Comment Stream */}
          <div className="divide-y divide-slate-100 pt-4">
            {task.comments && task.comments.length > 0 ? (
              task.comments.map((c) => (
                <div key={c.id} className="py-4 flex gap-3 text-xs">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                    {c.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{c.user?.name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{c.comment}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No comments posted yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ATTACHMENTS TAB                                          */}
      {/* ======================================================== */}
      {activeTab === 'attachments' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Task Attachments & Deliverables</h2>
            <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
              <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploadingFile} />
            </label>
          </div>

          <div className="divide-y divide-slate-100">
            {task.attachments && task.attachments.length > 0 ? (
              task.attachments.map((att) => (
                <div key={att.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 truncate">
                    <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 truncate">{att.file_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {Math.round(att.file_size / 1024)} KB • Uploaded by {att.uploaded_by?.name || 'User'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadAttachment(att.id, att.file_name)}
                    disabled={downloadingId === att.id}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === att.id ? 'Downloading...' : 'Download'}</span>
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No attachments uploaded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* AUDIT LOG TAB                                            */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 mb-2">Immutable Audit Trail</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Status Change</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {task.status_history?.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(h.changed_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {h.changed_by?.name || 'System'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-400 mr-1.5">{h.from_status || 'Initial'}</span>
                      <span className="text-blue-600 font-bold">→ {h.to_status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{h.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBMISSION MODAL (Intermediate Submit for Review) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Submit Work for Review</h3>
                  <p className="text-xs text-slate-500">Provide a summary of deliverables, work completed, and attach relevant files.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setSubmissionFiles([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Work Description / Deliverables Summary <span className="text-rose-500">*</span></span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your work, completed checklist items, or links to assets..."
                  value={submissionDesc}
                  onChange={(e) => setSubmissionDesc(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Attach Deliverables / Files (Optional)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">PDF, Images, Zip, Docs (up to 20MB)</span>
                </label>

                <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1 bg-slate-50/50 hover:bg-blue-50/20 transition cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Click to browse or drop files</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setSubmissionFiles((prev) => [...prev, ...newFiles]);
                      }
                    }}
                  />
                </label>

                {submissionFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {submissionFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-blue-50/60 border border-blue-100 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-800 truncate text-[11px]">{file.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubmissionFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitModalOpen(false);
                    setSubmissionFiles([]);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWork}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingWork ? 'Submitting...' : 'Submit for Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FINAL TASK COMPLETION MODAL */}
      {isFinalCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isWorkAlone ? 'Final Task Completion & Deliverables' : 'Final Approval & Task Completion'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isWorkAlone
                      ? 'Submit your final deliverables, work summary, and attachments to officially complete this task.'
                      : 'Provide closing remarks, verify deliverables, and sign off to mark this task complete.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFinalCompleteModalOpen(false);
                  setFinalCompleteFiles([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Task Info Pill */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-blue-600">{task.task_code}</span>
                <span className="text-slate-700 font-semibold truncate">{task.title}</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full text-[10px] border border-emerald-200 shrink-0">
                {isWorkAlone ? 'Work Alone Mode' : 'Final Sign-off'}
              </span>
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Deliverables & Completion Description <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Summary of completed work</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your final deliverables, outcome, checklist verification, or closing remarks..."
                  value={finalCompleteDesc}
                  onChange={(e) => setFinalCompleteDesc(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Attach Deliverables / Files (Optional)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">PDF, Images, Zip, Docs (up to 20MB)</span>
                </label>

                <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1 bg-slate-50/50 hover:bg-emerald-50/20 transition cursor-pointer">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Click to browse files or drag & drop here</span>
                  <span className="text-[10px] text-slate-400">Attach receipts, screenshots, deliverables, or final reports</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setFinalCompleteFiles((prev) => [...prev, ...newFiles]);
                      }
                    }}
                  />
                </label>

                {finalCompleteFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {finalCompleteFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800 truncate text-[11px]">{file.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFinalCompleteFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal footer buttons */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsFinalCompleteModalOpen(false);
                    setFinalCompleteFiles([]);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFinal}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{submittingFinal ? 'Completing Task...' : 'Submit & Complete Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST MISSING DETAILS MODAL (Assignee -> Assigner) */}
      {isRequestDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Request Missing Details</h3>
                  <p className="text-[11px] text-slate-500">
                    Ask your assigner for required credentials, assets, or instructions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRequestDetailsModalOpen(false);
                  setRequestDetailsFiles([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800">
              <p className="font-semibold">Workflow Notice:</p>
              <p className="text-[11px] mt-0.5 text-amber-700">
                Sending this request moves the task directly into your assigner's Pending Tasks queue. Once your assigner provides the details, the task will return to your Pending queue so you can resume work.
              </p>
            </div>

            <form onSubmit={handleRequestDetailsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Questions / Missing Details <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Be specific about what you need</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe what information, API keys, credentials, design assets, or clarifications you need..."
                  value={requestDetailsQuestion}
                  onChange={(e) => setRequestDetailsQuestion(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Attach Reference Screenshots / Error Logs (Optional)</span>
                  </span>
                </label>

                <label className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1 bg-slate-50/50 hover:bg-amber-50/20 transition cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Click to attach error logs or references</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setRequestDetailsFiles((prev) => [...prev, ...newFiles]);
                      }
                    }}
                  />
                </label>

                {requestDetailsFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {requestDetailsFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-amber-50/60 border border-amber-100 rounded-lg text-xs"
                      >
                        <span className="font-medium text-slate-800 truncate text-[11px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setRequestDetailsFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRequestDetailsModalOpen(false);
                    setRequestDetailsFiles([]);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequestDetails}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingRequestDetails ? 'Sending Request...' : 'Send Request to Assigner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROVIDE MISSING DETAILS MODAL (Assigner -> Assignee) */}
      {isProvideDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Provide Missing Details</h3>
                  <p className="text-[11px] text-slate-500">
                    Respond with required information and return task to assignee.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProvideDetailsModalOpen(false);
                  setProvideDetailsFiles([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {task.latest_clarification && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs">
                <p className="font-bold text-amber-950 mb-1">
                  Question from {task.latest_clarification.requested_by?.name || 'Assignee'}:
                </p>
                <p className="text-amber-800 whitespace-pre-wrap">
                  "{task.latest_clarification.comment.replace(/^❓\s*Missing Details Requested by [^:]*:\s*/, '')}"
                </p>
              </div>
            )}

            <form onSubmit={handleProvideDetailsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Your Clarification / Details <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Answers and instructions</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide the missing instructions, credentials, explanations, or links..."
                  value={provideDetailsResponse}
                  onChange={(e) => setProvideDetailsResponse(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Attach Assets / Documents (Optional)</span>
                  </span>
                </label>

                <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1 bg-slate-50/50 hover:bg-emerald-50/20 transition cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Click to attach specifications or credentials</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setProvideDetailsFiles((prev) => [...prev, ...newFiles]);
                      }
                    }}
                  />
                </label>

                {provideDetailsFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {provideDetailsFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs"
                      >
                        <span className="font-medium text-slate-800 truncate text-[11px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setProvideDetailsFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsProvideDetailsModalOpen(false);
                    setProvideDetailsFiles([]);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProvideDetails}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingProvideDetails ? 'Submitting Details...' : 'Submit Details & Resume Work'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW ACTION MODAL (Screen 10) */}
      {isReviewModalOpen && selectedSubmission && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          task={task}
          submission={selectedSubmission}
          onReviewSubmitted={() => loadTask(task.id)}
        />
      )}

      {/* ASSIGN OR COLLABORATE MODAL (1 TO MANY) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    assignModalType === 'assign'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {assignModalType === 'assign' ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {assignModalType === 'assign'
                      ? 'Assign Team Members (1 to Many)'
                      : 'Invite Collaborators (1 to Many)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {assignModalType === 'assign'
                      ? 'Select one or more employees to assign to this task.'
                      : 'Select one or more employees to collaborate together.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Search Filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name, department, email, or role..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Quick Actions & Counter */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  {selectedModalUserIds.length} employee{selectedModalUserIds.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = allUsersList.filter(
                        (u) =>
                          u.id !== currentUser?.id &&
                          (u.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            u.email?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            u.department?.name?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                            u.role?.toLowerCase().includes(modalSearch.toLowerCase()))
                      );
                      setSelectedModalUserIds(filtered.map((u) => u.id));
                    }}
                    className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedModalUserIds([])}
                    className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* User Selection List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto border border-slate-200/80 rounded-xl p-2 divide-y divide-slate-100">
                {allUsersList
                  .filter(
                    (u) =>
                      u.id !== currentUser?.id &&
                      (u.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                        u.department?.name?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                        u.role?.toLowerCase().includes(modalSearch.toLowerCase()))
                  )
                  .map((u) => {
                    const isSelected = selectedModalUserIds.includes(u.id);
                    const alreadyBranchOwner = task.branches?.some((b) => b.owner?.id === u.id);
                    const alreadyCollaborator = task.collaborators?.some((c) => c.id === u.id);

                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleModalUser(u.id)}
                        className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/80 border border-blue-200'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.email} {u.department ? `• ${u.department.name}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {alreadyBranchOwner && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 font-medium">
                              Already Assigned
                            </span>
                          )}
                          {alreadyCollaborator && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-50 text-purple-600 font-medium">
                              Collaborating
                            </span>
                          )}
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingModal || selectedModalUserIds.length === 0}
                onClick={handleAssignModalSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                  assignModalType === 'assign'
                    ? 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300'
                    : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'
                }`}
              >
                {submittingModal
                  ? 'Saving...'
                  : `Confirm ${assignModalType === 'assign' ? 'Assignment' : 'Invitation'} (${selectedModalUserIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Task Modal with Mandatory Reason Note */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cancel Task</h3>
                  <p className="text-xs text-slate-500">Provide a mandatory reason note for cancelling this task</p>
                </div>
              </div>
              <button
                onClick={() => { setIsCancelModalOpen(false); setCancelReason(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why this task is being cancelled (min. 3 characters)..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This cancellation note will be permanently logged and visible to creators, assignees, and in the Cancelled Tasks archive.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setIsCancelModalOpen(false); setCancelReason(''); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Nevermind
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancellingTask || cancelReason.trim().length < 3}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {cancellingTask ? 'Cancelling Task...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Task Record</h3>
                  <p className="text-xs text-slate-500">Permanent administrative action</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{task.title}"</span>? This will permanently delete the task record and all associated logs.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingTask}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {deletingTask ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Place On Hold Modal */}
      {isHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Place Task on Hold</h3>
                  <p className="text-xs text-slate-500">Temporarily pause active work on this task</p>
                </div>
              </div>
              <button
                onClick={() => { setIsHoldModalOpen(false); setHoldReason(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {holdError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{holdError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Pause / Hold <span className="text-amber-600">*</span>
              </label>
              <textarea
                rows={3}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Explain why this task is being paused (e.g., waiting for client feedback, budget approval)..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setIsHoldModalOpen(false); setHoldReason(''); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHold}
                disabled={holdingTask || !holdReason.trim()}
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {holdingTask ? 'Pausing...' : 'Confirm Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 text-xs font-semibold select-none bg-white/95 text-slate-800 border-slate-200 max-w-md">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />}
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

export default TaskDetailPage;
