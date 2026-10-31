import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../../api/tasks';
import { usersApi } from '../../api/users';
import { departmentsApi } from '../../api/departments';
import { useAuth } from '../auth/AuthContext';
import {
  User,
  UserPlus,
  Users,
  Check,
  ArrowRight,
  ArrowLeft,
  Paperclip,
  X,
  Sparkles,
  AlertCircle,
  Plus,
  Search,
  Lock,
  Copy,
  Trash2,
  Edit3,
  Send,
} from 'lucide-react';

interface IndividualAssignment {
  title: string;
  description: string;
  expected_result: string;
  acceptance_criteria: string;
  start_date: string;
  due_date: string;
  files: File[];
  share_main_task_details: boolean;
  can_assign_further: boolean;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const CreateTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Wizard Step: 1 = Basic Details, 2 = Assignment, 3 = Review & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form Data (Step 1)
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [description, setDescription] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Shared Files (Step 1)
  const [sharedFiles, setSharedFiles] = useState<File[]>([]);

  // Handling Method (Step 2)
  const [handlingMethod, setHandlingMethod] = useState<'work_alone' | 'assign' | 'collaborate'>('work_alone');

  // Assign mode: 'single' for 1 employee, 'multiple' for 2+ employees
  const [assignMode, setAssignMode] = useState<'single' | 'multiple'>('single');

  // Delegation option: 'subtasks' (create subtasks) or 'direct' (delegate directly without subtasks)
  const [delegationOption, setDelegationOption] = useState<'subtasks' | 'direct'>('subtasks');

  // Selected Users
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  // Individual distinct work per assignee/collaborator (Strict Peer Isolation)
  const [assigneeWork, setAssigneeWork] = useState<Record<number, IndividualAssignment>>({});

  // Removal confirmation modal state
  const [userToRemove, setUserToRemove] = useState<any | null>(null);

