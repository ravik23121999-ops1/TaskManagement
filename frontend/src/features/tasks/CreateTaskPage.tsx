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
  Search
} from 'lucide-react';

export const CreateTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Wizard Step: 1 = Basic Details, 2 = Assignment, 3 = Review & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form Data
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [description, setDescription] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [handlingMethod, setHandlingMethod] = useState<'work_alone' | 'assign' | 'collaborate'>('work_alone');

  // Assign mode: 'single' for 1 employee, 'multiple' for 2+ employees
  const [assignMode, setAssignMode] = useState<'single' | 'multiple'>('single');

  // Selected Users (Supports 1 or Many for both Assign and Collaborate)
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  // Optional Custom Subtask Branches for Collaboration
  const [branches, setBranches] = useState<Array<{ title: string; owner_id: number }>>([]);

  // Files
  const [files, setFiles] = useState<File[]>([]);

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

  const handleNextStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!title.trim()) {
        setError('Task Title is required.');
        return;
      }
      if (!description.trim()) {
        setError('Description is required.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (handlingMethod === 'assign') {
        if (selectedUsers.length === 0) {
          setError('Please select an employee to assign this task to.');
          return;
        }
        if (selectedUsers.some((u) => u.id === currentUser?.id)) {
          setError('You cannot assign a task to yourself. Use "Work Alone" if you want to execute this task.');
          return;
        }
      } else if (handlingMethod === 'collaborate') {
        if (selectedUsers.length === 0 && branches.length === 0) {
          setError('Please select at least one collaborator to invite.');
          return;
        }
        if (branches.length > 0) {
          const invalid = branches.some((b) => !b.title.trim() || b.owner_id === 0);
          if (invalid) {
            setError('Please provide branch titles and select owners for all custom branches, or remove them.');
            return;
          }
        }
      }
      setCurrentStep(3);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Select a single user (for single assignee mode)
  const selectSingleUser = (user: any) => {
    setSelectedUsers([user]);
  };

  // Toggle user selection (for multiple assignees or collaborate mode)
  const toggleUserSelection = (user: any) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // If no files attached, send pure JSON for 100% reliable array & type parsing
      if (files.length === 0) {
        const payload: any = {
          title: title.trim(),
          description: description.trim(),
          expected_result: expectedResult.trim() || undefined,
          acceptance_criteria: acceptanceCriteria.trim() || undefined,
          handling_method: handlingMethod,
          priority,
          department_id: departmentId || undefined,
          start_date: startDate || undefined,
          due_date: dueDate || undefined,
        };

        if (handlingMethod === 'assign') {
          payload.assignees = selectedUsers.map((u) => u.id);
        } else if (handlingMethod === 'collaborate') {
          payload.assignees = selectedUsers.map((u) => u.id);
          payload.collaborators = selectedUsers.map((u) => u.id);
          const validBranches = branches.filter((b) => b.title.trim() && b.owner_id > 0);
          if (validBranches.length > 0) {
            payload.branches = validBranches;
          }
        }

        const result = await tasksApi.create(payload);
        navigate(`/tasks/${result.id}`);
        return;
      }

      // Multipart form data if files are present
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

      if (handlingMethod === 'assign') {
        selectedUsers.forEach((u) => {
          formData.append('assignees[]', String(u.id));
        });
      } else if (handlingMethod === 'collaborate') {
        selectedUsers.forEach((u) => {
          formData.append('assignees[]', String(u.id));
          formData.append('collaborators[]', String(u.id));
        });

        const validBranches = branches.filter((b) => b.title.trim() && b.owner_id > 0);
        if (validBranches.length > 0) {
          validBranches.forEach((b, idx) => {
            formData.append(`branches[${idx}][title]`, b.title.trim());
            formData.append(`branches[${idx}][owner_id]`, String(b.owner_id));
          });
        }
      }

      files.forEach((f) => {
        formData.append('files[]', f);
      });

      const result = await tasksApi.create(formData);
      navigate(`/tasks/${result.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  // Filter out the currently logged-in user! Admin/creator cannot assign to themselves
  const eligibleUsers = allUsers.filter((u) => u.id !== currentUser?.id);

  const filteredUsers = eligibleUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.department?.name && u.department.name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.role && u.role.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/')}>Dashboard</span>
          <span>›</span>
          <span className="text-slate-700 font-semibold">Create Task</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Task</h1>
      </div>

      {/* Stepper Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {/* Step 1 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep >= 1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <span className={`text-xs font-semibold ${currentStep === 1 ? 'text-blue-600' : 'text-slate-600'}`}>
              Basic Details
            </span>
          </div>

          <div className={`h-0.5 w-16 sm:w-24 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'} transition-colors`} />

          {/* Step 2 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep >= 2 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <span className={`text-xs font-semibold ${currentStep === 2 ? 'text-blue-600' : 'text-slate-600'}`}>
              Assignment (1 to Many)
            </span>
          </div>

          <div className={`h-0.5 w-16 sm:w-24 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'} transition-colors`} />

          {/* Step 3 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep === 3 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </div>
            <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-blue-600' : 'text-slate-600'}`}>
              Review & Submit
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 4: STEP 1 - BASIC DETAILS                         */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Task Title *</label>
              <input
                type="text"
                placeholder="Enter task title"
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Description *</label>
            <textarea
              rows={5}
              placeholder="Enter detailed description regarding this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Expected Result</label>
              <textarea
                rows={3}
                placeholder="What is the expected outcome or deliverable?"
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Acceptance Criteria</label>
              <textarea
                rows={3}
                placeholder="List acceptance criteria, thresholds, and conditions..."
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Attachments Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Attachments</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition">
              <input
                type="file"
                multiple
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Paperclip className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-blue-600 hover:underline">Choose files</span>
                <span className="text-xs text-slate-400"> or drag & drop here (max 10MB each)</span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                    <span className="truncate text-slate-700 font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-red-500 p-1"
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
      {/* SCREEN 5: STEP 2 - ASSIGNMENT (1 TO MANY)                */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Select Task Handling Method</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose how this task will be handled: Work alone, Assign to 1 or more people, or Collaborate with 1 or more people.
            </p>
          </div>

          {/* 3 Selectable Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Work Alone */}
            <div
              onClick={() => {
                setHandlingMethod('work_alone');
                setSelectedUsers([]);
                setBranches([]);
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
                <h3 className="text-sm font-bold text-slate-900 mb-1">Work Alone</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  I will execute this task entirely on my own and submit directly for completion.
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

            {/* 2. Assign (One or Many) */}
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
                <h3 className="text-sm font-bold text-slate-900 mb-1">Assign (1 or Many)</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Assign this task to <strong>one or more employees</strong>. Each assignee manages their branch and submits for review.
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

            {/* 3. Collaborate (One or Many) */}
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
                <h3 className="text-sm font-bold text-slate-900 mb-1">Collaborate (1 or Many)</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Invite <strong>one or more team members</strong> to collaborate together, with optional linked subtasks.
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

          {/* Dynamic Section: Assignees / Collaborators Picker */}
          {handlingMethod === 'assign' && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-sky-600" />
                    <span>Select Assignee</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Assign this task to another employee. (Use <strong>"Work Alone"</strong> if you want to execute it yourself).
                  </p>
                </div>

                {/* Mode Selector: Single vs Multiple */}
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
              </div>

              {/* Single Assignee Confirmation Banner */}
              {assignMode === 'single' && selectedUsers.length > 0 && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {selectedUsers[0].name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Assigned to: {selectedUsers[0].name}</span>
                        <span className="px-1.5 py-0.2 bg-sky-200 text-sky-800 rounded text-[9px] font-bold">
                          Selected
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {selectedUsers[0].email} • <span className="capitalize">{selectedUsers[0].role?.replace('_', ' ')}</span>
                        {selectedUsers[0].department && ` • ${selectedUsers[0].department.name}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUsers([])}
                    className="text-[11px] font-semibold text-sky-700 hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Multiple Assignees Count & Actions */}
              {assignMode === 'multiple' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-slate-600">
                    {selectedUsers.length} employee{selectedUsers.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    {filteredUsers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const merged = [...selectedUsers];
                          filteredUsers.forEach((u) => {
                            if (!merged.some((m) => m.id === u.id)) {
                              merged.push(u);
                            }
                          });
                          setSelectedUsers(merged);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Select All Filtered
                      </button>
                    )}
                    {selectedUsers.length > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedUsers([])}
                          className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Real-time Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type to filter employees by name, department, role, or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Embedded Employee Selection Cards List (NOT a hidden floating dropdown) */}
              <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
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
                          if (assignMode === 'single') {
                            selectSingleUser(u);
                          } else {
                            toggleUserSelection(u);
                          }
                        }}
                        className={`p-3 transition cursor-pointer flex items-center justify-between text-xs ${
                          isSelected ? 'bg-sky-50/70 border-l-4 border-l-sky-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                              isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
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

                        {/* Radio indicator (for Single) or Checkbox indicator (for Multiple) */}
                        <div>
                          {assignMode === 'single' ? (
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
                                isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
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

              {/* Multiple Assignees Chips */}
              {assignMode === 'multiple' && selectedUsers.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Selected Assignees ({selectedUsers.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 capitalize">
                              {u.role?.replace('_', ' ')} {u.department ? `• ${u.department.name}` : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleUserSelection(u)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Section: Collaborate Picker */}
          {handlingMethod === 'collaborate' && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>Select Collaborator(s)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Choose one or more team members to collaborate and contribute on this task.
                  </p>
                </div>
                {selectedUsers.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    {selectedUsers.length} selected
                  </span>
                )}
              </div>

              {/* Real-time Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type to filter employees by name, department, or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Embedded Collaborators List */}
              <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
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
                        onClick={() => toggleUserSelection(u)}
                        className={`p-3 transition cursor-pointer flex items-center justify-between text-xs ${
                          isSelected ? 'bg-purple-50/70 border-l-4 border-l-purple-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                              isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
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
                        <span
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                            isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Collaborator Chips */}
              {selectedUsers.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Selected Collaborators ({selectedUsers.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 capitalize">
                              {u.role?.replace('_', ' ')} {u.department ? `• ${u.department.name}` : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleUserSelection(u)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Custom Subtasks builder for Collaboration */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Optional: Split into Custom Subtasks / Branches
                    </span>
                    <p className="text-[11px] text-slate-400">
                      If you want specific milestones (e.g. Frontend, Backend, QA), add them here. Otherwise, leave empty to collaborate directly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBranches([...branches, { title: '', owner_id: selectedUsers[0]?.id || eligibleUsers[0]?.id || 0 }]);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Subtask</span>
                  </button>
                </div>

                {branches.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {branches.map((b, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input
                          type="text"
                          placeholder={`Subtask ${idx + 1} Title (e.g. UI Design, API Integration)`}
                          value={b.title}
                          onChange={(e) => {
                            const newB = [...branches];
                            newB[idx].title = e.target.value;
                            setBranches(newB);
                          }}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <select
                          value={b.owner_id}
                          onChange={(e) => {
                            const newB = [...branches];
                            newB[idx].owner_id = Number(e.target.value);
                            setBranches(newB);
                          }}
                          className="w-48 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value={0}>Select Subtask Owner</option>
                          {eligibleUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setBranches(branches.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
          <div>
            <h2 className="text-sm font-bold text-slate-900">Review & Submit</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm your task configuration before creating it.
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
            <div className="flex justify-between border-b border-slate-200/60 pb-3">
              <span className="font-bold text-slate-500">Title:</span>
              <span className="font-bold text-slate-900">{title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-3">
              <span className="font-bold text-slate-500">Handling Method:</span>
              <span className="font-bold text-blue-600 uppercase tracking-wide">
                {handlingMethod === 'assign'
                  ? `Assign (${selectedUsers.length} Assignee${selectedUsers.length > 1 ? 's' : ''})`
                  : handlingMethod === 'collaborate'
                  ? `Collaborate (${selectedUsers.length} Collaborator${selectedUsers.length > 1 ? 's' : ''})`
                  : 'Work Alone'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-3">
              <span className="font-bold text-slate-500">Priority:</span>
              <span className="font-bold text-slate-800 capitalize">{priority}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-3">
              <span className="font-bold text-slate-500">Due Date:</span>
              <span className="font-medium text-slate-800">{dueDate || 'Not set'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Description:</span>
              <p className="text-slate-700 whitespace-pre-wrap">{description}</p>
            </div>
            {handlingMethod !== 'work_alone' && (
              <div>
                <span className="font-bold text-slate-500 block mb-1">
                  {handlingMethod === 'assign' ? 'Assignees:' : 'Collaborators:'}
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700"
                    >
                      {u.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {branches.length > 0 && (
              <div>
                <span className="font-bold text-slate-500 block mb-1">Subtasks / Branches:</span>
                <div className="space-y-1 pt-1">
                  {branches.map((b, i) => (
                    <div key={i} className="text-slate-700 font-medium">
                      • {b.title} (Owner: {allUsers.find((u) => u.id === b.owner_id)?.name || 'Unassigned'})
                    </div>
                  ))}
                </div>
              </div>
            )}
            {files.length > 0 && (
              <div>
                <span className="font-bold text-slate-500 block mb-1">Attachments:</span>
                <span className="text-slate-700 font-medium">{files.length} file(s) attached</span>
              </div>
            )}
          </div>

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
    </div>
  );
};

export default CreateTaskPage;
