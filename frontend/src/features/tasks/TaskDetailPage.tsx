import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import type { Task, TaskSubmission, TaskBranch } from '../../api/tasks';
import { usersApi } from '../../api/users';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { ReviewModal } from '../../components/ReviewModal';
import {
  FileText,
  Users,
  MessageSquare,
  Paperclip,
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
  ArrowLeft,
  Download,
  HelpCircle,
  Sparkles,
  Ban,
  Trash2,
  RotateCcw,
  ArrowRightLeft,
  UserMinus,
  RefreshCw,
  MoreHorizontal,
  ChevronDown,
  Zap,
  Activity,
  FolderGit2,
  Rocket,
  Copy,
  Info,
} from 'lucide-react';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdminOrSubAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sub_admin';

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Reopen Task Modal state
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopeningTask, setReopeningTask] = useState(false);
  const [reopenError, setReopenError] = useState('');

  // Hold Task Modal state
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [holdingTask, setHoldingTask] = useState(false);
  const [holdError, setHoldError] = useState('');

  // Reassign Modal State (Transfer to another person OR Cancel/Remove assignment)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignBranch, setReassignBranch] = useState<any | null>(null);
  const [reassignOption, setReassignOption] = useState<'transfer' | 'cancel'>('transfer');
  const [reassignNewOwnerId, setReassignNewOwnerId] = useState<number | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [reassignDeletePermanently, setReassignDeletePermanently] = useState(false);
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [reassignSearch, setReassignSearch] = useState('');

  // Header Actions Dropdown state
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = React.useRef<HTMLDivElement>(null);

  // Timeline Filter State ('all' | 'reviews' | 'handovers' | 'holds')
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'reviews' | 'handovers' | 'holds'>('all');

  // Interactive Checklist State (Persisted in localStorage per task)
  const [checkedCheckpoints, setCheckedCheckpoints] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`task_checkpoints_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCheckpoint = (key: string) => {
    setCheckedCheckpoints((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(`task_checkpoints_${id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    if (isActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsMenuOpen]);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const openReassignModal = async (branch: any) => {
    setReassignBranch(branch);
    setReassignOption('transfer');
    setReassignNewOwnerId(null);
    setReassignReason('');
    setReassignDeletePermanently(false);
    setReassignError(null);
    setReassignSearch('');
    setIsReassignModalOpen(true);

    if (allUsersList.length === 0) {
      try {
        const res = await usersApi.list({ per_page: 100 });
        setAllUsersList(res.data || []);
      } catch (err) {
        console.error('Failed to load users for reassign', err);
      }
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignBranch) return;

    if (reassignOption === 'transfer') {
      if (!reassignNewOwnerId) {
        setReassignError('Please select a replacement employee to take over this assignment.');
        return;
      }
      setReassignSubmitting(true);
      setReassignError(null);
      try {
        await tasksApi.transferBranch(reassignBranch.id, {
          new_owner_id: reassignNewOwnerId,
          reason: reassignReason.trim() || undefined,
        });
        showToast('Assignment successfully transferred to new team member!', 'success');
        setIsReassignModalOpen(false);
        if (id) await loadTask(Number(id));
      } catch (err: any) {
        setReassignError(err.response?.data?.message || 'Failed to transfer assignment.');
      } finally {
        setReassignSubmitting(false);
      }
    } else {
      // Cancel / Remove
      setReassignSubmitting(true);
      setReassignError(null);
      try {
        await tasksApi.cancelBranchAssignment(reassignBranch.id, {
          reason: reassignReason.trim() || undefined,
          delete_permanently: reassignDeletePermanently,
        });
        showToast('Assignment successfully withdrawn/cancelled.', 'success');
        setIsReassignModalOpen(false);
        if (id) await loadTask(Number(id));
      } catch (err: any) {
        setReassignError(err.response?.data?.message || 'Failed to cancel assignment.');
      } finally {
        setReassignSubmitting(false);
      }
    }
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

  interface ModalWorkData {
    mode: 'new_subtask' | 'reassign';
    title: string;
    description: string;
    expected_result: string;
    acceptance_criteria: string;
    due_date: string;
    share_previous: boolean;
    can_assign_further: boolean;
    files: File[];
  }

  const [assignModalStep, setAssignModalStep] = useState<1 | 2>(1);
  const [modalDelegationOption, setModalDelegationOption] = useState<'subtasks' | 'direct'>('subtasks');
  const [modalAssigneeWork, setModalAssigneeWork] = useState<Record<number, ModalWorkData>>({});
  const [showParentContext, setShowParentContext] = useState(false);

  const initModalWork = (u: any): ModalWorkData => ({
    mode: 'new_subtask',
    title: task ? `${task.title} - ${u.name}` : `${u.name}'s Scope`,
    description: '',
    expected_result: '',
    acceptance_criteria: '',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    share_previous: false,
    can_assign_further: true,
    files: [],
  });

  const updateModalWork = (userId: number, updates: Partial<ModalWorkData>) => {
    setModalAssigneeWork((prev) => {
      const cur = prev[userId] || initModalWork(allUsersList.find((u) => u.id === userId) || { name: 'Teammate' });
      return {
        ...prev,
        [userId]: { ...cur, ...updates },
      };
    });
  };

  const handleModalFileChange = (userId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setModalAssigneeWork((prev) => {
        const cur = prev[userId] || initModalWork(allUsersList.find((u) => u.id === userId) || { name: 'Teammate' });
        return {
          ...prev,
          [userId]: { ...cur, files: [...cur.files, ...newFiles] },
        };
      });
    }
  };

  const removeModalFile = (userId: number, fileIdx: number) => {
    setModalAssigneeWork((prev) => {
      const cur = prev[userId];
      if (!cur) return prev;
      return {
        ...prev,
        [userId]: { ...cur, files: cur.files.filter((_, i) => i !== fileIdx) },
      };
    });
  };

  const openAssignModal = async (type: 'assign' | 'collaborate') => {
    if (type === 'assign') {
      const userBranch = task?.branches?.find((b) => b.owner?.id === currentUser?.id);
      if (userBranch && userBranch.level === 4) {
        showToast('Delegation is capped at Level 4 (Executors). Level 4 is the final execution stage and cannot assign further.', 'info');
        return;
      }
    }
    setAssignModalType(type);
    setAssignModalStep(1);
    setModalSearch('');
    setSelectedModalUserIds([]);
    setModalAssigneeWork({});
    setModalDelegationOption('subtasks');
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
    setSelectedModalUserIds((prev) => {
      const exists = prev.includes(userId);
      const next = exists ? prev.filter((id) => id !== userId) : [...prev, userId];
      if (!exists) {
        const u = allUsersList.find((usr) => usr.id === userId);
        setModalAssigneeWork((mPrev) => ({
          ...mPrev,
          [userId]: mPrev[userId] || initModalWork(u || { name: 'Teammate' }),
        }));
      }
      return next;
    });
  };

  const handleAssignModalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!task || selectedModalUserIds.length === 0) return;

    // Transition from Selection (Step 1) to Work & Scope Configuration (Step 2)
    if (assignModalType === 'assign' && assignModalStep === 1) {
      setAssignModalStep(2);
      setModalAssigneeWork((prev) => {
        const next = { ...prev };
        selectedModalUserIds.forEach((uid) => {
          if (!next[uid]) {
            const u = allUsersList.find((usr) => usr.id === uid);
            next[uid] = initModalWork(u || { name: 'Teammate' });
          }
        });
        return next;
      });
      return;
    }

    setSubmittingModal(true);
    setModalError('');
    try {
      if (assignModalType === 'collaborate') {
        await tasksApi.addCollaborators(task.id, selectedModalUserIds);
      } else {
        const formData = new FormData();
        selectedModalUserIds.forEach((uid) => {
          formData.append('user_ids[]', String(uid));
        });

        if (modalDelegationOption === 'direct') {
          formData.append('delegation_mode', 'direct');
        } else {
          // Validate Step 2 inputs for subtasks
          for (const uid of selectedModalUserIds) {
            const work = modalAssigneeWork[uid];
            const u = allUsersList.find((usr) => usr.id === uid);
            if (!work?.title?.trim()) {
              setModalError(`Subtask Title is required for ${u?.name || 'employee'}.`);
              setSubmittingModal(false);
              return;
            }
            if (!work?.description?.trim()) {
              setModalError(`Please provide a note or description for ${u?.name || 'employee'}.`);
              setSubmittingModal(false);
              return;
            }
            if (!work?.due_date) {
              setModalError(`Individual Due Date is mandatory for ${u?.name || 'employee'}.`);
              setSubmittingModal(false);
              return;
            }
            if (task.due_date && work.due_date && new Date(work.due_date) > new Date(task.due_date)) {
              const maxDate = task.due_date.split('T')[0];
              setModalError(`Individual Due Date for ${u?.name || 'employee'} cannot be later than the task due date (${maxDate}).`);
              setSubmittingModal(false);
              return;
            }
          }

          selectedModalUserIds.forEach((uid, idx) => {
            const work = modalAssigneeWork[uid] || initModalWork(allUsersList.find((u) => u.id === uid) || { name: 'Teammate' });
            formData.append(`branches[${idx}][owner_id]`, String(uid));
            formData.append(`branches[${idx}][mode]`, work.mode);
            formData.append(`branches[${idx}][title]`, work.title.trim());
            formData.append(`branches[${idx}][description]`, work.description.trim());
            if (work.expected_result?.trim()) {
              formData.append(`branches[${idx}][expected_result]`, work.expected_result.trim());
            }
            if (work.acceptance_criteria?.trim()) {
              formData.append(`branches[${idx}][acceptance_criteria]`, work.acceptance_criteria.trim());
            }
            if (work.due_date) {
              formData.append(`branches[${idx}][due_date]`, work.due_date);
            }
            formData.append(`branches[${idx}][share_previous_branch_details]`, '0');
            formData.append(`branches[${idx}][share_main_task_details]`, '0');
            formData.append(`branches[${idx}][can_assign_further]`, work.can_assign_further !== false ? '1' : '0');

            if (work.files && work.files.length > 0) {
              work.files.forEach((file) => {
                formData.append(`branches[${idx}][files][]`, file);
              });
            }
          });
        }

        await tasksApi.addAssignees(task.id, formData);
      }

      setIsAssignModalOpen(false);
      setSelectedModalUserIds([]);
      setModalAssigneeWork({});
      setAssignModalStep(1);
      showToast(
        assignModalType === 'assign'
          ? modalDelegationOption === 'direct'
            ? `Successfully delegated task directly to ${selectedModalUserIds.length} employee(s).`
            : `Successfully assigned subtasks to ${selectedModalUserIds.length} employee(s).`
          : `Successfully invited ${selectedModalUserIds.length} collaborator(s).`,
        'success'
      );
      loadTask(task.id);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update task';
      if (err.response?.status === 404 || msg.includes('No query results')) {
        setModalError('This task was not found or was reset during a server update. Please refresh the page or return to the task list.');
      } else {
        setModalError(msg);
      }
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

  const handleConfirmReopen = async () => {
    if (!task) return;
    setReopeningTask(true);
    setReopenError('');
    try {
      await tasksApi.reopen(task.id, reopenReason.trim() || undefined);
      setIsReopenModalOpen(false);
      setReopenReason('');
      loadTask(task.id);
    } catch (err: any) {
      setReopenError(err.response?.data?.message || 'Failed to reopen task.');
    } finally {
      setReopeningTask(false);
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
    if (task.my_branch?.id && task.creator?.id !== currentUser?.id) {
      formData.append('task_branch_id', String(task.my_branch.id));
    }

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
        showToast(err.response?.data?.message || err.message || 'Failed to download attachment', 'error');
      }
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
  const isCollaborateTask = task.handling_method === 'collaborate';

  const activeBranches: TaskBranch[] = useMemo(
    () => ((task.branches || []) as TaskBranch[]).filter((b: TaskBranch) => b.status !== 'cancelled'),
    [task.branches]
  );
  const cancelledBranches: TaskBranch[] = useMemo(
    () => ((task.branches || []) as TaskBranch[]).filter((b: TaskBranch) => b.status === 'cancelled'),
    [task.branches]
  );

  const hasSubtasks = Boolean(
    activeBranches.length > 1 ||
    (task.handling_method === 'assign' && activeBranches.some((b: TaskBranch) => b.title !== task.title))
  );
  const isDirectDelegation = Boolean(
    task.is_direct_delegation ??
    (task.handling_method === 'assign' && !hasSubtasks)
  );
  const isCompleted = task.status === 'completed';

  const allBranchesCompleted =
    Boolean((task as any).is_ready_for_final_signoff) ||
    Boolean((task as any).all_branches_completed) ||
    (task.progress_summary && task.progress_summary.total > 0 && task.progress_summary.completed === task.progress_summary.total) ||
    (task.branches &&
      task.branches.filter((b) => b.status !== 'cancelled').length > 0 &&
      task.branches.filter((b) => b.status !== 'cancelled').every((b) => b.status === 'completed'));

  const isReadyForFinalSignOff =
    !isWorkAlone &&
    !isCompleted &&
    (allBranchesCompleted || Boolean(task.permissions?.can_final_submit));

  const isUnderReview =
    !isCompleted &&
    !isReadyForFinalSignOff &&
    (task.status === 'review' || task.branches?.some((b) => b.status === 'review'));

  const isMyWorkDone = Boolean(task.my_branch && task.my_branch.status === 'completed');
  const isCreator = Boolean(task?.creator?.id === currentUser?.id);
  const isSubtaskAssignee = !isCreator && Boolean(task?.my_branch);

  const getLifecycleStageState = (stageKey: string) => {
    if (stageKey === 'created') return 'completed';

    if (stageKey === 'in_progress') {
      if (isCompleted || isReadyForFinalSignOff || isUnderReview || isMyWorkDone) return 'completed';
      if (task.status === 'on_hold') return 'paused';
      if (task.status === 'in_progress' || task.status === 'post_comment' || task.status === 'pending') return 'current';
      return 'upcoming';
    }

    if (stageKey === 'review') {
      if (isCompleted || isReadyForFinalSignOff) return 'completed';
      if (isUnderReview) return 'current';
      if (task.my_branch && task.my_branch.status === 'review') return 'current';
      if (isMyWorkDone) return 'completed';
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
                    : isMyWorkDone && task.status === 'in_progress'
                    ? 'in_progress'
                    : task.status
                }
                customLabel={
                  task.status === 'completed'
                    ? 'Completed'
                    : isReadyForFinalSignOff
                    ? 'Final Sign-off'
                    : isUnderReview
                    ? 'Under Review'
                    : isMyWorkDone && task.status === 'in_progress'
                    ? 'Your Part Done (In Progress)'
                    : undefined
                }
              />
              <PriorityBadge priority={task.priority} />
              <span className={`px-2.5 py-0.5 rounded-full text-xs border flex items-center gap-1.5 ${slaBadge.color}`}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{slaBadge.text}</span>
              </span>
            </div>

            {/* Ball in Court / Responsibility Indicator */}
            {(() => {
              let ballLabel = 'Ball in Court:';
              let ballPerson = '';
              let ballAction = '';
              let ballColor = 'bg-blue-50/90 text-blue-800 border-blue-200/80';
              let ballDot = 'bg-blue-500';

              if (task.status === 'completed') {
                ballPerson = 'Task Completed';
                ballAction = 'All deliverables approved & signed off';
                ballColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                ballDot = 'bg-emerald-500';
              } else if (task.status === 'cancelled') {
                ballPerson = 'Task Cancelled';
                ballAction = 'Workflow terminated';
                ballColor = 'bg-rose-50 text-rose-800 border-rose-200';
                ballDot = 'bg-rose-500';
              } else if (task.status === 'on_hold') {
                ballPerson = task.hold_record?.held_by || 'Management';
                ballAction = `Paused (Reason: ${task.hold_record?.reason || 'On hold'})`;
                ballColor = 'bg-amber-50 text-amber-900 border-amber-300';
                ballDot = 'bg-amber-500';
              } else if (task.permissions.can_provide_details && task.latest_clarification) {
                ballPerson = 'You (Assigner / Creator)';
                ballAction = `Question needs answering from ${task.latest_clarification.requested_by?.name || 'Assignee'}`;
                ballColor = 'bg-amber-50 text-amber-900 border-amber-300';
                ballDot = 'bg-amber-500';
              } else if (task.permissions.can_review && latestPendingSubmission) {
                ballPerson = 'You (Reviewer)';
                ballAction = `Review deliverable from ${latestPendingSubmission.submitted_by?.name || 'Assignee'}`;
                ballColor = 'bg-purple-50 text-purple-900 border-purple-300';
                ballDot = 'bg-purple-500 animate-pulse';
              } else if (isReadyForFinalSignOff) {
                ballPerson = task.creator?.name || 'Executive Signer';
                ballAction = 'All subtasks approved — Final Sign-off required';
                ballColor = 'bg-emerald-50 text-emerald-900 border-emerald-300';
                ballDot = 'bg-emerald-500 animate-pulse';
              } else if (task.my_branch?.status === 'review') {
                ballPerson = task.my_branch.assigned_by?.name || task.creator?.name || 'Assigner';
                ballAction = 'Reviewing your submitted deliverables';
                ballColor = 'bg-sky-50 text-sky-900 border-sky-300';
                ballDot = 'bg-sky-500';
              } else if (task.permissions.can_submit) {
                ballPerson = 'You (Active Assignee)';
                ballAction = 'Deliverables due for submission';
                ballColor = 'bg-blue-50 text-blue-900 border-blue-300';
                ballDot = 'bg-blue-500 animate-pulse';
              } else if (task.current_owners && task.current_owners.length > 0) {
                const names = task.current_owners.map((o) => o.name).join(', ');
                ballPerson = names;
                ballAction = task.current_owners.length > 1 ? 'Working on assigned subtasks' : 'Working on deliverable';
                ballColor = 'bg-slate-50 text-slate-800 border-slate-200';
                ballDot = 'bg-blue-500';
              } else {
                ballPerson = task.current_owner?.name || 'Assignee';
                ballAction = 'Working on task';
              }

              return (
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-medium shadow-2xs ${ballColor}`}>
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ballDot}`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${ballDot}`} />
                    </span>
                    <span className="font-bold uppercase tracking-wider text-[10px] opacity-75">{ballLabel}</span>
                    <span className="font-bold text-slate-900">{ballPerson}</span>
                    <span className="opacity-40">|</span>
                    <span className="opacity-90">{ballAction}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 1-Button Rule & Action Header */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Refresh Button */}
            <button
              type="button"
              onClick={async () => {
                if (!id) return;
                setIsRefreshing(true);
                await loadTask(Number(id));
                setIsRefreshing(false);
                showToast('Task details refreshed', 'info');
              }}
              disabled={isRefreshing}
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
              title="Refresh task data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Primary Action Button (Only rendered here if not already hosted in a dedicated contextual hero banner) */}
            {isWorkAlone && !isCompleted && (task.permissions.can_final_submit || currentUser?.role === 'admin' || currentUser?.role === 'sub_admin' || task.creator?.id === currentUser?.id) ? (
              <button
                type="button"
                onClick={() => {
                  setFinalCompleteDesc('Work completed and all deliverables verified.');
                  setFinalCompleteFiles([]);
                  setIsFinalCompleteModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer hover:shadow-md active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Final Sign-off & Complete Task</span>
              </button>
            ) : (task.status === 'completed' || task.status === 'cancelled') &&
              (currentUser?.role === 'admin' || currentUser?.role === 'sub_admin' || currentUser?.id === task.creator?.id) ? (
              <button
                type="button"
                onClick={() => { setReopenReason(''); setReopenError(''); setIsReopenModalOpen(true); }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Re-open this task back to active in-progress workflow"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-open Task</span>
              </button>
            ) : null}

            {/* Secondary Actions & Task Controls Dropdown */}
            {(
              (task.status !== 'completed' && task.status !== 'cancelled' && (task.permissions?.can_assign || currentUser?.role === 'admin' || currentUser?.id === task.creator?.id)) ||
              (task.status !== 'completed' && task.status !== 'cancelled' && (task.permissions?.can_collaborate || currentUser?.role === 'admin' || currentUser?.id === task.creator?.id)) ||
              task.permissions.can_request_details ||
              task.permissions.can_hold ||
              task.permissions.can_resume ||
              task.permissions.can_cancel ||
              task.permissions?.can_delete ||
              currentUser?.role === 'admin' ||
              currentUser?.role === 'sub_admin' ||
              currentUser?.id === task.creator?.id
            ) && (
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="More actions and task controls"
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-600" />
                  <span>More Options</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isActionsMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                    {/* Assign More */}
                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => { setIsActionsMenuOpen(false); openAssignModal('assign'); }}
                        className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2 transition cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Assign More Members</span>
                      </button>
                    )}

                    {/* Collaborate */}
                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => { setIsActionsMenuOpen(false); openAssignModal('collaborate'); }}
                        className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Invite Collaborators</span>
                      </button>
                    )}

                    {/* Ask Question / Need Details */}
                    {task.permissions.can_request_details && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          setRequestDetailsQuestion('');
                          setRequestDetailsFiles([]);
                          setIsRequestDetailsModalOpen(true);
                        }}
                        className="w-full text-left px-3.5 py-2 text-amber-800 hover:bg-amber-50 flex items-center gap-2 transition cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Ask Question / Need Details</span>
                      </button>
                    )}

                    {/* Pause / Hold */}
                    {task.permissions.can_hold && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          handleOpenHoldModal();
                        }}
                        className="w-full text-left px-3.5 py-2 text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Pause Task</span>
                      </button>
                    )}

                    {/* Duplicate Task */}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'sub_admin' || currentUser?.id === task.creator?.id) && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          navigate('/tasks/create', {
                            state: {
                              duplicateFrom: {
                                title: `Copy of ${task.title}`,
                                description: task.description,
                                priority: task.priority,
                                departmentId: task.department?.id || (task as any).department_id,
                                handlingMethod: task.handling_method,
                                expectedResult: task.expected_result,
                                acceptanceCriteria: task.acceptance_criteria,
                              },
                            },
                          });
                        }}
                        className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition cursor-pointer"
                        title="Create a new task cloned from this task"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Duplicate Task</span>
                      </button>
                    )}

                    {/* Resume */}
                    {task.permissions.can_resume && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          handleResume();
                        }}
                        className="w-full text-left px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Resume Task</span>
                      </button>
                    )}

                    {/* Cancel Task */}
                    {task.permissions.can_cancel && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            handleOpenCancelModal();
                          }}
                          className="w-full text-left px-3.5 py-2 text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Cancel Task</span>
                        </button>
                      </>
                    )}

                    {/* Delete Task */}
                    {task.permissions?.can_delete && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            setDeleteError('');
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 text-red-700 hover:bg-red-50 flex items-center gap-2 transition cursor-pointer font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Delete Task</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* THE 3-SECOND RULE: WORKFLOW STATUS & NEXT STEP HERO CARD   */}
        {/* ======================================================== */}
        {task.status === 'cancelled' ? (
          <div className="mt-4 p-4 bg-rose-50/90 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Ban className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-rose-950 text-sm">Task Cancelled & Archived</span>
                {task.cancelled_at && (
                  <span className="text-[10px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full font-semibold">
                    {new Date(task.cancelled_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-rose-800 mt-1">
                Cancelled by {task.cancelled_by?.name || task.creator?.name || 'Authorized User'}.
                {task.cancellation_reason ? ` Reason: "${task.cancellation_reason}"` : ''}
              </p>
            </div>
          </div>
        ) : task.latest_clarification && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment')) ? (
          <div className="mt-4 p-4 bg-amber-50/95 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-950 text-sm">Action Required: Question Needs Answering</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Pending Response</span>
                </div>
                <p className="text-amber-800 mt-0.5 whitespace-pre-wrap">
                  {task.latest_clarification.requested_by?.name || 'Assignee'} asked: "{task.latest_clarification.comment.replace(/^❓\s*Missing Details Requested by [^:]*:\s*/, '')}"
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
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Answer Question</span>
              </button>
            )}
          </div>
        ) : task.latest_return && (task.status === 'post_comment' || task.branches?.some((b) => b.status === 'post_comment')) ? (
          <div className="mt-4 p-4 bg-rose-50/95 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-950 text-sm">Action Required: Changes Requested by Reviewer</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Revision Needed</span>
                </div>
                <p className="text-rose-800 mt-0.5 whitespace-pre-wrap">
                  Reviewer note from {task.latest_return.reviewer?.name || 'Reviewer'}: "{task.latest_return.comments}"
                </p>
              </div>
            </div>
            {task.permissions.can_submit && (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Review</span>
              </button>
            )}
          </div>
        ) : task.status === 'on_hold' && task.hold_record ? (
          <div className="mt-4 p-4 bg-amber-50/95 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-amber-950 text-sm block">Task Paused (On Hold)</span>
                <span className="text-amber-800 text-xs">Reason: {task.hold_record.reason} (by {task.hold_record.held_by})</span>
              </div>
            </div>
            {task.permissions.can_resume && (
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition cursor-pointer text-xs active:scale-95 shadow-xs"
              >
                Resume Task Now
              </button>
            )}
          </div>
        ) : task.permissions.can_review && latestPendingSubmission ? (
          <div className="mt-4 p-4 bg-purple-50/95 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-950 text-sm">Action Required: Subtask Deliverable Ready for Your Review</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Pending Your Sign-off</span>
                </div>
                <p className="text-purple-800 mt-0.5">
                  <strong>{latestPendingSubmission.submitted_by?.name || 'Assignee'}</strong> submitted completed work. Please review and approve to advance the task.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSubmission(latestPendingSubmission);
                setIsReviewModalOpen(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Check & Review Work</span>
            </button>
          </div>
        ) : task.my_branch?.status === 'review' ? (
          <div className="mt-4 p-4 bg-sky-50/90 border border-sky-200 rounded-2xl flex items-center gap-3 text-xs shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sky-950 text-sm">Work Submitted — Awaiting Assigner Review</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800">In Review</span>
              </div>
              <p className="text-sky-800 mt-0.5">
                You have submitted your deliverables. This subtask is waiting for <strong>{task.my_branch.assigned_by?.name || 'your assigner'}</strong> to verify and approve.
              </p>
            </div>
          </div>
        ) : isReadyForFinalSignOff && !isCompleted ? (
          <div className="mt-4 p-4 bg-emerald-50/95 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-950 text-sm">All Subtasks Approved — Ready for Final Sign-off</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Stage 4 of 5</span>
                </div>
                <p className="text-emerald-800 mt-0.5">
                  All subtasks have been verified and approved. Final sign-off is required to complete the project.
                </p>
              </div>
            </div>
            {(task.permissions.can_final_submit || isReadyForFinalSignOff) && (currentUser?.role === 'admin' || currentUser?.role === 'sub_admin' || task.creator?.id === currentUser?.id) && (
              <button
                type="button"
                onClick={() => {
                  setFinalCompleteDesc(
                    isWorkAlone
                      ? 'Work completed and all deliverables verified.'
                      : 'Final deliverables verified and approved for project completion.'
                  );
                  setFinalCompleteFiles([]);
                  setIsFinalCompleteModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Final Sign-off & Complete Task</span>
              </button>
            )}
          </div>
        ) : task.status === 'completed' ? (
          <div className="mt-4 p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 text-sm">Task Completed & Fully Signed Off</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Completed</span>
              </div>
              <p className="text-emerald-800 mt-0.5">
                All work and deliverables have been successfully verified and accepted.
              </p>
            </div>
          </div>
        ) : task.permissions.can_submit ? (
          <div className="mt-4 p-4 sm:p-5 bg-gradient-to-r from-blue-50/95 via-sky-50/80 to-indigo-50/95 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-blue-950 text-sm">Action Station: Your Subtask Deliverables are Due</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${slaBadge.color}`}>
                    {slaBadge.text}
                  </span>
                  {isAdminOrSubAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <span>🔒 Private Subtask</span>
                    </span>
                  )}
                </div>
                <p className="text-blue-900 leading-relaxed">
                  You are actively working on <strong>"{task.my_branch?.title || task.title}"</strong>. When finished, submit your deliverables for review by {task.my_branch?.assigned_by?.name || task.creator?.name || 'your assigner'}.
                </p>
                {isAdminOrSubAdmin && (
                  <p className="text-[11px] text-blue-700/80">
                    Private Subtasks Active: Assignees only see their assigned work and deliverables.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {task.permissions.can_request_details && (
                <button
                  type="button"
                  onClick={() => {
                    setRequestDetailsQuestion('');
                    setRequestDetailsFiles([]);
                    setIsRequestDetailsModalOpen(true);
                  }}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="Ask your assigner for clarification or missing details"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Need Help?</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Submit your completed deliverables for review"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Review</span>
              </button>
            </div>
          </div>
        ) : (task.my_branch?.has_uncompleted_delegated_subtasks || (isCreator && task.branches?.some((b) => b.status !== 'completed' && b.status !== 'cancelled'))) ? (
          <div className="mt-4 p-4 bg-slate-50/90 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {isDirectDelegation ? 'Work in Progress' : isCollaborateTask ? 'Team Collaboration Active' : 'Waiting on Teammates'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">In Progress</span>
                </div>
                <p className="text-slate-600 mt-0.5">
                  {isDirectDelegation
                    ? `${task.current_owner?.name || 'Assignee'} is currently working on this task. You will be notified once they submit for review.`
                    : isCollaborateTask
                    ? 'Team members are collaborating on this task.'
                    : 'Team members are currently working on their assigned subtasks. You will be notified once they submit for your review.'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modern Compact Lifecycle Stepper (Centered & Evenly Spaced) */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-center w-full overflow-x-auto py-1 text-xs">
            <div className="flex items-center justify-between w-full max-w-4xl px-2 sm:px-4">
              {lifecycleStages.map((stg, sIdx) => {
                const state = getLifecycleStageState(stg.key);
                const isCompleted = state === 'completed';
                const isCurrent = state === 'current';
                const isPaused = state === 'paused';

                return (
                  <React.Fragment key={stg.key}>
                    {sIdx > 0 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 min-w-3 sm:min-w-6 transition-colors ${
                          isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-100'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : isPaused
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      ) : isPaused ? (
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      )}
                      <span>{stg.label}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Clean 4 Navigation Tabs */}
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
            onClick={() => setActiveTab('assignments')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {hasSubtasks
                ? `Subtasks & Team (${activeBranches.length})`
                : isCollaborateTask
                ? `Team & Collaborators (${(task.collaborators || []).filter((c) => !activeBranches.some((b: TaskBranch) => b.owner?.id === c.id)).length})`
                : `Assigned Team (${activeBranches.length})`}
            </span>
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
            {(() => {
              const isTaskCreator = task.creator?.id === currentUser?.id;
              const isSubtaskAssignee = !isTaskCreator && Boolean(task.my_branch);
              const count = isSubtaskAssignee
                ? (task.my_branch?.attachments?.length || task.attachments?.filter((a) => a.task_branch_id === task.my_branch?.id).length || 0)
                : (task.attachments?.length || 0);
              return <span>Files & Deliverables ({count})</span>;
            })()}
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
            <span>Activity & Discussion ({(task.comments?.length || 0) + (task.status_history?.length || 0)})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SCREEN 7: OVERVIEW TAB CONTENT                           */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Aggregated Progress Summary for Task Overseers / Managers */}
          {!task.is_peer_isolated && task.progress_summary && (task.progress_summary.total > 0 || (task.progress_summary.cancelled ?? 0) > 0) && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Assignment Progress & Allocation
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Overall status breakdown across active assigned employees
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Indicator: Active Assignments */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs select-none">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-slate-500 font-medium">Active:</span>
                    <span className="font-black text-slate-900">{task.progress_summary.total}</span>
                  </div>

                  {/* Indicator: Completed */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-900 text-xs select-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-emerald-700 font-medium">Completed:</span>
                    <span className="font-black text-emerald-800">{task.progress_summary.completed}</span>
                  </div>

                  {/* Indicator: In Progress */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-900 text-xs select-none">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-blue-700 font-medium">In Progress:</span>
                    <span className="font-black text-blue-800">{task.progress_summary.in_progress}</span>
                  </div>

                  {/* Indicator: Pending Review */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs select-none">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-amber-700 font-medium">Pending Review:</span>
                    <span className="font-black text-amber-800">{task.progress_summary.pending_review}</span>
                  </div>

                  {/* Indicator: Cancelled */}
                  {task.progress_summary.cancelled !== undefined && task.progress_summary.cancelled > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-900 text-xs select-none">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-rose-700 font-medium">Cancelled:</span>
                      <span className="font-black text-rose-800">{task.progress_summary.cancelled}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${task.progress_summary.total > 0 ? (task.progress_summary.completed / task.progress_summary.total) * 100 : 0}%`,
                  }}
                  title={`Completed: ${task.progress_summary.completed}`}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{
                    width: `${task.progress_summary.total > 0 ? (task.progress_summary.pending_review / task.progress_summary.total) * 100 : 0}%`,
                  }}
                  title={`Pending Review: ${task.progress_summary.pending_review}`}
                />
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{
                    width: `${task.progress_summary.total > 0 ? (task.progress_summary.in_progress / task.progress_summary.total) * 100 : 0}%`,
                  }}
                  title={`In Progress: ${task.progress_summary.in_progress}`}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Basic Information */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            {/* YOUR ASSIGNED SUBTASK WORK CARD */}
            {task.my_branch && (
              <div className="p-5 bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-blue-50/90 border-2 border-blue-200/90 rounded-2xl space-y-4 shadow-sm animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-blue-200/60">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-blue-950 uppercase tracking-wider block">
                        Your Assigned Subtask
                      </span>
                      {isAdminOrSubAdmin && (
                        <span className="text-[10px] text-blue-700/80 font-medium">
                          Private individual assignment
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdminOrSubAdmin && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <span>🔒 Private Assignment</span>
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                      Subtask Title
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {task.my_branch.title}
                    </h3>
                  </div>

                  {task.my_branch.description && (
                    <div className="p-3 bg-white/90 border border-blue-200/80 rounded-xl space-y-1">
                      <span className="font-bold text-blue-900 text-[10px] uppercase tracking-wider block">
                        Instructions & Details
                      </span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {task.my_branch.description}
                      </p>
                    </div>
                  )}

                  {task.my_branch.expected_result && (
                    <div className="p-3 bg-white/90 border border-blue-200/80 rounded-xl space-y-1">
                      <span className="font-bold text-blue-900 text-[10px] uppercase tracking-wider block">
                        What to Deliver / Final Output
                      </span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {task.my_branch.expected_result}
                      </p>
                    </div>
                  )}

                  {task.my_branch.acceptance_criteria && (() => {
                    const criteriaLines = task.my_branch.acceptance_criteria
                      .split(/\r?\n/)
                      .filter((l: string) => l.trim().length > 0);
                    if (criteriaLines.length === 0) return null;
                    const checkedCount = criteriaLines.filter((_: string, idx: number) =>
                      Boolean(checkedCheckpoints[`subtask_${task.my_branch?.id}_${idx}`])
                    ).length;
                    const pct = Math.round((checkedCount / criteriaLines.length) * 100);

                    return (
                      <div className="p-3.5 bg-white/95 border border-blue-200/90 rounded-xl space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>Subtask Checkpoints ({checkedCount}/{criteriaLines.length})</span>
                          </span>
                          <span className="text-[11px] font-bold text-blue-600">{pct}% Done</span>
                        </div>
                        <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {criteriaLines.map((crit: string, idx: number) => {
                            const key = `subtask_${task.my_branch?.id}_${idx}`;
                            const isDone = Boolean(checkedCheckpoints[key]);
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleCheckpoint(key)}
                                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition select-none text-xs ${
                                  isDone
                                    ? 'bg-blue-50/70 text-slate-500 line-through'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border transition ${
                                    isDone
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 bg-white hover:border-blue-400'
                                  }`}
                                >
                                  {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                </span>
                                <span className="leading-tight">{crit.replace(/^[-*•\d\.\s]+/, '')}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Attachments Section for My Assignment */}
                  {(() => {
                    const isTaskCreator = task.creator?.id === currentUser?.id;
                    const isSubtaskAssignee = !isTaskCreator && Boolean(task.my_branch);
                    const sharedAtts = isSubtaskAssignee ? [] : (task.shared_attachments || task.attachments?.filter((a) => !a.task_branch_id) || []);
                    const branchAtts = isSubtaskAssignee
                      ? (task.my_branch?.attachments?.length ? task.my_branch.attachments : (task.attachments?.filter((a) => a.task_branch_id === task.my_branch?.id) || []))
                      : (task.my_branch?.attachments || task.attachments?.filter((a) => a.task_branch_id === task.my_branch?.id) || []);
                    const allMyAtts = [
                      ...sharedAtts.map((a) => ({ ...a, is_shared: true })),
                      ...branchAtts.map((a) => ({ ...a, is_shared: false })),
                    ];

                    if (allMyAtts.length === 0) return null;

                    return (
                      <div className="p-3 bg-white/95 border border-blue-200/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900 text-[10px] uppercase tracking-wider block">
                            {isSubtaskAssignee ? 'Subtask Attachments' : 'Scope Attachments'} ({allMyAtts.length})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isSubtaskAssignee ? 'Deliverables and files for your subtask' : 'Shared & Individual files for your scope'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {allMyAtts.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <div className="truncate">
                                  <p className="font-semibold text-slate-800 truncate text-[11px]">{att.file_name}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <span>{Math.round(att.file_size / 1024)} KB</span>
                                    {att.is_shared && (
                                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold text-[9px]">
                                        Shared
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDownloadAttachment(att.id, att.file_name)}
                                disabled={downloadingId === att.id}
                                className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-md text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>{downloadingId === att.id ? '...' : 'Download'}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status</span>
                        <StatusBadge status={task.my_branch.status as any} size="sm" />
                      </div>
                      {task.my_branch.due_date && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Your Due Date</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(task.my_branch.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {task.my_branch.status === 'completed' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Deliverables Approved & Completed</span>
                        </div>
                      )}
                      {task.my_branch.status === 'review' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>Work Submitted · Awaiting Review by {task.my_branch.assigned_by?.name || 'Assigner'}</span>
                        </div>
                      )}
                      {task.status !== 'completed' && task.status !== 'cancelled' && task.my_branch.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => openAssignModal('assign')}
                          className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Delegate subtasks to team members under your supervision"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Delegate to Teammate</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isAdminOrSubAdmin && (
                  <div className="p-2.5 bg-blue-100/50 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                    <span className="font-bold text-blue-700">🔒 Privacy Setting:</span>
                    <span>Assignees only see their own assigned work.</span>
                  </div>
                )}
              </div>
            )}

            {/* Clear Separation: For subtask assignees, show parent context in a tidy collapsible accordion */}
            {isSubtaskAssignee ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/60 transition shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowParentContext(!showParentContext)}
                  className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/80 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-blue-600" />
                    <span>Parent Project Overview: {task.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                    <span>{showParentContext ? 'Hide Project Overview' : 'View Background Context'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showParentContext ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {showParentContext && (
                  <div className="p-5 border-t border-slate-200 bg-white space-y-5 text-xs animate-in fade-in">
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Parent Project Description</span>
                      <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </div>
                    </div>
                    {task.expected_result && (
                      <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-2 text-sky-900 font-bold text-[11px] uppercase tracking-wider">
                          <Target className="w-3.5 h-3.5 text-sky-600" />
                          <span>What to Deliver / Final Output</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-xs pl-5">
                          {task.expected_result}
                        </p>
                      </div>
                    )}
                    {task.acceptance_criteria && (() => {
                      const criteriaLines = task.acceptance_criteria
                        .split(/\r?\n/)
                        .filter((line: string) => line.trim().length > 0);
                      if (criteriaLines.length === 0) return null;
                      const checkedCount = criteriaLines.filter((_: string, idx: number) =>
                        Boolean(checkedCheckpoints[`main_${task.id}_${idx}`])
                      ).length;
                      const pct = Math.round((checkedCount / criteriaLines.length) * 100);

                      return (
                        <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                              <span>Checklist of What Needs to Be Done ({checkedCount}/{criteriaLines.length})</span>
                            </span>
                            <span className="text-[11px] font-bold text-blue-600">{pct}% Done</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="space-y-2">
                            {criteriaLines.map((criterion: string, cIdx: number) => {
                              const key = `main_${task.id}_${cIdx}`;
                              const isDone = Boolean(checkedCheckpoints[key]);
                              return (
                                <div
                                  key={cIdx}
                                  onClick={() => toggleCheckpoint(key)}
                                  className={`flex items-start gap-2.5 text-xs bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none transition ${
                                    isDone ? 'opacity-60 bg-slate-50/80' : 'hover:border-blue-300'
                                  }`}
                                >
                                  <span
                                    className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition ${
                                      isDone
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-blue-50 border-blue-200 text-blue-600'
                                    }`}
                                  >
                                    {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </span>
                                  <span className={`leading-relaxed font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                    {criterion.replace(/^[-*•\d\.\s]+/, '')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <>
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
                        <span>What to Deliver / Final Output</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-xs pl-5">
                        {task.expected_result}
                      </p>
                    </div>
                  )}

                  {task.acceptance_criteria && (() => {
                    const criteriaLines = task.acceptance_criteria
                      .split(/\r?\n/)
                      .filter((line: string) => line.trim().length > 0);
                    if (criteriaLines.length === 0) return null;
                    const checkedCount = criteriaLines.filter((_: string, idx: number) =>
                      Boolean(checkedCheckpoints[`main_${task.id}_${idx}`])
                    ).length;
                    const pct = Math.round((checkedCount / criteriaLines.length) * 100);

                    return (
                      <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                            <span>Checklist of What Needs to Be Done ({checkedCount}/{criteriaLines.length})</span>
                          </span>
                          <span className="text-[11px] font-bold text-blue-600">{pct}% Complete</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="space-y-2">
                          {criteriaLines.map((criterion: string, cIdx: number) => {
                            const key = `main_${task.id}_${cIdx}`;
                            const isDone = Boolean(checkedCheckpoints[key]);
                            return (
                              <div
                                key={cIdx}
                                onClick={() => toggleCheckpoint(key)}
                                className={`flex items-start gap-2.5 text-xs bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs cursor-pointer select-none transition ${
                                  isDone ? 'opacity-60 bg-slate-50/80' : 'hover:border-blue-300'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition ${
                                    isDone
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'bg-blue-50 border-blue-200 text-blue-600'
                                  }`}
                                >
                                  {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span className={`leading-relaxed font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                  {criterion.replace(/^[-*•\d\.\s]+/, '')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
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
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">
                        {hasSubtasks ? 'Subtasks Completion' : isCollaborateTask ? 'Collaboration Status' : 'Task Status'}
                      </span>
                      <span className="font-bold text-slate-900">
                        {task.branches.filter((b) => b.status === 'completed').length} of {task.branches.filter((b) => b.status !== 'cancelled').length} Done
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 pt-1">
                      <span>{task.branches.filter((b) => b.status === 'in_progress').length} In Progress</span>
                      <span>•</span>
                      <span>{task.branches.filter((b) => b.status === 'review').length} In Review</span>
                      <span>•</span>
                      <span>{task.branches.filter((b) => b.status === 'completed').length} Approved</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('assignments')}
                      className="w-full py-2 px-3 mt-2 bg-blue-50/60 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold transition flex items-center justify-between border border-blue-200/80 cursor-pointer"
                    >
                      <span>
                        {hasSubtasks
                          ? `View All Subtasks (${activeBranches.length})`
                          : isCollaborateTask
                          ? `View Collaborators (${(task.collaborators || []).filter((c) => !activeBranches.some((b: TaskBranch) => b.owner?.id === c.id)).length})`
                          : `View Assignment (${activeBranches.length})`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-800">Direct Execution</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Owner(s) / Action Needed By Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {(() => {
                      if (task.is_peer_isolated || isSubtaskAssignee) {
                        return 'Action Needed By';
                      }
                      return task.current_owners && task.current_owners.length > 1
                        ? `Action Needed By (${task.current_owners.length})`
                        : 'Action Needed By';
                    })()}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Team members currently holding the next workflow action
                </p>
              </div>

              {(() => {
                // STRICT PEER ISOLATION:
                // An assignee must NEVER see other peer assignees.
                // Determine visible owners strictly within this user's peer-isolated scope:
                let ownersList = task.current_owners && task.current_owners.length > 0 ? task.current_owners : (task.current_owner ? [task.current_owner] : []);

                if (task.is_peer_isolated || isSubtaskAssignee) {
                  const allowedIds = new Set([
                    currentUser?.id,
                    task.creator?.id,
                    task.my_branch?.assigned_by?.id,
                    ...(task.branches?.map((b) => b.owner?.id).filter(Boolean) as number[] || []),
                  ]);

                  ownersList = ownersList.filter((o) => allowedIds.has(o.id));

                  // If empty or filtered out, accurately show the user themselves if their branch is active,
                  // or their assigner if awaiting review:
                  if (ownersList.length === 0) {
                    if (task.my_branch?.status === 'review') {
                      const reviewerUser = task.my_branch.assigned_by || task.creator;
                      if (reviewerUser) {
                        ownersList = [{
                          id: reviewerUser.id,
                          name: reviewerUser.name,
                          email: reviewerUser.email || '',
                          role: reviewerUser.role || 'Reviewer',
                        }];
                      }
                    } else if (currentUser) {
                      ownersList = [{
                        id: currentUser.id,
                        name: currentUser.name,
                        email: currentUser.email || '',
                        role: currentUser.role || 'Assignee',
                      }];
                    }
                  }
                }

                if (ownersList.length === 0) {
                  return <p className="text-xs text-slate-400 italic">No owner assigned.</p>;
                }

                return (
                  <div className="space-y-3">
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {ownersList.map((owner) => {
                        const ownerBranch = task.branches?.find((b) => b.owner?.id === owner.id);
                        let roleTag = 'Active Assignee';
                        let roleColor = 'bg-blue-50 text-blue-700 border-blue-200';

                        if (ownerBranch) {
                          if (ownerBranch.status === 'review') {
                            roleTag = (task.is_peer_isolated || isSubtaskAssignee) && owner.id === currentUser?.id
                              ? 'Submitted (In Review)'
                              : 'Submitted (In Review)';
                            roleColor = 'bg-amber-50 text-amber-700 border-amber-200';
                          } else if (ownerBranch.status === 'post_comment') {
                            roleTag = 'Corrections Needed';
                            roleColor = 'bg-rose-50 text-rose-700 border-rose-200';
                          } else if (ownerBranch.status === 'completed') {
                            roleTag = 'Approved & Completed';
                            roleColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          } else {
                            roleTag = 'Working on Deliverable';
                            roleColor = 'bg-sky-50 text-sky-700 border-sky-200';
                          }
                        } else if ((task.is_peer_isolated || isSubtaskAssignee) && task.my_branch?.status === 'review' && (owner.id === task.my_branch?.assigned_by?.id || owner.id === task.creator?.id)) {
                          roleTag = 'Reviewing Your Submission';
                          roleColor = 'bg-amber-50 text-amber-800 border-amber-200';
                        } else if (task.creator?.id === owner.id) {
                          if (isReadyForFinalSignOff) {
                            roleTag = 'Final Sign-off Required';
                            roleColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                          } else {
                            roleTag = 'Task Assigner / Creator';
                            roleColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                          }
                        }

                        return (
                          <div
                            key={owner.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                              {owner.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{owner.name}</h4>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${roleColor} shrink-0`}>
                                  {roleTag}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{owner.email}</p>
                            </div>
                          </div>
                        );
                      })}
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
                );
              })()}
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
                  <span>
                    {hasSubtasks
                      ? `Subtasks & Team Members (${activeBranches.length})`
                      : isCollaborateTask
                      ? `Task Lead (${activeBranches.length})`
                      : `Assigned Team Member (${activeBranches.length})`}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hasSubtasks
                    ? 'Accountable owners managing assigned subtasks and deliverables.'
                    : isCollaborateTask
                    ? 'Primary task owner leading the collaboration.'
                    : 'Team member directly responsible for executing this task.'}
                </p>
              </div>
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <button
                  onClick={() => openAssignModal('assign')}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{hasSubtasks ? 'Add Another Subtask' : 'Add Another Assignee'}</span>
                </button>
              )}
            </div>

            {activeBranches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeBranches.map((b: TaskBranch, idx: number) => {
                  const pendingSub = b.submissions?.find((s: any) => !s.reviews || s.reviews.length === 0);
                  const canReassignBranch =
                    (currentUser?.role === 'admin' ||
                      currentUser?.role === 'sub_admin' ||
                      task.creator?.id === currentUser?.id ||
                      b.assigned_by?.id === currentUser?.id) &&
                    task.status !== 'completed' &&
                    task.status !== 'cancelled' &&
                    b.status !== 'completed';

                  return (
                    <div
                      key={b.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                              {b.owner?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                {hasSubtasks ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                    Subtask {b.dot_code || b.hierarchical_code || `1.${idx + 1}`}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>{isCollaborateTask ? 'Task Lead' : 'Primary Assignee'}</span>
                                  </span>
                                )}
                              </div>
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
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge
                              status={b.status}
                              size="sm"
                              customLabel={
                                b.status === 'review'
                                  ? (currentUser?.id === b.assigned_by?.id
                                      ? 'Awaiting Your Review'
                                      : currentUser?.id === b.owner?.id
                                      ? `Submitted · Awaiting Review by ${b.assigned_by?.name || 'Assigner'}`
                                      : `Awaiting Review by ${b.assigned_by?.name || task.creator?.name || 'Assigner'}`)
                                  : b.status === 'post_comment'
                                  ? 'Needs Correction'
                                  : undefined
                              }
                            />
                            {canReassignBranch && (
                              <button
                                type="button"
                                onClick={() => openReassignModal(b)}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                                title="Reassign or withdraw this subtask assignment"
                              >
                                <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                                <span>Reassign</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 space-y-2.5 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                              {hasSubtasks ? 'Subtask Title' : 'Task Scope'}
                            </span>
                            <p className="font-bold text-slate-800 text-sm">{b.title}</p>
                          </div>

                          {b.description && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                                {hasSubtasks ? 'Subtask Instructions' : 'Task Instructions & Details'}
                              </span>
                              <p className="text-slate-600 text-xs whitespace-pre-wrap pl-2 border-l-2 border-blue-400">
                                {b.description}
                              </p>
                            </div>
                          )}

                          {b.expected_result && (
                            <div className="p-2 bg-slate-50 rounded-lg">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                                {hasSubtasks ? 'What to Deliver / Final Output' : 'Expected Deliverables & Output'}
                              </span>
                              <p className="text-slate-700 text-[11px] whitespace-pre-wrap">{b.expected_result}</p>
                            </div>
                          )}

                          {b.acceptance_criteria && (
                            <div className="p-2 bg-slate-50 rounded-lg">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                                Checklist of Requirements
                              </span>
                              <p className="text-slate-700 text-[11px] whitespace-pre-wrap">{b.acceptance_criteria}</p>
                            </div>
                          )}

                          {/* Subtask / Assigned Attachments */}
                          {b.attachments && b.attachments.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                                {hasSubtasks ? 'Subtask Attachments' : 'Assigned Attachments'} ({b.attachments.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {b.attachments.map((att: any) => (
                                  <button
                                    key={att.id}
                                    onClick={() => handleDownloadAttachment(att.id, att.file_name)}
                                    disabled={downloadingId === att.id}
                                    className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-md text-[10px] font-semibold border border-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Paperclip className="w-3 h-3 text-blue-500" />
                                    <span className="truncate max-w-[140px]">{att.file_name}</span>
                                    <Download className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Deliverable & Review Actions */}
                          {pendingSub && task.permissions.can_review && (
                            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="font-bold text-purple-900 text-xs block">Deliverable Submitted</span>
                                <span className="text-[10px] text-purple-700">Awaiting management review</span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedSubmission(pendingSub);
                                  setIsReviewModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Review Deliverable</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>Due: {b.due_date ? new Date(b.due_date).toLocaleDateString() : 'Task deadline'}</span>
                          {(() => {
                            if (!b.due_date || b.status === 'completed' || b.status === 'cancelled') return null;
                            const diffMs = new Date(b.due_date).getTime() - Date.now();
                            const diffHours = diffMs / (1000 * 60 * 60);
                            if (diffHours > 0 && diffHours <= 24) {
                              return (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> Due in {Math.max(1, Math.round(diffHours))}h
                                </span>
                              );
                            }
                            if (diffHours <= 0) {
                              return (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 inline-flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" /> Overdue
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {b.completed_at && (
                          <span className="text-emerald-600 font-semibold">Done: {new Date(b.completed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <UserPlus className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-xs font-bold text-slate-800">No Active Assigned Team Members</h3>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  {cancelledBranches.length > 0
                    ? 'All previous assignments were withdrawn/cancelled. Click below to allocate to a new team member.'
                    : 'No team members are currently assigned to this task.'}
                </p>
                {task.status !== 'completed' && task.status !== 'cancelled' && (
                  <button
                    onClick={() => openAssignModal('assign')}
                    className="mt-2 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Team Member</span>
                  </button>
                )}
              </div>
            )}

            {/* Subtle Audit notice when assignments have been withdrawn */}
            {cancelledBranches.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    <strong className="text-slate-800">
                      {cancelledBranches.length} past assignment{cancelledBranches.length > 1 ? 's were' : ' was'} withdrawn
                    </strong>{' '}
                    ({cancelledBranches.map((b: TaskBranch) => b.owner?.name).filter(Boolean).join(', ')}). All assignment & withdrawal history is permanently preserved in Work Logs & Activity feed.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('comments')}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  View Activity History →
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Collaborators (1 to Many) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>
                    Task Collaborators ({(() => {
                      const displayCollaborators = (task.collaborators || []).filter(
                        (c: any) => !activeBranches.some((b: TaskBranch) => b.owner?.id === c.id)
                      );
                      return displayCollaborators.length;
                    })()})
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Team members collaborating, contributing, or reviewing alongside the primary owners.
                </p>
              </div>
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <button
                  onClick={() => openAssignModal('collaborate')}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Invite Collaborators (1 or Many)</span>
                </button>
              )}
            </div>

            {(() => {
              const displayCollaborators = (task.collaborators || []).filter(
                (c) => !task.branches?.some((b) => b.owner?.id === c.id)
              );

              return displayCollaborators.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {displayCollaborators.map((c) => (
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
              );
            })()}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COMMENTS TAB                                             */}
      {/* ======================================================== */}
      {activeTab === 'comments' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="text-sm font-bold text-slate-900">Task Discussion & Team Notes</h2>

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
                    Need clarification or questions? Post comments here to discuss directly with <strong>{assigner.name}</strong>. (To formally approve deliverables, use the Review button).
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

          {/* Visual Activity Journey Timeline & Audit History */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Task Activity Journey & Audit History</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full chronological record of stage handovers, submissions, review decisions, and state updates.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-semibold px-2.5 py-1 bg-slate-100 rounded-full w-fit">
                {(task.status_history?.length || 0)} Activity Update{(task.status_history?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Active Parallel Stages Banner: Side-by-Side tracks for concurrent assignees (e.g. Checker & Reviewer) */}
            {(() => {
              const activeBranches = (task.branches || []).filter(
                (b) => b.status !== 'cancelled'
              );
              if (activeBranches.length <= 1 || task.status === 'completed' || task.status === 'cancelled') {
                return null;
              }

              return (
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-purple-50/80 border border-blue-100 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Subtasks in Progress ({activeBranches.filter((b) => b.status !== 'completed').length} Team Members Working)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Working in Parallel
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeBranches.map((branch, bIdx) => {
                      const isBranchDone = branch.status === 'completed';
                      const isBranchReview = branch.status === 'review';
                      const isBranchReturned = branch.status === 'post_comment';

                      return (
                        <div
                          key={branch.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isBranchDone
                              ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
                              : isBranchReview
                              ? 'bg-amber-50/70 border-amber-200 ring-1 ring-amber-300/50 shadow-2xs'
                              : 'bg-white border-blue-200 shadow-xs ring-1 ring-blue-100/70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                {branch.owner?.name?.charAt(0) || `T${bIdx + 1}`}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {branch.owner?.name || 'Unassigned'}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate font-medium">
                                  Subtask {bIdx + 1}: {branch.title}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isBranchDone ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Completed
                                </span>
                              ) : isBranchReview ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Under Review
                                </span>
                              ) : isBranchReturned ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  Needs Revision
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                  Current Stage
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-600 line-clamp-1 mt-1 pl-9">
                            {branch.description || branch.expected_result || 'Subtask assigned & currently in progress.'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const historyList = (task.status_history || []).slice().sort((a, b) => {
                const aIsCreated = a.reason?.toLowerCase().includes('task created');
                const bIsCreated = b.reason?.toLowerCase().includes('task created');
                if (aIsCreated && !bIsCreated) return -1;
                if (!aIsCreated && bIsCreated) return 1;

                const tA = a.changed_at ? new Date(a.changed_at).getTime() : 0;
                const tB = b.changed_at ? new Date(b.changed_at).getTime() : 0;
                if (tA === tB) {
                  const aIsAssign = a.reason?.toLowerCase().includes('assigned');
                  const bIsAssign = b.reason?.toLowerCase().includes('assigned');
                  if (aIsAssign && !bIsAssign) return -1;
                  if (!aIsAssign && bIsAssign) return 1;
                  return 0;
                }
                return tA - tB;
              });

              const reviewCount = historyList.filter((item) => {
                const r = (item.reason || '').toLowerCase();
                return r.includes('review') || r.includes('submit') || r.includes('approv') || r.includes('return') || r.includes('correct');
              }).length;

              const handoverCount = historyList.filter((item) => {
                const r = (item.reason || '').toLowerCase();
                return r.includes('assign') || r.includes('delegat');
              }).length;

              const holdCount = historyList.filter((item) => {
                const r = (item.reason || '').toLowerCase();
                return r.includes('hold') || r.includes('resume') || r.includes('creat') || r.includes('cancel') || r.includes('reopen');
              }).length;

              const filteredList = historyList.filter((item) => {
                const r = (item.reason || '').toLowerCase();
                if (timelineFilter === 'reviews') return r.includes('review') || r.includes('submit') || r.includes('approv') || r.includes('return') || r.includes('correct');
                if (timelineFilter === 'handovers') return r.includes('assign') || r.includes('delegat');
                if (timelineFilter === 'holds') return r.includes('hold') || r.includes('resume') || r.includes('creat') || r.includes('cancel') || r.includes('reopen');
                return true;
              });

              return (
                <div>
                  {/* Timeline Filter Chips */}
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setTimelineFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        timelineFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      All Updates ({historyList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineFilter('reviews')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        timelineFilter === 'reviews'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Reviews & Decisions ({reviewCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineFilter('handovers')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        timelineFilter === 'handovers'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assignments ({handoverCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineFilter('holds')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        timelineFilter === 'holds'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Holds & State ({holdCount})</span>
                    </button>
                  </div>

                  <div className="relative pl-6 sm:pl-9 border-l-2 border-slate-200/90 space-y-5 my-4 ml-3 sm:ml-4">
                    {filteredList.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-400 italic">No updates matching the selected filter.</p>
                      </div>
                    ) : (
                      filteredList.map((item, idx) => {
                        const isLast = idx === filteredList.length - 1;
                        const rLower = (item.reason || '').toLowerCase();

                  // Milestone styling & iconography
                  let nodeBg = 'bg-blue-600 ring-blue-100';
                  let tagLabel = 'Stage Update';
                  let tagClass = 'bg-blue-50 text-blue-700 border-blue-200';
                  let NodeIcon = Activity;

                  if (rLower.includes('task created')) {
                    nodeBg = 'bg-indigo-600 ring-indigo-100';
                    tagLabel = 'Task Created';
                    tagClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    NodeIcon = Rocket;
                  } else if (rLower.includes('assigned') || rLower.includes('delegat')) {
                    nodeBg = 'bg-sky-600 ring-sky-100';
                    tagLabel = 'Subtask Assigned';
                    tagClass = 'bg-sky-50 text-sky-700 border-sky-200';
                    NodeIcon = UserPlus;
                  } else if (item.to_status === 'review' || rLower.includes('review') || rLower.includes('submitted')) {
                    nodeBg = 'bg-amber-500 ring-amber-100';
                    tagLabel = 'Submitted for Review';
                    tagClass = 'bg-amber-50 text-amber-800 border-amber-200';
                    NodeIcon = Send;
                  } else if (item.to_status === 'completed' || rLower.includes('completed') || rLower.includes('approval') || rLower.includes('approved')) {
                    nodeBg = 'bg-emerald-600 ring-emerald-100';
                    tagLabel = 'Approved & Completed';
                    tagClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    NodeIcon = CheckCircle2;
                  } else if (item.to_status === 'post_comment' || rLower.includes('returned') || rLower.includes('correction') || rLower.includes('missing details')) {
                    nodeBg = 'bg-rose-600 ring-rose-100';
                    tagLabel = 'Changes Requested';
                    tagClass = 'bg-rose-50 text-rose-700 border-rose-200';
                    NodeIcon = RotateCcw;
                  } else if (item.to_status === 'on_hold' || rLower.includes('hold')) {
                    nodeBg = 'bg-orange-500 ring-orange-100';
                    tagLabel = 'Paused / On Hold';
                    tagClass = 'bg-orange-50 text-orange-700 border-orange-200';
                    NodeIcon = PauseCircle;
                  }

                  // Check if this milestone corresponds to an active parallel subtask branch
                  const matchingActiveBranch = (task.branches || []).find((b) => {
                    if (b.status === 'completed' || b.status === 'cancelled') return false;
                    const bOwnerName = b.owner?.name?.toLowerCase() || '';
                    const bTitle = b.title?.toLowerCase() || '';
                    return (
                      (bOwnerName && rLower.includes(bOwnerName)) ||
                      (bTitle && rLower.includes(bTitle))
                    );
                  });

                  // If task is still open:
                  // 1. Any milestone belonging to an uncompleted active subtask is an active Current Stage.
                  // 2. In single-branch or work-alone mode, the last chronological milestone is the Current Stage.
                  const isCurrentActiveStage =
                    task.status !== 'completed' &&
                    task.status !== 'cancelled' &&
                    (Boolean(matchingActiveBranch) || (isLast && (!task.branches || task.branches.length <= 1)));

                  const isTaskCompleted = isLast && task.status === 'completed';

                  return (
                    <div key={item.id} className="relative group">
                      {/* Rich Milestone Node Icon on the timeline rail */}
                      <div
                        className={`absolute -left-[35px] sm:-left-[47px] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white ${nodeBg} text-white flex items-center justify-center shadow-xs ring-4 transition-transform group-hover:scale-105`}
                      >
                        <NodeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>

                      {/* Milestone Card */}
                      <div
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrentActiveStage
                            ? 'bg-amber-50/40 border-amber-300/80 shadow-xs ring-1 ring-amber-200/50'
                            : isTaskCompleted
                            ? 'bg-emerald-50/40 border-emerald-300/80 shadow-xs ring-1 ring-emerald-200/50'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50/60 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${tagClass} inline-flex items-center gap-1`}>
                              <NodeIcon className="w-2.5 h-2.5" />
                              <span>{tagLabel}</span>
                            </span>

                            <span className="text-xs font-bold text-slate-900">
                              {item.reason || `Transitioned to ${item.to_status.replace('_', ' ')}`}
                            </span>

                            {isCurrentActiveStage && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Current Stage
                              </span>
                            )}

                            {isTaskCompleted && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Completed & Closed
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            {item.changed_at ? new Date(item.changed_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            }) : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {item.changed_by?.name?.charAt(0) || 'S'}
                          </div>
                          <span className="text-slate-400">Action by:</span>
                          <span className="font-semibold text-slate-800">{item.changed_by?.name || 'System'}</span>
                          {item.changed_by?.role && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                              {item.changed_by.role.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}
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

          {(() => {
            const isTaskCreator = task.creator?.id === currentUser?.id;
            const isSubtaskAssignee = !isTaskCreator && Boolean(task.my_branch);
            const sharedAtts = isSubtaskAssignee ? [] : (task.attachments?.filter((a) => !a.task_branch_id) || []);
            const branchAtts = isSubtaskAssignee
              ? (task.my_branch?.attachments?.length ? task.my_branch.attachments : (task.attachments?.filter((a) => a.task_branch_id === task.my_branch?.id) || []))
              : (task.attachments?.filter((a) => a.task_branch_id) || []);

            return (
              <div className="space-y-6">
                {/* Section 1: Shared Task Attachments (Hidden for subtask assignees who only receive their subtask) */}
                {!isSubtaskAssignee && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                        Shared Task Attachments ({sharedAtts.length})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Accessible by all assigned team members
                      </span>
                    </div>

                    {sharedAtts.length > 0 ? (
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                        {sharedAtts.map((att) => (
                          <div key={att.id} className="p-3.5 flex items-center justify-between text-xs bg-white hover:bg-slate-50 transition">
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
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                        No shared attachments uploaded.
                      </p>
                    )}
                  </div>
                )}

                {/* Section 2: Individual / Subtask Assignment Attachments */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                      {isSubtaskAssignee ? 'Your Subtask Attachments' : 'Individual Work Attachments'} ({branchAtts.length})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isSubtaskAssignee ? 'Specific deliverables and reference documents for your subtask' : 'Assigned to specific subtasks'}
                    </span>
                  </div>

                  {branchAtts.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {branchAtts.map((att) => {
                        const branch = task.branches?.find((b) => b.id === att.task_branch_id);
                        return (
                          <div key={att.id} className="p-3.5 flex items-center justify-between text-xs bg-white hover:bg-slate-50 transition">
                            <div className="flex items-center gap-3 truncate">
                              <Paperclip className="w-4 h-4 text-sky-600 shrink-0" />
                              <div>
                                <p className="font-bold text-slate-800 truncate">{att.file_name}</p>
                                <p className="text-[10px] text-slate-400">
                                  {Math.round(att.file_size / 1024)} KB
                                  {branch && !isSubtaskAssignee && (
                                    <span className="font-semibold text-slate-600"> • Scope: {branch.title} ({branch.owner?.name})</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadAttachment(att.id, att.file_name)}
                              disabled={downloadingId === att.id}
                              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{downloadingId === att.id ? 'Downloading...' : 'Download'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                      {isSubtaskAssignee ? 'No individual files attached for your subtask.' : 'No individual attachments assigned.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
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
                    {isWorkAlone ? 'Task Completion & Deliverables' : 'Approve & Complete Task'}
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
                  <span>{submittingFinal ? 'Completing Task...' : 'Approve & Complete Task'}</span>
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
          <div
            className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full flex flex-col overflow-hidden animate-in fade-in duration-150 ${
              assignModalType === 'assign' && assignModalStep === 2
                ? 'max-w-3xl max-h-[92vh]'
                : 'max-w-lg max-h-[90vh]'
            }`}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                {assignModalType === 'assign' && assignModalStep === 2 ? (
                  <button
                    type="button"
                    onClick={() => setAssignModalStep(1)}
                    className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                    title="Back to employee selection"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
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
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {assignModalType === 'collaborate'
                      ? 'Invite Collaborators'
                      : !isCreator && Boolean(task.my_branch)
                      ? (assignModalStep === 1
                        ? 'Delegate Subtask to Teammate - Step 1 of 2'
                        : `Configure Delegated Subtask - Step 2 of 2`)
                      : assignModalStep === 1
                      ? 'Add Assignees to Task - Step 1 of 2'
                      : `Configure Work Allocation (${selectedModalUserIds.length}) - Step 2 of 2`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {assignModalType === 'collaborate'
                      ? 'Select one or more employees to collaborate together on this task.'
                      : !isCreator && Boolean(task.my_branch)
                      ? (assignModalStep === 1
                        ? 'Select a teammate to delegate this subtask to.'
                        : 'Set specific instructions, deliverable requirements, and due date for your teammate.')
                      : assignModalStep === 1
                      ? 'Select employees who will receive individual work allocations.'
                      : 'Set individual instructions, attachments, and sharing permissions for each assignee.'}
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
            {assignModalType === 'assign' && assignModalStep === 2 ? (
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Assignment Option Selector: Subtasks vs Direct Delegation */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Delegation Option for Selected Teammate{selectedModalUserIds.length !== 1 ? 's' : ''}:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: Create Subtasks */}
                    <div
                      onClick={() => setModalDelegationOption('subtasks')}
                      className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                        modalDelegationOption === 'subtasks'
                          ? 'bg-blue-50/80 border-blue-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                          modalDelegationOption === 'subtasks' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {modalDelegationOption === 'subtasks' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>Create Subtasks for Each Teammate</span>
                          {modalDelegationOption === 'subtasks' && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Active</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Break down into distinct subtasks: specify custom subtask titles, instructions, due dates, and individual files.
                        </p>
                      </div>
                    </div>

                    {/* Option 2: Delegate Task Directly */}
                    <div
                      onClick={() => setModalDelegationOption('direct')}
                      className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                        modalDelegationOption === 'direct'
                          ? 'bg-emerald-50/80 border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                          modalDelegationOption === 'direct' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                        }`}
                      >
                        {modalDelegationOption === 'direct' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>Delegate Task Directly (What We Have)</span>
                          {modalDelegationOption === 'direct' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Active</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Do not create subtasks. Directly pass the task and all attached documents as-is to the selected employee{selectedModalUserIds.length !== 1 ? 's' : ''}.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* If Direct Delegation: Confirmation Card (No subtask forms) */}
                {modalDelegationOption === 'direct' && (
                  <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-900">
                        Direct Task Delegation (No Subtasks)
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The task <strong>"{task.my_branch?.title || task.title}"</strong> and all attached documents will be passed directly as-is to the selected teammate{selectedModalUserIds.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedModalUserIds.map((uid) => {
                        const u = allUsersList.find((usr) => usr.id === uid) || { id: uid, name: 'Employee', role: '' };
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                              {u.name?.charAt(0) || 'E'}
                            </span>
                            <span>{u.name}</span>
                            {u.department && <span className="text-[10px] text-slate-400 font-normal">({u.department.name})</span>}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 italic pt-1">
                      ✓ No subtask forms required. Click "Delegate Task Directly" below to confirm and pass the task immediately.
                    </p>
                  </div>
                )}

                {/* If Subtasks: Individual Work Allocation Form Cards */}
                {modalDelegationOption === 'subtasks' && (
                  <div className="space-y-4">
                    {selectedModalUserIds.map((uid) => {
                      const u = allUsersList.find((usr) => usr.id === uid) || { id: uid, name: 'Employee', email: '' };
                      const work = modalAssigneeWork[uid] || initModalWork(u);

                      return (
                        <div
                          key={uid}
                          className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition hover:border-slate-300"
                        >
                          {/* Card Header */}
                          <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {u.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900 truncate">{u.name}</span>
                                  {u.department && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200/70 text-slate-700 font-medium">
                                      {u.department.name}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 truncate block">{u.email}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                toggleModalUser(uid);
                                if (selectedModalUserIds.length <= 1) {
                                  setAssignModalStep(1);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 text-[11px]"
                              title="Remove assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Remove</span>
                            </button>
                          </div>

                          {/* Card Form */}
                          <div className="p-4 space-y-3.5">
                            {/* Subtask Title & Due Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                  <span>Subtask / Allocation Title</span>
                                  <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={work.title}
                                  onChange={(e) => updateModalWork(uid, { title: e.target.value })}
                                  placeholder="e.g. Develop APIs / UI Module"
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                  <span>Due Date</span>
                                  <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={work.due_date}
                                  max={task?.due_date ? task.due_date.split('T')[0] : undefined}
                                  onChange={(e) => updateModalWork(uid, { due_date: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                />
                              </div>
                            </div>

                          {/* Individual Note & Description */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <span>Individual Work Note / Instructions</span>
                                <span className="text-rose-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateModalWork(uid, {
                                    description: task.my_branch?.description || task.description || '',
                                  })
                                }
                                className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                title="Copy parent task description as a starting point"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Copy Current Instructions</span>
                              </button>
                            </div>
                            <textarea
                              rows={3}
                              value={work.description}
                              onChange={(e) => updateModalWork(uid, { description: e.target.value })}
                              placeholder="Detail the specific tasks, instructions, or delegation details for this assignee..."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-y"
                            />
                          </div>

                          {/* Individual Attachments for this subtask */}
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                <span>Individual Subtask Attachments</span>
                              </label>
                              <label
                                htmlFor={`subtask-file-upload-${uid}`}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Files</span>
                              </label>
                              <input
                                id={`subtask-file-upload-${uid}`}
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                onChange={(e) => handleModalFileChange(uid, e)}
                                className="hidden"
                              />
                            </div>

                            {work.files && work.files.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {work.files.map((file, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate font-medium text-slate-800 text-[11px]">
                                        {file.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 shrink-0">
                                        ({Math.round(file.size / 1024)} KB)
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeModalFile(uid, fIdx)}
                                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                      title="Remove attachment"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">
                                No individual files attached yet for {u.name}.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
              /* Step 1 User Selection (or Collaborate Selection) */
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
                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                        filtered.forEach((u) => {
                          setModalAssigneeWork((mPrev) => ({
                            ...mPrev,
                            [u.id]: mPrev[u.id] || initModalWork(u),
                          }));
                        });
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
                      const alreadyBranchOwner = task.branches?.some((b) => b.owner?.id === u.id && b.status !== 'cancelled');
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
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 font-medium">
                                  Already Assigned
                                </span>
                                {(() => {
                                  const bOwner = task.branches?.find((b) => b.owner?.id === u.id && b.status !== 'cancelled');
                                  const canReassign =
                                    bOwner &&
                                    (currentUser?.role === 'admin' ||
                                      currentUser?.role === 'sub_admin' ||
                                      task.creator?.id === currentUser?.id ||
                                      bOwner.assigned_by?.id === currentUser?.id) &&
                                    task.status !== 'completed' &&
                                    task.status !== 'cancelled' &&
                                    bOwner.status !== 'completed' &&
                                    bOwner.status !== 'cancelled';
                                  if (!canReassign) return null;
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAssignModalOpen(false);
                                        openReassignModal(bOwner);
                                      }}
                                      className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer flex items-center gap-1"
                                      title="Click to reassign or withdraw this member's work"
                                    >
                                      <ArrowRightLeft className="w-2.5 h-2.5" />
                                      <span>Reassign</span>
                                    </button>
                                  );
                                })()}
                              </div>
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
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2.5">
              <div>
                {assignModalType === 'assign' && assignModalStep === 2 ? (
                  <button
                    type="button"
                    onClick={() => setAssignModalStep(1)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Selection</span>
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
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
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                    assignModalType === 'collaborate'
                      ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'
                      : modalDelegationOption === 'direct' && assignModalStep === 2
                      ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
                      : 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300'
                  }`}
                >
                  {submittingModal ? (
                    'Saving...'
                  ) : assignModalType === 'assign' && assignModalStep === 1 ? (
                    <>
                      <span>Next: Choose Option & Work ({selectedModalUserIds.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : assignModalType === 'assign' && modalDelegationOption === 'direct' ? (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Delegate Task Directly ({selectedModalUserIds.length})</span>
                    </>
                  ) : assignModalType === 'assign' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create Subtasks & Assign ({selectedModalUserIds.length})</span>
                    </>
                  ) : (
                    <span>Confirm Invitation ({selectedModalUserIds.length})</span>
                  )}
                </button>
              </div>
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

      {/* Reassign Assignment Modal */}
      {isReassignModalOpen && reassignBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 text-slate-800 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reassign Assignment</h3>
                  <p className="text-xs text-slate-500">
                    Manage work allocated to{' '}
                    <span className="font-semibold text-slate-700">{reassignBranch.owner?.name || 'Assignee'}</span>
                    {' '}• "{reassignBranch.title}"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReassignModalOpen(false);
                  setReassignBranch(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {reassignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reassignError}</span>
              </div>
            )}

            {/* Option Selector: The two options requested */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
              <div
                onClick={() => setReassignOption('transfer')}
                className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                  reassignOption === 'transfer'
                    ? 'bg-blue-50/80 border-blue-600 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                    reassignOption === 'transfer' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}
                >
                  {reassignOption === 'transfer' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Transfer to Another Person</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Select a replacement employee to take over this subtask and deliverables.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setReassignOption('cancel')}
                className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                  reassignOption === 'cancel'
                    ? 'bg-rose-50/80 border-rose-600 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                    reassignOption === 'cancel' ? 'border-rose-600 bg-rose-600' : 'border-slate-300'
                  }`}
                >
                  {reassignOption === 'cancel' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Cancel / Remove Assignment</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Withdraw the work from this assignee so it no longer blocks completion.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {reassignOption === 'transfer' ? (
                <>
                  {/* Current Assignee Banner */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {reassignBranch.owner?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Currently Assigned To</span>
                        <span className="font-bold text-slate-800">{reassignBranch.owner?.name || 'Unassigned'}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({reassignBranch.owner?.email || ''})</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200/60 text-slate-600 font-medium capitalize">
                      {reassignBranch.status?.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Search and Select Replacement Employee */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Select Replacement Employee <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={reassignSearch}
                        onChange={(e) => setReassignSearch(e.target.value)}
                        placeholder="Search replacement by name, email, or department..."
                        className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      {reassignSearch && (
                        <button
                          type="button"
                          onClick={() => setReassignSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200/80 rounded-xl p-1.5 max-h-48 overflow-y-auto divide-y divide-slate-100 space-y-1">
                      {allUsersList
                        .filter((u) => u.id !== reassignBranch.owner?.id)
                        .filter(
                          (u) =>
                            !reassignSearch ||
                            u.name.toLowerCase().includes(reassignSearch.toLowerCase()) ||
                            u.email?.toLowerCase().includes(reassignSearch.toLowerCase()) ||
                            u.department?.name?.toLowerCase().includes(reassignSearch.toLowerCase()) ||
                            u.role?.toLowerCase().includes(reassignSearch.toLowerCase())
                        )
                        .map((u) => {
                          const isSelected = reassignNewOwnerId === u.id;
                          const hasOtherBranch = task?.branches?.some((b) => b.owner?.id === u.id && b.id !== reassignBranch.id);

                          return (
                            <div
                              key={u.id}
                              onClick={() => setReassignNewOwnerId(u.id)}
                              className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                                isSelected
                                  ? 'bg-blue-50/90 border border-blue-200 text-blue-900 font-medium'
                                  : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {u.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <span className="font-bold">{u.name}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {u.email} {u.department ? `• ${u.department.name}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {hasOtherBranch && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 font-medium">
                                    Has other subtask
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

                  {/* Transfer Reason */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Reason for Transfer <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      placeholder="e.g. Current assignee has an urgent personal issue/leave; transferring work to maintain timeline..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      The replacement assignee will immediately receive this subtask with all existing instructions, deadlines, and attachments intact.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* Cancel / Withdraw Option Body */}
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-900">Withdraw Work Allocation</h4>
                        <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                          You are withdrawing subtask <span className="font-bold">"{reassignBranch.title}"</span> from{' '}
                          <span className="font-bold">{reassignBranch.owner?.name || 'this assignee'}</span>.
                          This person will be removed from the active team members list. Both the assignment and cancellation events are permanently preserved in Work Logs & Activity history.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Reason for Withdrawal <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      placeholder="e.g. Assignee unavailable due to emergency; subtask scope withdrawn..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>This person's card will be removed from active team members, and the cancellation will be permanently logged in Work Logs & Activity feed.</span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsReassignModalOpen(false);
                  setReassignBranch(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              {reassignOption === 'transfer' ? (
                <button
                  type="button"
                  onClick={handleConfirmReassign}
                  disabled={reassignSubmitting || !reassignNewOwnerId}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{reassignSubmitting ? 'Transferring...' : 'Confirm Transfer'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmReassign}
                  disabled={reassignSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>{reassignSubmitting ? 'Withdrawing...' : 'Withdraw Assignment'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reopen Task Confirmation Modal */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reopen Task</h3>
                  <p className="text-xs text-slate-500">Return task to active in-progress workflow</p>
                </div>
              </div>
              <button
                onClick={() => { setIsReopenModalOpen(false); setReopenReason(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reopenError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reopenError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Reopening <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Explain why this task is being reopened (optional)..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This will move the task status back to "In Progress" and allow work, submissions, and reviews to continue.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setIsReopenModalOpen(false); setReopenReason(''); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Nevermind
              </button>
              <button
                type="button"
                onClick={handleConfirmReopen}
                disabled={reopeningTask}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{reopeningTask ? 'Reopening Task...' : 'Confirm Reopen'}</span>
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