  // Metadata options
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [uRes, dRes] = await Promise.all([
        usersApi.list({ per_page: 100 }),
        departmentsApi.list({ is_active: true, per_page: 50 }),
      ]);
      setAllUsers(uRes.data || []);
      setDepartments(dRes.data || []);
    } catch (err) {
      console.error('Failed to load form options', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileTypeBadge = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
    let bg = 'bg-slate-100 text-slate-700';
    if (ext === 'PDF') bg = 'bg-rose-100 text-rose-700';
    else if (['DOC', 'DOCX'].includes(ext)) bg = 'bg-blue-100 text-blue-700';
    else if (['XLS', 'XLSX'].includes(ext)) bg = 'bg-emerald-100 text-emerald-700';
    else if (['PNG', 'JPG', 'JPEG'].includes(ext)) bg = 'bg-amber-100 text-amber-700';
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${bg}`}>
        {ext}
      </span>
    );
  };

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type ${ext} is not supported. Supported types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} exceeds the maximum size of 10MB.`;
    }
    return null;
  };

  const handleSharedFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      for (const f of newFiles) {
        const err = validateFile(f);
        if (err) {
          setError(err);
          return;
        }
      }
      setSharedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeSharedFile = (index: number) => {
    setSharedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const initAssignmentForUser = (user: any): IndividualAssignment => ({
    title: title.trim() ? `${title.trim()} - ${user.name}` : `${user.name}'s Scope`,
    description: '',
    expected_result: '',
    acceptance_criteria: '',
    start_date: startDate || '',
    due_date: dueDate || '',
    files: [],
    share_main_task_details: false,
    can_assign_further: true,
  });

  // Select a single user
  const selectSingleUser = (user: any) => {
    setSelectedUsers([user]);
    setAssigneeWork((prev) => ({
      ...prev,
      [user.id]: prev[user.id] || initAssignmentForUser(user),
    }));
  };

  // Check if an assignment has entered data
  const hasEnteredData = (userId: number): boolean => {
    const work = assigneeWork[userId];
    if (!work) return false;
    const user = selectedUsers.find((u) => u.id === userId);
    const defaultTitle1 = `${title.trim()} - ${user?.name}`;
    const defaultTitle2 = `${user?.name}'s Scope`;
    const hasCustomTitle = work.title.trim() !== '' && work.title !== defaultTitle1 && work.title !== defaultTitle2;
    const hasCustomDesc = work.description.trim() !== '';
    const hasCustomExpected = work.expected_result.trim() !== '';
    const hasCustomCriteria = work.acceptance_criteria.trim() !== '';
    const hasFiles = work.files.length > 0;
    return hasCustomTitle || hasCustomDesc || hasCustomExpected || hasCustomCriteria || hasFiles;
  };

  const requestRemoveUser = (user: any) => {
    if (hasEnteredData(user.id)) {
      setUserToRemove(user);
    } else {
      executeRemoveUser(user.id);
    }
  };

  const executeRemoveUser = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
    setAssigneeWork((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setUserToRemove(null);
  };

  // Toggle user selection (for multiple assignees or collaborate mode)
  const toggleUserSelection = (user: any) => {
    const isAlreadySelected = selectedUsers.some((u) => u.id === user.id);
    if (isAlreadySelected) {
      requestRemoveUser(user);
    } else {
      setSelectedUsers((prev) => [...prev, user]);
      setAssigneeWork((prev) => ({
        ...prev,
        [user.id]: prev[user.id] || initAssignmentForUser(user),
      }));
    }
  };

  // Individual Card Actions
  const handleCopySharedInstructions = (userId: number) => {
    setAssigneeWork((prev) => {
      const cur = prev[userId] || initAssignmentForUser(selectedUsers.find((u) => u.id === userId));
      return {
        ...prev,
        [userId]: {
          ...cur,
          description: description || cur.description,
          expected_result: expectedResult || cur.expected_result,
          acceptance_criteria: acceptanceCriteria || cur.acceptance_criteria,
        },
      };
    });
  };

  const handleClearAssignment = (userId: number) => {
    const user = selectedUsers.find((u) => u.id === userId);
    setAssigneeWork((prev) => ({
      ...prev,
      [userId]: {
        title: title.trim() ? `${title.trim()} - ${user?.name}` : `${user?.name}'s Scope`,
        description: '',
        expected_result: '',
        acceptance_criteria: '',
        start_date: startDate || '',
        due_date: dueDate || '',
        files: [],
        share_main_task_details: false,
        can_assign_further: true,
      },
    }));
  };

  const handleIndividualFilesChange = (userId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      for (const f of newFiles) {
        const err = validateFile(f);
        if (err) {
          setError(err);
          return;
        }
      }
      setAssigneeWork((prev) => {
        const cur = prev[userId] || initAssignmentForUser(selectedUsers.find((u) => u.id === userId));
        return {
          ...prev,
          [userId]: {
            ...cur,
            files: [...cur.files, ...newFiles],
          },
        };
      });
    }
  };

  const removeIndividualFile = (userId: number, fileIdx: number) => {
    setAssigneeWork((prev) => {
      const cur = prev[userId];
      if (!cur) return prev;
      return {
        ...prev,
        [userId]: {
          ...cur,
          files: cur.files.filter((_, i) => i !== fileIdx),
        },
      };
    });
  };

  const handleNextStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!title.trim()) {
        setError('Task Title is required.');
        return;
      }
      if (!description.trim()) {
        setError('Main Task Description is required.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (handlingMethod === 'assign') {
        if (selectedUsers.length === 0) {
          setError('Please select at least one employee to assign.');
          return;
        }
        if (assignMode === 'multiple' && selectedUsers.length < 2) {
          setError('Multiple Assignees mode requires selecting 2 or more employees.');
          return;
        }
        // Validate individual assignment fields if creating subtasks
        if (delegationOption === 'subtasks') {
          for (const u of selectedUsers) {
            const work = assigneeWork[u.id];
            if (!work || !work.title.trim()) {
              setError(`Subtask Title is required for ${u.name}.`);
              return;
            }
            if (!work.description.trim()) {
              setError(`Individual Description is required for ${u.name}.`);
              return;
            }
            if (!work.due_date && !dueDate) {
              setError(`Due Date is required for ${u.name}.`);
              return;
            }
          }
        }
      } else if (handlingMethod === 'collaborate') {
        if (selectedUsers.length === 0) {
          setError('Please select at least one collaborator to invite.');
          return;
        }
        if (delegationOption === 'subtasks') {
          for (const u of selectedUsers) {
            const work = assigneeWork[u.id];
            if (!work || !work.title.trim()) {
              setError(`Subtask Title is required for ${u.name}.`);
              return;
            }
          }
        }
      }
      setCurrentStep(3);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (expectedResult.trim()) formData.append('expected_result', expectedResult.trim());
      if (acceptanceCriteria.trim()) formData.append('acceptance_criteria', acceptanceCriteria.trim());
      formData.append('handling_method', handlingMethod);
      formData.append('priority', priority);
      if (departmentId) formData.append('department_id', String(departmentId));
      if (startDate) formData.append('start_date', startDate);
      if (dueDate) formData.append('due_date', dueDate);

      // Shared Attachments
      sharedFiles.forEach((file) => {
        formData.append('shared_files[]', file);
        formData.append('files[]', file); // Backwards compatibility
      });

      if (handlingMethod === 'assign' || handlingMethod === 'collaborate') {
        selectedUsers.forEach((u) => {
          formData.append('assignees[]', String(u.id));
          if (handlingMethod === 'collaborate') {
            formData.append('collaborators[]', String(u.id));
          }
        });

        if (delegationOption === 'direct') {
          formData.append('delegation_mode', 'direct');
        } else {
          selectedUsers.forEach((u, idx) => {
            const work = assigneeWork[u.id] || initAssignmentForUser(u);
            formData.append(`branches[${idx}][owner_id]`, String(u.id));
            formData.append(`branches[${idx}][title]`, work.title.trim() || `${u.name}'s Scope`);
            formData.append(`branches[${idx}][description]`, work.description.trim() || description.trim());
            if (work.expected_result.trim()) {
              formData.append(`branches[${idx}][expected_result]`, work.expected_result.trim());
            }
            if (work.acceptance_criteria.trim()) {
              formData.append(`branches[${idx}][acceptance_criteria]`, work.acceptance_criteria.trim());
            }
            if (work.start_date) {
              formData.append(`branches[${idx}][start_date]`, work.start_date);
            }
            if (work.due_date || dueDate) {
              formData.append(`branches[${idx}][due_date]`, work.due_date || dueDate);
            }

            // Individual branch files
            if (work.files && work.files.length > 0) {
              work.files.forEach((bf) => {
                formData.append(`branches[${idx}][files][]`, bf);
                formData.append(`branch_files[${u.id}][]`, bf);
              });
            }
          });
        }
      }

      const result = await tasksApi.create(formData);
      navigate(`/tasks/${result.id}`);
    } catch (err: any) {
      const serverMsg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : err.response?.data?.message || 'Failed to create task. Please check all fields.';
      setError(serverMsg);
      setLoading(false);
    }
  };

  const eligibleUsers = allUsers.filter((u) => u.id !== currentUser?.id);

  const filteredUsers = eligibleUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.department?.name && u.department.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.role && u.role.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/')}>Dashboard</span>
          <span>›</span>
          <span className="text-slate-700 font-semibold">Create Task</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Task</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Assign one main task to multiple employees with distinct work, private attachments, and individual deliverables.
        </p>
      </div>

      {/* Stepper Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {/* Step 1 */}
          <div
            onClick={() => setCurrentStep(1)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep >= 1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <span className={`text-xs font-semibold ${currentStep === 1 ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
              Basic Details
            </span>
          </div>

          <div className={`h-0.5 w-16 sm:w-24 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'} transition-colors`} />

          {/* Step 2 */}
          <div
            onClick={() => {
              if (title.trim() && description.trim()) setCurrentStep(2);
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep >= 2 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <span className={`text-xs font-semibold ${currentStep === 2 ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
              2. Assign Teammates
            </span>
          </div>

          <div className={`h-0.5 w-16 sm:w-24 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'} transition-colors`} />

          {/* Step 3 */}
          <div
            onClick={() => {
              if (title.trim() && description.trim() && selectedUsers.length > 0) setCurrentStep(3);
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep === 3 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </div>
            <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
              3. Review & Create
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1 - BASIC DETAILS                                   */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Task Information</h2>
            <span className="text-[11px] text-slate-400">* Required fields</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Task Title *</label>
              <input
                type="text"
                placeholder="e.g. Develop Employee Management Module"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Main Task Description *</label>
            <textarea
              rows={4}
              placeholder="Provide a comprehensive overview of this project or main task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Expected Deliverable <span className="text-slate-500 font-normal">(What needs to be produced?)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe the final output, report, or deliverable needed..."
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Completion Checklist <span className="text-slate-500 font-normal">(How to verify it is done?)</span>
              </label>
              <textarea
                rows={3}
                placeholder="List simple checklist items or requirements to verify..."
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Department (Optional)</label>
              <select
                value={departmentId || ''}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Main Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Shared Attachments & Instructions Section */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>Shared Attachments & Instructions</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  These instructions and files are shared with everyone assigned to this task.
                </p>
              </div>
              {sharedFiles.length > 0 && (
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {sharedFiles.length} file{sharedFiles.length !== 1 ? 's' : ''} added
                </span>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center hover:bg-slate-50/50 transition">
              <input
                type="file"
                multiple
                id="shared-file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={handleSharedFilesChange}
                className="hidden"
              />
              <label htmlFor="shared-file-upload" className="cursor-pointer block">
                <Paperclip className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <span className="text-xs font-semibold text-blue-600 hover:underline">Upload Shared Files</span>
                <span className="text-xs text-slate-400"> (PDF, DOC/DOCX, XLS/XLSX, PNG, JPG up to 10MB)</span>
              </label>
            </div>

            {sharedFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {sharedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getFileTypeBadge(file.name)}
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 truncate text-[11px]">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSharedFile(i)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>Next: Assignment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2 - ASSIGNMENT (1-to-Many)                          */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">How would you like to handle this task?</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose whether you are completing this task yourself, assigning distinct work to teammates, or collaborating together.
            </p>
          </div>

          {/* 3 Selectable Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Work Alone */}
            <div
              onClick={() => {
                setHandlingMethod('work_alone');
                setSelectedUsers([]);
              }}
              className={`p-5 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[190px] ${
                handlingMethod === 'work_alone'
                  ? 'border-blue-600 bg-blue-50/20 shadow-md shadow-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">👤 I'll Do It Myself</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Solo task. You will complete all work yourself without assigning to others.
                </p>
              </div>
              <div className="mt-3">
                <span
                  className={`inline-block w-4 h-4 rounded-full border-2 ${
                    handlingMethod === 'work_alone' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* 2. Assign to Teammates */}
            <div
              onClick={() => setHandlingMethod('assign')}
              className={`p-5 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[190px] ${
                handlingMethod === 'assign'
                  ? 'border-blue-600 bg-blue-50/20 shadow-md shadow-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">👉 Assign to Teammates</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Hand over work to <strong>one or more colleagues</strong> with clear deliverables and due dates.
                </p>
              </div>
              <div className="mt-3">
                <span
                  className={`inline-block w-4 h-4 rounded-full border-2 ${
                    handlingMethod === 'assign' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* 3. Collaborate with Team */}
            <div
              onClick={() => setHandlingMethod('collaborate')}
              className={`p-5 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[190px] ${
                handlingMethod === 'collaborate'
                  ? 'border-blue-600 bg-blue-50/20 shadow-md shadow-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">🤝 Work as a Team</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Invite <strong>teammates to collaborate together</strong> with shared progress tracking.
                </p>
              </div>
              <div className="mt-3">
                <span
                  className={`inline-block w-4 h-4 rounded-full border-2 ${
                    handlingMethod === 'collaborate' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Teammates Selection Section (Assign or Collaborate) */}
          {(handlingMethod === 'assign' || handlingMethod === 'collaborate') && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    {handlingMethod === 'assign' ? (
                      <UserPlus className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Users className="w-4 h-4 text-purple-600" />
                    )}
                    <span>{handlingMethod === 'assign' ? 'Select Assignee(s)' : 'Select Collaborator(s)'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select the employees who will be assigned distinct scopes under this main task.
                  </p>
                </div>

                {/* Mode Selector: Single vs Multiple */}
                {handlingMethod === 'assign' && (
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignMode('single');
                        if (selectedUsers.length > 1) {
                          setSelectedUsers([selectedUsers[0]]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        assignMode === 'single'
                          ? 'bg-white text-blue-600 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Single Assignee (1 Person)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignMode('multiple')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        assignMode === 'multiple'
                          ? 'bg-white text-blue-600 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Multiple Assignees (1-to-Many)
                    </button>
                  </div>
                )}
              </div>

              {/* Real-time Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employees by name, email, department, or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Employee Selection List */}
              <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No matching employees found.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUsers.some((sel) => sel.id === u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (handlingMethod === 'assign' && assignMode === 'single') {
                            selectSingleUser(u);
                          } else {
                            toggleUserSelection(u);
                          }
                        }}
                        className={`p-3 transition cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? handlingMethod === 'assign'
                              ? 'bg-sky-50/70 border-l-4 border-l-sky-600'
                              : 'bg-purple-50/70 border-l-4 border-l-purple-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                              isSelected
                                ? handlingMethod === 'assign'
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {u.email} • <span className="capitalize">{u.role?.replace('_', ' ')}</span>
                              {u.department && ` • ${u.department.name}`}
                            </p>
                          </div>
                        </div>

                        <div>
                          {handlingMethod === 'assign' && assignMode === 'single' ? (
                            <span
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                                isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </span>
                          ) : (
                            <span
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                                isSelected
                                  ? handlingMethod === 'assign'
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-purple-600 bg-purple-600 text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Employee Summary Count */}
              {selectedUsers.length > 0 && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-slate-700">
                    {selectedUsers.length} employee{selectedUsers.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const hasAnyData = selectedUsers.some((u) => hasEnteredData(u.id));
                      if (hasAnyData) {
                        if (window.confirm('Clear all selected employees and discard entered subtask details?')) {
                          setSelectedUsers([]);
                          setAssigneeWork({});
                        }
                      } else {
                        setSelectedUsers([]);
                        setAssigneeWork({});
                      }
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* ======================================================== */}
              {/* ASSIGNMENT MODE: SUBTASKS VS DIRECT DELEGATION           */}
              {/* ======================================================== */}
              {selectedUsers.length > 0 && (
                <div className="pt-6 border-t border-slate-100 space-y-5">
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Assignment Option for Selected Employee{selectedUsers.length !== 1 ? 's' : ''}:
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Create Subtasks */}
                      <div
                        onClick={() => setDelegationOption('subtasks')}
                        className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                          delegationOption === 'subtasks'
                            ? 'bg-blue-50/80 border-blue-600 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                            delegationOption === 'subtasks' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                          }`}
                        >
                          {delegationOption === 'subtasks' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                            <span>Create Subtasks for Each Employee</span>
                            {delegationOption === 'subtasks' && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Active</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Allocate separate work: provide distinct subtask titles, individual descriptions, due dates, and attachments for each employee.
                          </p>
                        </div>
                      </div>

                      {/* Option 2: Delegate Directly (What Was Created) */}
                      <div
                        onClick={() => setDelegationOption('direct')}
                        className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                          delegationOption === 'direct'
                            ? 'bg-emerald-50/80 border-emerald-600 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                            delegationOption === 'direct' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                          }`}
                        >
                          {delegationOption === 'direct' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                            <span>Delegate Task Directly (What Created)</span>
                            {delegationOption === 'direct' && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Active</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Do not create subtasks. Directly pass the main task and all shared documents as-is to the selected employee{selectedUsers.length !== 1 ? 's' : ''}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* If Direct Delegation: Confirmation Card (No subtask form needed) */}
                  {delegationOption === 'direct' && (
                    <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Direct Task Delegation (No Subtasks)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        The main task <strong>"{title || 'Untitled Task'}"</strong> and all shared documents will be delegated directly to the selected employee{selectedUsers.length !== 1 ? 's' : ''}:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedUsers.map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                              {u.name.charAt(0)}
                            </span>
                            <span>{u.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({u.role?.replace('_', ' ')})</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        ✓ No subtask forms required. Click "Next: Review & Submit" to verify and create the task.
                      </p>
                    </div>
                  )}

                  {/* If Subtasks Option: Render Individual Work Allocation */}
                  {delegationOption === 'subtasks' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-blue-600" />
                              <span>Individual Work Allocation (Subtasks)</span>
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>Strict Peer Isolation</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Each employee receives separate work instructions, private attachments, and deliverables. They will never see each other's work or files.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              selectedUsers.forEach((u) => handleCopySharedInstructions(u.id));
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                            title="Copy main task description & criteria to all"
                          >
                            Copy Shared to All
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Assignment Cards for each employee */}
                      <div className="space-y-5">
                    {selectedUsers.map((u, idx) => {
                      const work = assigneeWork[u.id] || initAssignmentForUser(u);

                      return (
                        <div
                          key={u.id}
                          className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4 transition hover:border-blue-400 shadow-2xs"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                  <span>{u.name}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Subtask #{idx + 1}
                                  </span>
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                  {u.department ? u.department.name : 'No Department'} • <span className="capitalize">{u.role?.replace('_', ' ')}</span>
                                </p>
                              </div>
                            </div>

                            {/* Card Header Actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopySharedInstructions(u.id)}
                                className="px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer flex items-center gap-1"
                                title="Copy main task description, expected result, and criteria"
                              >
                                <Copy className="w-3 h-3" />
                                <span className="hidden sm:inline">Copy Shared Instructions</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClearAssignment(u.id)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                                title="Clear assignment fields"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => requestRemoveUser(u)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Remove assignment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Subtask Title & Due Date */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-1">
                              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <span>Subtask Title</span>
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={work.title}
                                onChange={(e) =>
                                  setAssigneeWork((prev) => ({
                                    ...prev,
                                    [u.id]: { ...work, title: e.target.value },
                                  }))
                                }
                                placeholder={`e.g. Create Employee API, Create Employee UI`}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <span>Individual Due Date</span>
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={work.due_date}
                                onChange={(e) =>
                                  setAssigneeWork((prev) => ({
                                    ...prev,
                                    [u.id]: { ...work, due_date: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                              />
                            </div>
                          </div>

                          {/* Individual Description */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <span>Individual Description</span>
                                <span className="text-red-500">*</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">Private to {u.name}</span>
                            </label>
                            <textarea
                              rows={3}
                              value={work.description}
                              onChange={(e) =>
                                setAssigneeWork((prev) => ({
                                  ...prev,
                                  [u.id]: { ...work, description: e.target.value },
                                }))
                              }
                              placeholder={`Describe the distinct work, requirements, and scope assigned specifically to ${u.name}...`}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                            />
                          </div>

                          {/* Expected Result & Acceptance Criteria */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700">Expected Result</label>
                              <textarea
                                rows={2}
                                value={work.expected_result}
                                onChange={(e) =>
                                  setAssigneeWork((prev) => ({
                                    ...prev,
                                    [u.id]: { ...work, expected_result: e.target.value },
                                  }))
                                }
                                placeholder="Expected deliverable from this employee..."
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700">Acceptance Criteria</label>
                              <textarea
                                rows={2}
                                value={work.acceptance_criteria}
                                onChange={(e) =>
                                  setAssigneeWork((prev) => ({
                                    ...prev,
                                    [u.id]: { ...work, acceptance_criteria: e.target.value },
                                  }))
                                }
                                placeholder="Validation criteria for this subtask..."
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                              />
                            </div>
                          </div>

                          {/* Individual Attachments */}
                          <div className="space-y-2 pt-2 border-t border-slate-200/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Paperclip className="w-3 h-3 text-slate-500" />
                                <span>Individual Subtask Attachments for {u.name}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">Private to {u.name}</span>
                            </div>

                            <div className="border border-dashed border-slate-200 rounded-xl p-3 text-center bg-white hover:bg-slate-50/50 transition">
                              <input
                                type="file"
                                multiple
                                id={`file-upload-${u.id}`}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                onChange={(e) => handleIndividualFilesChange(u.id, e)}
                                className="hidden"
                              />
                              <label htmlFor={`file-upload-${u.id}`} className="cursor-pointer block text-xs">
                                <span className="font-semibold text-blue-600 hover:underline">
                                  + Upload Individual Attachment for {u.name}
                                </span>
                                <span className="text-slate-400"> (Private to {u.name})</span>
                              </label>
                            </div>

                            {/* Individual files list */}
                            {work.files && work.files.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {work.files.map((file, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {getFileTypeBadge(file.name)}
                                      <div className="truncate">
                                        <p className="font-semibold text-slate-800 truncate text-[11px]">{file.name}</p>
                                        <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeIndividualFile(u.id, fIdx)}
                                      className="text-slate-400 hover:text-red-500 p-1"
                                      title="Remove attachment"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* + Add Another Subtask Button */}
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const unselected = eligibleUsers.find((u) => !selectedUsers.some((sel) => sel.id === u.id));
                        if (unselected) {
                          toggleUserSelection(unselected);
                        } else {
                          const searchInput = document.querySelector('input[placeholder*="Search employees"]') as HTMLInputElement;
                          if (searchInput) {
                            searchInput.focus();
                          }
                        }
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer border border-slate-200 hover:border-blue-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Another Subtask</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>Next: Review & Submit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3 - REVIEW & SUBMIT                                 */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Review & Submit</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify the main task details and individual subtask allocations before creating the task.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Ready to Create
            </span>
          </div>

          {/* Main Task Summary */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Main Task Summary
              </h3>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Main Task</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="font-bold text-slate-500 block">Title:</span>
                <span className="font-bold text-slate-900 text-sm">{title}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Handling Method:</span>
                <span className="font-bold text-blue-600 uppercase tracking-wide">
                  {handlingMethod === 'assign'
                    ? `Assign (${selectedUsers.length} Assignee${selectedUsers.length > 1 ? 's' : ''})`
                    : handlingMethod === 'collaborate'
                    ? `Collaborate (${selectedUsers.length} Collaborator${selectedUsers.length > 1 ? 's' : ''})`
                    : 'Work Solo'}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Priority:</span>
                <span className="font-bold text-slate-800 capitalize">{priority}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Due Date:</span>
                <span className="font-medium text-slate-800">{dueDate || 'Not set'}</span>
              </div>
              {startDate && (
                <div>
                  <span className="font-bold text-slate-500 block">Start Date:</span>
                  <span className="font-medium text-slate-800">{startDate}</span>
                </div>
              )}
              {departmentId && (
                <div>
                  <span className="font-bold text-slate-500 block">Department:</span>
                  <span className="font-medium text-slate-800">
                    {departments.find((d) => d.id === departmentId)?.name || 'Selected'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-500 block mb-1">Main Task Description:</span>
              <p className="text-slate-700 whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200">
                {description}
              </p>
            </div>

            {expectedResult && (
              <div>
                <span className="font-bold text-slate-500 block mb-1">Expected Result:</span>
                <p className="text-slate-700 whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-slate-200">
                  {expectedResult}
                </p>
              </div>
            )}

            {acceptanceCriteria && (
              <div>
                <span className="font-bold text-slate-500 block mb-1">Acceptance Criteria:</span>
                <p className="text-slate-700 whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-slate-200">
                  {acceptanceCriteria}
                </p>
              </div>
            )}

            {sharedFiles.length > 0 && (
              <div>
                <span className="font-bold text-slate-500 block mb-1.5">Shared Attachments:</span>
                <div className="flex flex-wrap gap-2">
                  {sharedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      {getFileTypeBadge(f.name)}
                      <span className="font-semibold text-slate-800">{f.name}</span>
                      <span className="text-[10px] text-slate-400">({formatFileSize(f.size)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Employee Assignments / Delegation Summary */}
          {handlingMethod !== 'work_alone' && selectedUsers.length > 0 && (
            delegationOption === 'direct' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-600" />
                      <span>Direct Task Delegation ({selectedUsers.length} Assignee{selectedUsers.length !== 1 ? 's' : ''})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      The main task scope and all shared documents will be delegated directly to the selected employee{selectedUsers.length !== 1 ? 's' : ''} without creating subtasks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Selected Teammates:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-medium text-slate-800 shadow-2xs"
                      >
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                          {u.name.charAt(0)}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {u.role?.replace('_', ' ')} {u.department ? `• ${u.department.name}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-emerald-800 pt-2 border-t border-emerald-200/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Each assignee will directly receive the full task scope, due date, deliverables, and shared attachments.</span>
                  </div>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-sky-600" />
                    <span>Individual Employee Assignments ({selectedUsers.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Summary of distinct work allocations, acceptance criteria, and private files.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Assignments</span>
                </button>
              </div>

              <div className="space-y-3">
                {selectedUsers.map((u) => {
                  const work = assigneeWork[u.id] || initAssignmentForUser(u);

                  return (
                    <div
                      key={u.id}
                      className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{u.name}</span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              {u.department ? u.department.name : ''} • {u.role?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                        >
                          Edit Assignment
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="font-bold text-slate-500">Subtask:</span>
                          <span className="font-bold text-slate-800 ml-1.5">{work.title}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">Due Date:</span>
                          <span className="font-semibold text-slate-800 ml-1.5">
                            {work.due_date || dueDate || 'Not set'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-slate-500 block mb-0.5">Description:</span>
                        <p className="text-slate-700 whitespace-pre-wrap pl-2.5 border-l-2 border-blue-500">
                          {work.description || description}
                        </p>
                      </div>

                      {work.expected_result && (
                        <div>
                          <span className="font-bold text-slate-500 block mb-0.5">Expected Result:</span>
                          <p className="text-slate-700 whitespace-pre-wrap text-[11px]">
                            {work.expected_result}
                          </p>
                        </div>
                      )}

                      {work.acceptance_criteria && (
                        <div>
                          <span className="font-bold text-slate-500 block mb-0.5">Acceptance Criteria:</span>
                          <p className="text-slate-700 whitespace-pre-wrap text-[11px]">
                            {work.acceptance_criteria}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-500">Attachments:</span>
                        {work.files && work.files.length > 0 ? (
                          work.files.map((bf, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium"
                            >
                              <Paperclip className="w-3 h-3 text-slate-500" />
                              <span>{bf.name}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No individual files attached</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )
          )}

          {/* Footer Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Creating Task...' : 'Create Task'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Discarding Entered Data */}
      {userToRemove && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remove Assignment for {userToRemove.name}?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  You have already entered individual instructions or attached files for <strong>{userToRemove.name}</strong>.
                  Removing this employee will discard their entered assignment details.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToRemove(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Keep Assignment
              </button>
              <button
                type="button"
                onClick={() => executeRemoveUser(userToRemove.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Discard & Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTaskPage;