import apiClient from './client';

export interface UserSummary {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

export interface TaskBranch {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'review' | 'on_hold' | 'post_comment' | 'completed' | 'cancelled';
  owner: UserSummary | null;
  assigned_by?: UserSummary | null;
  due_date: string | null;
  completed_at: string | null;
}

export interface TaskComment {
  id: number;
  comment: string;
  created_at: string;
  user: UserSummary | null;
}

export interface TaskAttachment {
  id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  file_path: string;
  url: string;
  created_at: string;
  uploaded_by: UserSummary | null;
}

export interface TaskReview {
  id: number;
  decision: 'approved' | 'returned' | 'rejected';
  comments: string;
  reviewed_at: string;
  reviewer: UserSummary | null;
}

export interface TaskSubmission {
  id: number;
  description: string;
  is_final: boolean;
  submitted_at: string;
  submitted_by: UserSummary | null;
  branch_id?: number | null;
  reviews?: TaskReview[];
}

export interface TaskStatusHistoryItem {
  id: number;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  changed_at: string;
  changed_by: UserSummary | null;
}

export interface Task {
  id: number;
  task_code: string;
  title: string;
  description: string;
  expected_result: string | null;
  acceptance_criteria: string | null;
  handling_method: 'work_alone' | 'assign' | 'collaborate';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'review' | 'on_hold' | 'post_comment' | 'completed' | 'cancelled' | 'rejected';
  start_date: string | null;
  due_date: string | null;
  is_overdue: boolean;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by?: UserSummary | null;
  progress: number;
  creator: UserSummary | null;
  current_owner: UserSummary | null;
  department: { id: number; name: string } | null;
  is_peer_isolated?: boolean;
  my_branch?: {
    id: number;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'review' | 'on_hold' | 'post_comment' | 'completed' | 'cancelled';
    due_date: string | null;
    completed_at: string | null;
    assigned_by?: UserSummary | null;
  } | null;
  branches: TaskBranch[];
  collaborators: UserSummary[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  status_history: TaskStatusHistoryItem[];
  submissions: TaskSubmission[];
  hold_record: { reason: string; held_at: string; held_by: string } | null;
  latest_clarification?: {
    id: number;
    comment: string;
    requested_by: UserSummary | null;
    requested_at: string;
  } | null;
  latest_return?: {
    id: number;
    decision: string;
    comments: string;
    reviewer: UserSummary | null;
    reviewed_at: string;
  } | null;
  permissions: {
    can_edit: boolean;
    can_submit: boolean;
    can_review: boolean;
    can_final_submit: boolean;
    can_request_details?: boolean;
    can_provide_details?: boolean;
    can_hold: boolean;
    can_resume: boolean;
    can_cancel: boolean;
    can_delete?: boolean;
    can_assign?: boolean;
    can_collaborate?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  expected_result?: string;
  acceptance_criteria?: string;
  handling_method: 'work_alone' | 'assign' | 'collaborate';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  due_date?: string;
  department_id?: number;
  assignees?: number[];
  collaborators?: number[];
  branches?: Array<{
    title: string;
    description?: string;
    owner_id: number;
    due_date?: string;
  }>;
}

export interface TaskFilters {
  view?: string;
  status?: string;
  priority?: string;
  department_id?: string | number;
  search?: string;
  page?: number;
  per_page?: number;
}

export const tasksApi = {
  list: async (params?: TaskFilters) => {
    const response = await apiClient.get('/tasks', { params });
    return response.data;
  },

  get: async (id: number): Promise<Task> => {
    const response = await apiClient.get(`/tasks/${id}`);
    return response.data.data;
  },

  create: async (data: CreateTaskData | FormData) => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.post('/tasks', data, {
      headers: isFormData ? { 'Content-Type': undefined } : undefined,
    });
    return response.data.data;
  },

  update: async (id: number, data: Partial<CreateTaskData>): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${id}`, data);
    return response.data.data;
  },

  cancel: async (id: number, reason: string) => {
    const response = await apiClient.post(`/tasks/${id}/cancel`, { reason });
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/tasks/${id}`);
    return response.data;
  },

