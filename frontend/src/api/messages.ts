import apiClient from './client';

export interface UserSummary {
  id: number;
  name: string;
  email?: string;
  role?: string;
  thread_role?: string;
  department?: string;
  avatar_url?: string | null;
  gender?: string;
}

export interface MessageThread {
  id: string;
  task_id: number;
  task_code: string;
  task_title: string;
  task_status: string;
  task_priority: string;
  task_handling_method: string;
  branch_id: number;
  branch_title: string;
  branch_status: string;
  branch_due_date: string | null;
  partner: UserSummary;
  thread_role?: string;
  assigner?: UserSummary;
  assignee?: UserSummary;
  my_role: 'assigner' | 'assignee' | 'collaborator' | 'overseer';
  last_message: string;
  last_message_sender?: string;
  last_message_type: 'text' | 'missing_details_request' | 'details_provided' | 'review_feedback' | 'deliverable_update';
  last_message_at: string;
  last_message_time_ago: string;
  unread_count: number;
  has_attachment: boolean;
  is_overseer: boolean;
}

export interface ChatMessage {
  id: number;
  task_id: number;
  task_branch_id: number;
  sender_id: number;
  recipient_id: number;
  is_me: boolean;
  sender_name: string;
  sender_avatar: string | null;
  sender_role: string;
  sender_badge?: string;
  message: string;
  message_type: 'text' | 'missing_details_request' | 'details_provided' | 'review_feedback' | 'deliverable_update';
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  time_formatted: string;
  date_formatted: string;
  attachment: {
    id: number;
    file_name: string;
    file_size: string;
    file_type: string;
    download_url: string;
  } | null;
}

export interface ThreadDetailResponse {
  messages: ChatMessage[];
  task: {
    id: number;
    task_code: string;
    title: string;
    status: string;
    priority: string;
    handling_method: string;
    acceptance_criteria?: string;
    expected_result?: string;
    start_date?: string;
    due_date?: string;
  };
  branch: {
    id: number;
    title: string;
    status: string;
    due_date?: string;
  };
  partner: UserSummary;
  thread_role?: string;
  assigner: UserSummary;
  assignee: UserSummary;
  my_role: 'assigner' | 'assignee' | 'collaborator' | 'overseer';
  is_overseer: boolean;
}

export const messagesApi = {
  getThreads: async (tab: 'my_chats' | 'other' = 'my_chats') => {
    const response = await apiClient.get<{ tab: string; threads: MessageThread[]; total_unread: number }>(
      `/messages/threads?tab=${tab}`
    );
    return response.data;
  },

  getThreadMessages: async (branchId: number, partnerId?: number, isOverseer?: boolean) => {
    const params = new URLSearchParams();
    if (partnerId) params.append('partner_id', partnerId.toString());
    if (isOverseer) params.append('is_overseer', 'true');

    const response = await apiClient.get<ThreadDetailResponse>(
      `/messages/threads/${branchId}?${params.toString()}`
    );
    return response.data;
  },

  sendMessage: async (data: {
    task_id: number;
    task_branch_id: number;
    recipient_id: number;
    message: string;
    message_type?: string;
    attachment_id?: number;
  }) => {
    const response = await apiClient.post<{ status: string; message: ChatMessage }>('/messages/send', data);
    return response.data;
  },

  uploadAttachment: async (file: File, taskId: number, branchId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', taskId.toString());
    if (branchId) formData.append('task_branch_id', branchId.toString());

    const response = await apiClient.post<{
      status: string;
      attachment: {
        id: number;
        file_name: string;
        file_size: string;
        file_type: string;
        download_url: string;
      };
    }>('/messages/upload-attachment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get<{ unread_count: number }>('/messages/unread-count');
    return response.data;
  },
};
