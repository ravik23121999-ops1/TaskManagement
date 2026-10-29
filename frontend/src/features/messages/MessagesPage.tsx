import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { messagesApi } from '../../api/messages';
import { tasksApi } from '../../api/tasks';
import type { MessageThread, ThreadDetailResponse } from '../../api/messages';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  ExternalLink,
  Check,
  CheckCheck,
  AlertTriangle,
  FileCheck2,
  Layers,
  Shield,
  X,
  Download,
  FileText,
  ChevronLeft,
  Info,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();


  // Active Tab: 'my_chats' (direct 1-on-1 branch chat) vs 'other' (subordinate branch oversight)
  const activeTab = (searchParams.get('tab') as 'my_chats' | 'other') || 'my_chats';
  const selectedBranchId = searchParams.get('branch') ? Number(searchParams.get('branch')) : null;
  const selectedPartnerId = searchParams.get('partner') ? Number(searchParams.get('partner')) : null;
  const isOverseerParam = searchParams.get('overseer') === 'true';

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  // Active Chat State
  const [activeThreadData, setActiveThreadData] = useState<ThreadDetailResponse | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [messageType, setMessageType] = useState<
    'text' | 'missing_details_request' | 'details_provided' | 'review_feedback' | 'deliverable_update'
  >('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showTaskContext, setShowTaskContext] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sound notification toggle (persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('chat_sound_enabled') !== 'false';
  });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('chat_sound_enabled', next ? 'true' : 'false');
      return next;
    });
  };

  const playMessageChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // Note 1: G5 (784 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(784, now);
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Note 2: C6 (1046.5 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.08);
      gain2.gain.setValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch {
      // Audio policy fallback
    }
  };

  // Load conversation threads
  useEffect(() => {
    loadThreads(activeTab);
  }, [activeTab]);

  // Load message history when active thread changes
  useEffect(() => {
    if (selectedBranchId) {
      loadThreadMessages(selectedBranchId, selectedPartnerId || undefined, isOverseerParam);
    } else {
      setActiveThreadData(null);
    }
  }, [selectedBranchId, selectedPartnerId, isOverseerParam]);

  // Real-time Chat Live Polling:
  // Polls active conversation every 2.5 seconds when window is active without manual refresh
  useEffect(() => {
    if (!selectedBranchId) return;

    const chatInterval = setInterval(() => {
      if (document.hidden) return;
      loadThreadMessages(selectedBranchId, selectedPartnerId || undefined, isOverseerParam, true);
    }, 2500);

    return () => clearInterval(chatInterval);
  }, [selectedBranchId, selectedPartnerId, isOverseerParam]);

  // Background poll for threads list every 5 seconds so incoming chats update badge counts and snippets
  useEffect(() => {
    const threadInterval = setInterval(() => {
      if (document.hidden) return;
      loadThreads(activeTab, true);
    }, 5000);

    return () => clearInterval(threadInterval);
  }, [activeTab, selectedBranchId, selectedPartnerId]);

  // Immediate sync when browser tab regains focus
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        if (selectedBranchId) {
          loadThreadMessages(selectedBranchId, selectedPartnerId || undefined, isOverseerParam, true);
        }
        loadThreads(activeTab, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [selectedBranchId, selectedPartnerId, isOverseerParam, activeTab]);

  // Auto-scroll to bottom of chat smoothly when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadData?.messages]);

  const loadThreads = async (tab: 'my_chats' | 'other', isBackground = false) => {
    if (threads.length === 0 && !isBackground) {
      setLoadingThreads(true);
    }
    try {
      const data = await messagesApi.getThreads(tab);
      const incomingThreads = data.threads || [];

      setThreads(() => {
        if (!isBackground) return incomingThreads;
        return incomingThreads.map((newT) => {
          if (
            selectedBranchId &&
            newT.branch_id === selectedBranchId &&
            (!selectedPartnerId || newT.partner.id === selectedPartnerId)
          ) {
            return { ...newT, unread_count: 0 };
          }
          return newT;
        });
      });

      // If no branch is selected yet, automatically select the first thread on desktop
      if (!isBackground && !selectedBranchId && incomingThreads.length > 0 && window.innerWidth >= 1024) {
        const first = incomingThreads[0];
        setSearchParams({
          tab,
          branch: first.branch_id.toString(),
          partner: first.partner.id.toString(),
          overseer: first.is_overseer ? 'true' : 'false',
        });
      }
    } catch (err) {
      if (!isBackground) {
        console.error('Failed to load threads', err);
      }
    } finally {
      if (!isBackground) {
        setLoadingThreads(false);
      }
    }
  };

  const loadThreadMessages = async (
    branchId: number,
    partnerId?: number,
    isOverseer?: boolean,
    isBackground = false
  ) => {
    const isNewThread =
      !activeThreadData ||
      activeThreadData.branch.id !== branchId ||
      activeThreadData.partner.id !== partnerId;

    if (isNewThread && !isBackground) {
      setLoadingMessages(true);
    }

    try {
      const data = await messagesApi.getThreadMessages(branchId, partnerId, isOverseer);

      setActiveThreadData((prev) => {
        if (!prev || isNewThread) return data;

        const prevMsgs = prev.messages || [];
        const newMsgs = data.messages || [];

        // Check if messages list changed
        const prevCount = prevMsgs.length;
        const newCount = newMsgs.length;
        const lastPrevId = prevCount > 0 ? prevMsgs[prevCount - 1].id : null;
        const lastNewId = newCount > 0 ? newMsgs[newCount - 1].id : null;

        if (prevCount === newCount && lastPrevId === lastNewId) {
          return prev; // No change: maintain reference to avoid re-rendering
        }

        // New incoming message from chat partner: play chime
        if (newCount > prevCount) {
          const latest = newMsgs[newCount - 1];
          if (!latest.is_me) {
            playMessageChime();
          }
        }

        return data;
      });

      // Update unread count and latest message locally in threads list
      setThreads((prev) =>
        prev.map((t) => {
          if (t.branch_id === branchId && (!partnerId || t.partner.id === partnerId)) {
            const latestMsg = data.messages && data.messages.length > 0 ? data.messages[data.messages.length - 1] : null;
            return {
              ...t,
              unread_count: 0,
              last_message: latestMsg ? latestMsg.message : t.last_message,
              last_message_at: latestMsg ? latestMsg.created_at : t.last_message_at,
              last_message_time_ago: latestMsg ? 'Just now' : t.last_message_time_ago,
              last_message_type: latestMsg ? latestMsg.message_type : t.last_message_type,
              has_attachment: latestMsg ? !!latestMsg.attachment : t.has_attachment,
            };
          }
          return t;
        })
      );
    } catch (err: any) {
      if (!isBackground) {
        console.error('Failed to load thread messages', err);
        if (err?.response?.status === 403) {
          showToast('Access Denied: Same-level assignees cannot access other branch conversations.', 'error');
        } else {
          showToast(err?.response?.data?.message || 'Could not load branch messages.', 'error');
        }
      }
    } finally {
      if (isNewThread && !isBackground) {
        setLoadingMessages(false);
      }
    }
  };

  const handleSelectThread = (thread: MessageThread) => {
    setSearchParams({
      tab: activeTab,
      branch: thread.branch_id.toString(),
      partner: thread.partner.id.toString(),
      overseer: thread.is_overseer ? 'true' : 'false',
    });
  };

  const handleTabChange = (newTab: 'my_chats' | 'other') => {
    setSearchParams({ tab: newTab });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !selectedFile) return;
    if (!activeThreadData) return;

    setSendingMessage(true);
    try {
      let attachmentId: number | undefined = undefined;

      // Upload file first if attached
      if (selectedFile) {
        setUploadingFile(true);
        const uploadRes = await messagesApi.uploadAttachment(
          selectedFile,
          activeThreadData.task.id,
          activeThreadData.branch.id
        );
        attachmentId = uploadRes.attachment.id;
        setUploadingFile(false);
      }

      // Determine recipient
      const recipientId = activeThreadData.partner.id;

      const payload = {
        task_id: activeThreadData.task.id,
        task_branch_id: activeThreadData.branch.id,
        recipient_id: recipientId,
        message: messageInput.trim() || `Shared attachment: ${selectedFile?.name}`,
        message_type: messageType,
        attachment_id: attachmentId,
      };

      const res = await messagesApi.sendMessage(payload);

      // Append new message to stream
      if (res.message) {
        setActiveThreadData((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, res.message],
              }
            : null
        );

        // Update latest message in left threads list
        setThreads((prev) =>
          prev.map((t) =>
            t.branch_id === activeThreadData.branch.id && t.partner.id === recipientId
              ? {
                  ...t,
                  last_message: res.message.message,
                  last_message_at: res.message.created_at,
                  last_message_time_ago: 'Just now',
                  last_message_type: res.message.message_type,
                  has_attachment: !!attachmentId,
                }
              : t
          )
        );
      }

      // Reset form
      setMessageInput('');
      setSelectedFile(null);
      setMessageType('text');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Failed to send message', err);
      const errorMsg =
        err.response?.data?.message ||
        (typeof err.response?.data?.errors === 'object'
          ? Object.values(err.response.data.errors).flat().join(' ')
          : null) ||
        'Could not deliver message. Please verify network and try again.';
      showToast(errorMsg, 'error');
    } finally {
      setSendingMessage(false);
      setUploadingFile(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: number, fileName: string) => {
    setDownloadingAttachmentId(attachmentId);
    try {
      await tasksApi.downloadAttachment(attachmentId, fileName);
    } catch (err: any) {
      console.error('Download error:', err);
      showToast(err.response?.data?.message || 'Failed to download attachment', 'error');
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  // Quick Action Pre-fills
  const handleQuickPrompt = (
    type: 'missing_details_request' | 'details_provided' | 'review_feedback',
    text: string
  ) => {
    setMessageType(type);
    setMessageInput(text);
  };

  // Filtered threads list
  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      t.task_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.task_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.branch_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.partner.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUnread = filterUnreadOnly ? t.unread_count > 0 : true;
    return matchesSearch && matchesUnread;
  });

  const totalUnreadCount = threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Work Messages & Communications</h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Branch Direct Chat</span>
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Direct branch-wise communication between Assigner and Assignees. Discuss tasks, request missing details, review work, and share documents.
          </p>
        </div>

        {/* Tab Switcher: My Chats vs Other Communications */}
        <div className="flex items-center bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto shadow-inner">
          <button
            onClick={() => handleTabChange('my_chats')}
            className={`flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'my_chats'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>My Chats</span>
            {totalUnreadCount > 0 && (
              <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-blue-600 text-white">
                {totalUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('other')}
            className={`flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'other'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Other Communications</span>
          </button>
        </div>
      </div>

      {/* Main Messenger Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden h-[calc(100vh-230px)] min-h-[580px] flex">
        {/* ======================================================== */}
        {/* LEFT PANE: THREADS LIST (Instagram DM Style)               */}
        {/* ======================================================== */}
        <div
          className={`w-full lg:w-96 border-r border-slate-200/80 flex flex-col shrink-0 bg-slate-50/50 ${
            selectedBranchId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Thread Search & Filter Bar */}
          <div className="p-3.5 border-b border-slate-200/80 space-y-2.5 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by task, ID, employee, branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-700">
                {activeTab === 'my_chats' ? 'Active Work Conversations' : 'Subordinate Hierarchy Oversight'}
              </span>
              <button
                type="button"
                onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterUnreadOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Unread ({totalUnreadCount})
              </button>
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingThreads ? (
              <div className="p-3 divide-y divide-slate-100 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-200/80 shrink-0" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="flex justify-between items-center">
                        <div className="h-3.5 w-24 bg-slate-200/80 rounded" />
                        <div className="h-2.5 w-10 bg-slate-100 rounded" />
                      </div>
                      <div className="h-3 w-40 bg-slate-200/70 rounded" />
                      <div className="h-2.5 w-28 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">No conversations found</p>
                <p className="text-slate-500">
                  {activeTab === 'my_chats'
                    ? 'When you assign tasks to employees, collaborate on branches, or are assigned work, direct chats appear here.'
                    : 'Subordinate hierarchy oversight is for managers, task creators, and administrators to review branches delegated down their management tree. Direct work assigned to you is in "My Chats".'}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected =
                  selectedBranchId === thread.branch_id &&
                  selectedPartnerId === thread.partner.id;

                const partnerRoleLabel =
                  thread.thread_role ||
                  thread.partner.thread_role ||
                  (thread.my_role === 'assigner' ? 'Assignee' : 'Assigner');

                let roleBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                if (partnerRoleLabel === 'Collaborator') roleBadgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                else if (partnerRoleLabel === 'Assigner' || partnerRoleLabel === 'Reviewer') roleBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                else if (partnerRoleLabel === 'Assignee') roleBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                else if (thread.partner.role === 'admin') roleBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                else if (thread.partner.role === 'sub_admin') roleBadgeColor = 'bg-purple-50 text-purple-700 border-purple-200';

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`p-3.5 transition cursor-pointer flex items-start gap-3 hover:bg-slate-100/70 ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'bg-white'
                    }`}
                  >
                    {/* Partner 3D Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs flex items-center justify-center">
                        <img
                          src={
                            thread.partner.avatar_url ||
                            `/assets/roles/${thread.partner.role || 'employee'}_${thread.partner.gender || 'female'}.png`
                          }
                          alt={thread.partner.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="text-sm font-bold text-white absolute">
                          {thread.partner.name.charAt(0)}
                        </span>
                      </div>
                      {thread.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-600 ring-2 ring-white" />
                      )}
                    </div>

                    {/* Thread Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className="text-xs font-bold text-slate-900 truncate">
                          {thread.partner.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {thread.last_message_time_ago}
                        </span>
                      </div>

                      {/* Task Code & Branch Name */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-1">
                        <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-blue-100 text-blue-800 text-[10px]">
                          {thread.task_code}
                        </span>
                        <span className="text-slate-600 font-semibold truncate max-w-[170px]" title={thread.branch_title}>
                          {thread.branch_title}
                        </span>
                      </div>

                      {/* Latest Message Snippet */}
                      <p
                        className={`text-xs truncate ${
                          thread.unread_count > 0
                            ? 'font-bold text-slate-900'
                            : 'text-slate-500'
                        }`}
                      >
                        {thread.last_message_type === 'missing_details_request' && (
                          <span className="text-amber-600 font-bold mr-1">⚠️ Missing Specs:</span>
                        )}
                        {thread.last_message_type === 'details_provided' && (
                          <span className="text-emerald-600 font-bold mr-1">✅ Details:</span>
                        )}
                        {thread.last_message_type === 'review_feedback' && (
                          <span className="text-sky-600 font-bold mr-1">📋 Feedback:</span>
                        )}
                        {thread.last_message_sender &&
                          thread.last_message_sender !== thread.partner.name && (
                            <span className="font-semibold text-slate-700 mr-1">
                              {thread.last_message_sender}:
                            </span>
                          )}
                        {thread.last_message}
                      </p>

                      {/* Role Pill & Status Indicator */}
                      <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px]">
                        <span className={`px-2 py-0.2 rounded-full font-bold border capitalize ${roleBadgeColor}`}>
                          {partnerRoleLabel}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {thread.unread_count > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full font-bold bg-blue-600 text-white text-[10px]">
                              {thread.unread_count} new
                            </span>
                          )}
                          <StatusBadge status={thread.branch_status as any} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANE: ACTIVE CHAT FEED (Instagram Direct Style)      */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {!selectedBranchId || !activeThreadData ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Select a Branch Conversation</h2>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose a task branch from the left sidebar to converse with your assigner or assignee, clarify missing details, and share deliverables.
              </p>
            </div>
          ) : (
            <>
              {/* Active Conversation Top Bar */}
              <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3 shadow-2xs z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setSearchParams({ tab: activeTab })}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Partner Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs flex items-center justify-center">
                      <img
                        src={
                          activeThreadData.partner.avatar_url ||
                          `/assets/roles/${activeThreadData.partner.role || 'employee'}_${activeThreadData.partner.gender || 'female'}.png`
                        }
                        alt={activeThreadData.partner.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="text-sm font-bold text-white absolute">
                        {activeThreadData.partner.name.charAt(0)}
                      </span>
                    </div>
                  </div>

                  {/* Partner Name & Task Meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {activeThreadData.partner.name}
                      </h2>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold border capitalize ${
                          (activeThreadData.partner.thread_role || activeThreadData.thread_role) === 'Collaborator'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : (activeThreadData.partner.thread_role || activeThreadData.thread_role) === 'Assigner'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {activeThreadData.partner.thread_role ||
                          activeThreadData.thread_role ||
                          (activeThreadData.my_role === 'assigner'
                            ? 'Assignee'
                            : activeThreadData.my_role === 'assignee'
                            ? 'Assigner'
                            : 'Overseeing')}
                      </span>
                      <span className="text-xs text-slate-400">• {activeThreadData.partner.department}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                      <span className="font-mono font-bold text-blue-600">
                        {activeThreadData.task.task_code}
                      </span>
                      <span>: {activeThreadData.task.title}</span>
                      <span>•</span>
                      <span className="text-slate-700 font-semibold truncate">
                        {activeThreadData.branch.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Live Sync Status Indicator */}
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Chat</span>
                  </div>

                  {/* Sound Notification Toggle */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`h-8 w-8 flex items-center justify-center rounded-xl border transition cursor-pointer ${
                      soundEnabled
                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={soundEnabled ? 'Message sound is ON (Click to mute)' : 'Message sound is MUTED (Click to unmute)'}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTaskContext(!showTaskContext)}
                    className={`h-8 px-3 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                      showTaskContext
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Branch Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/tasks/${activeThreadData.task.id}`)}
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Task</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Collapsible Branch Context Card */}
              {showTaskContext && (
                <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Branch Status</span>
                      <StatusBadge status={activeThreadData.branch.status as any} size="sm" />
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Due Date</span>
                      <span className="font-semibold text-slate-800">{activeThreadData.branch.due_date || 'No deadline'}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigner (Reviewer)</span>
                      <span className="font-semibold text-slate-800">{activeThreadData.assigner.name}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assignee (Owner)</span>
                      <span className="font-semibold text-slate-800">{activeThreadData.assignee.name}</span>
                    </div>
                  </div>

                  {activeThreadData.task.acceptance_criteria && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Acceptance Criteria & Required Deliverables
                      </span>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {activeThreadData.task.acceptance_criteria}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Hierarchy Oversight Banner for Below-Branch Reviews */}
              {activeThreadData.is_overseer && (
                <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-indigo-50/90 border-b border-indigo-200/80 px-4 sm:px-6 flex items-center justify-between text-xs text-indigo-950 gap-3">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Hierarchy Oversight & Review:</strong> Reviewing below branch messages between{' '}
                      <strong className="text-slate-900">{activeThreadData.assigner.name}</strong> (Assigner) and{' '}
                      <strong className="text-slate-900">{activeThreadData.assignee.name}</strong> (Assignee). You can post review feedback or missing details requests directly into this branch.
                    </span>
                  </div>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider shrink-0">
                    Reviewer Mode
                  </span>
                </div>
              )}

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30">
                {loadingMessages ? (
                  <div className="p-6 space-y-4 animate-pulse">
                    <div className="flex items-start gap-3 max-w-[70%]">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 mt-1" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                        <div className="h-16 bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3 shadow-2xs" />
                      </div>
                    </div>
                    <div className="flex items-end justify-end gap-3 max-w-[70%] ml-auto">
                      <div className="space-y-1.5 flex-1 items-end">
                        <div className="h-3 w-16 bg-slate-200 rounded ml-auto" />
                        <div className="h-12 bg-blue-100/70 border border-blue-200/40 rounded-2xl rounded-tr-xs ml-auto w-full shadow-2xs" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-100 shrink-0 mb-1" />
                    </div>
                    <div className="flex items-start gap-3 max-w-[75%]">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 mt-1" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-24 bg-slate-200 rounded" />
                        <div className="h-20 bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3 shadow-2xs" />
                      </div>
                    </div>
                    <div className="flex items-end justify-end gap-3 max-w-[60%] ml-auto">
                      <div className="h-12 bg-blue-100/70 border border-blue-200/40 rounded-2xl rounded-tr-xs w-full shadow-2xs" />
                      <div className="w-8 h-8 rounded-full bg-blue-100 shrink-0" />
                    </div>
                  </div>
                ) : activeThreadData.messages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-700 text-sm">No messages yet in this branch</p>
                    <p className="text-slate-500">
                      Send a message below to coordinate branch work, request missing details, or attach deliverables.
                    </p>
                  </div>
                ) : (
                  activeThreadData.messages.map((msg, index) => {
                    const isMe = msg.is_me;

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Label for Subordinate Oversight or Left Bubble */}
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-xs text-slate-400 font-medium">
                          <span className="font-semibold text-slate-700">{msg.sender_name}</span>
                          {msg.sender_badge && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {msg.sender_badge}
                            </span>
                          )}
                          <span>•</span>
                          <span>{msg.time_formatted}</span>
                          {isMe && (
                            <span title={msg.is_read ? 'Seen' : 'Delivered'}>
                              {msg.is_read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl shadow-2xs space-y-2 leading-relaxed text-sm ${
                            isMe
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                          }`}
                        >
                          {/* Work Context Special Card Banner */}
                          {msg.message_type === 'missing_details_request' && (
                            <div
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                                isMe
                                  ? 'bg-amber-400/20 text-amber-100 border border-amber-300/30'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>Action Required: Missing Information / Docs Requested</span>
                            </div>
                          )}

                          {msg.message_type === 'details_provided' && (
                            <div
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                                isMe
                                  ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/30'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Deliverable / Details Provided for Review</span>
                            </div>
                          )}

                          {msg.message_type === 'review_feedback' && (
                            <div
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                                isMe
                                  ? 'bg-sky-400/20 text-sky-100 border border-sky-300/30'
                                  : 'bg-sky-50 text-sky-800 border border-sky-200'
                              }`}
                            >
                              <FileCheck2 className="w-4 h-4 text-sky-500 shrink-0" />
                              <span>Evaluation & Review Feedback</span>
                            </div>
                          )}

                          {/* Message Content */}
                          <p className="whitespace-pre-wrap">{msg.message}</p>

                          {/* Attached Deliverable Document Card */}
                          {msg.attachment && (
                            <div
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                isMe
                                  ? 'bg-white/10 border-white/20 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className={`w-4 h-4 shrink-0 ${isMe ? 'text-cyan-200' : 'text-blue-600'}`} />
                                <div className="min-w-0">
                                  <p className="font-bold truncate" title={msg.attachment.file_name}>
                                    {msg.attachment.file_name}
                                  </p>
                                  <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                                    {msg.attachment.file_size}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(msg.attachment!.id, msg.attachment!.file_name)}
                                disabled={downloadingAttachmentId === msg.attachment.id}
                                className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition flex items-center gap-1 shrink-0 cursor-pointer ${
                                  isMe
                                    ? 'bg-white text-blue-700 hover:bg-slate-100 disabled:opacity-75'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-75'
                                }`}
                              >
                                <Download className="w-3 h-3" />
                                <span>{downloadingAttachmentId === msg.attachment.id ? 'Downloading...' : 'Download'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Work Action Chips & Message Composer */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2.5">
                {/* Work Context Action Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    {activeThreadData.is_overseer ? 'Reviewer Actions:' : 'Quick Work Actions:'}
                  </span>

                  {activeThreadData.is_overseer ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPrompt(
                            'missing_details_request',
                            'Senior Review Notice: Please provide the missing specifications, edge case handling, and required documents for this branch.'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Request Missing Specs from Team</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPrompt(
                            'review_feedback',
                            'Review Evaluation Feedback: I have reviewed your branch progress. Please make the recommended adjustments before final submission.'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <FileCheck2 className="w-3 h-3 text-indigo-600" />
                        <span>Post Review Feedback</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPrompt(
                            'details_provided',
                            'Approved by Reviewer: Branch deliverables meet acceptance criteria. Approved to proceed.'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Approve Deliverables</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPrompt(
                            'missing_details_request',
                            'Please provide the missing specifications and document details for this branch so work can proceed.'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Request Missing Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPrompt(
                            'details_provided',
                            'I have updated the requirements and uploaded the required documents for your review.'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Provide Details & Docs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPrompt(
                            'review_feedback',
                            'Review completed. Please see my notes and adjust accordingly.'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <FileCheck2 className="w-3 h-3 text-indigo-600" />
                        <span>Submit Review Feedback</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Selected File Preview Pill */}
                {selectedFile && (
                  <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-blue-600">
                        ({Math.round(selectedFile.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 hover:bg-blue-100 rounded-lg text-blue-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Message Input Box */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* File Upload Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Attach Work Document / Deliverable"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder={
                        activeThreadData.is_overseer
                          ? 'Post review remarks, guidance, or missing details request to this branch...'
                          : messageType === 'missing_details_request'
                          ? 'Specify missing details or requirements needed...'
                          : messageType === 'details_provided'
                          ? 'Describe provided details or attached docs...'
                          : 'Type a message to discuss this branch...'
                      }
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={sendingMessage || uploadingFile || (!messageInput.trim() && !selectedFile)}
                    className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {sendingMessage ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Send</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

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

export default MessagesPage;