  hold: async (id: number, reason: string) => {
    const response = await apiClient.put(`/tasks/${id}/hold`, { reason });
    return response.data;
  },

  resume: async (id: number) => {
    const response = await apiClient.put(`/tasks/${id}/resume`);
    return response.data;
  },

  submitWork: async (id: number, data: { description: string; task_branch_id?: number } | FormData) => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.post(`/tasks/${id}/submit`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  finalSubmit: async (id: number, data?: { description?: string } | FormData) => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.post(`/tasks/${id}/final-submit`, data || {}, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  reviewSubmission: async (submissionId: number, data: { decision: 'approved' | 'returned' | 'rejected'; comments?: string; return_to_user_id?: number }) => {
    const response = await apiClient.post(`/submissions/${submissionId}/review`, data);
    return response.data;
  },

  requestDetails: async (taskId: number, data: FormData | { question: string; branch_id?: number }) => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.post(`/tasks/${taskId}/request-details`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  provideDetails: async (taskId: number, data: FormData | { response: string; branch_id?: number }) => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.post(`/tasks/${taskId}/provide-details`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  addComment: async (data: { task_id: number; comment: string; task_branch_id?: number }) => {
    const response = await apiClient.post('/comments', data);
    return response.data.data;
  },

  addAssignees: async (id: number, userIds: number[]) => {
    const response = await apiClient.post(`/tasks/${id}/assignees`, { user_ids: userIds });
    return response.data;
  },

  addCollaborators: async (id: number, userIds: number[]) => {
    const response = await apiClient.post(`/tasks/${id}/collaborators`, { user_ids: userIds });
    return response.data;
  },

  uploadAttachment: async (formData: FormData) => {
    const response = await apiClient.post('/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  downloadAttachment: async (attachmentId: number, fileName: string) => {
    const token = localStorage.getItem('token');
    const response = await apiClient.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      params: token ? { token } : undefined,
    });
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  getAttachmentDownloadUrl: (attachmentId: number) => {
    const token = localStorage.getItem('token');
    const rawBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    const apiBase = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;
    return `${apiBase}/attachments/${attachmentId}/download?token=${token || ''}`;
  },
};

export const dashboardApi = {
  getAdminMetrics: async () => {
    const response = await apiClient.get('/dashboard/admin');
    return response.data.data;
  },

  getEmployeeMetrics: async () => {
    const response = await apiClient.get('/dashboard/employee');
    return response.data.data;
  },

  getReports: async (range: string = 'last_30_days') => {
    const response = await apiClient.get('/reports', { params: { range } });
    return response.data.data;
  },
};

export const notificationsApi = {
  list: async () => {
    const response = await apiClient.get('/notifications');
    return response.data.data;
  },

  markAsRead: async (id: number) => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.put('/notifications/read-all');
    return response.data;
  },
};

export const workLogsApi = {
  getLogs: async (params?: {
    type?: string;
    task_id?: number;
    user_id?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => {
    const response = await apiClient.get('/work-logs', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/work-logs/stats');
    return response.data.data;
  },

  getTasksList: async () => {
    const response = await apiClient.get('/work-logs/tasks');
    return response.data.data;
  },

  getUsersList: async () => {
    const response = await apiClient.get('/work-logs/users');
    return response.data.data;
  },

  getTaskJourney: async (taskId: number) => {
    const response = await apiClient.get(`/work-logs/task/${taskId}`);
    return response.data.data;
  },

  getTaskJourneys: async (params?: {
    search?: string;
    task_id?: number;
    user_id?: number;
    status?: string;
    page?: number;
    per_page?: number;
  }) => {
    const response = await apiClient.get('/work-logs/journeys', { params });
    return response.data;
  },
};
