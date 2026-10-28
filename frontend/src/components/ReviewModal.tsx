import React, { useState } from 'react';
import { tasksApi } from '../api/tasks';
import type { Task, TaskSubmission } from '../api/tasks';
import { useAuth } from '../features/auth/AuthContext';
import { X, CheckCircle, AlertCircle, MessageSquare, Paperclip, FileText, Download } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  submission: TaskSubmission;
  onReviewSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  task,
  submission,
  onReviewSubmitted,
}) => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'submission' | 'comments' | 'attachments'>('submission');
  const [decision, setDecision] = useState<'approved' | 'returned'>('approved');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleDownloadAttachment = async (attachmentId: number, fileName: string) => {
    setDownloadingId(attachmentId);
    try {
      await tasksApi.downloadAttachment(attachmentId, fileName);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.response?.data?.message || 'Failed to download attachment');
    } finally {
      setDownloadingId(null);
    }
  };

  const isSelfSubmission = Boolean(
    currentUser &&
    submission.submitted_by?.id === currentUser.id &&
    currentUser.role !== 'admin' &&
    currentUser.role !== 'sub_admin'
  );

  const handleSubmitDecision = async (chosenDecision: 'approved' | 'returned') => {
    if (isSelfSubmission) {
      setError('You cannot review your own submission. The upper branch assigner or task creator must review this work.');
      return;
    }
    if (chosenDecision === 'returned' && !comments.trim()) {
      setError('Please provide comments explaining what changes or missing items are required before returning.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await tasksApi.reviewSubmission(submission.id, {
        decision: chosenDecision,
        comments: comments.trim(),
        return_to_user_id: submission.submitted_by?.id,
      });
      onReviewSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review decision');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitDecision(decision);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Review Submission</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-700">{task.task_code}</span>: {task.title}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Submitted by <span className="font-medium text-slate-600">{submission.submitted_by?.name || 'Assignee'}</span> on{' '}
              {new Date(submission.submitted_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 px-5 flex gap-4 text-xs font-semibold bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('submission')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'submission'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Submission</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'comments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments ({task.comments?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'attachments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attachments ({task.attachments?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-56 overflow-y-auto bg-slate-50/30 text-xs">
          {activeTab === 'submission' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Work Summary
              </span>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {submission.description || 'No additional submission notes provided.'}
              </p>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-3">
              {task.comments?.length === 0 ? (
                <p className="text-slate-400 italic text-center py-4">No comments on this task yet.</p>
              ) : (
                task.comments?.map((c) => (
                  <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800">{c.user?.name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600">{c.comment}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-2">
              {task.attachments?.length === 0 ? (
                <p className="text-slate-400 italic text-center py-4">No attachments uploaded.</p>
              ) : (
                task.attachments?.map((att) => (
                  <div key={att.id} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-xs truncate">{att.file_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {Math.round(att.file_size / 1024)} KB • {att.uploaded_by?.name || 'Deliverable file'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(att.id, att.file_name)}
                      disabled={downloadingId === att.id}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingId === att.id ? 'Downloading...' : 'Download'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Review Action Form */}
        <form onSubmit={handleSubmit} className="p-5 border-t border-slate-100 bg-white space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Review Comments {decision === 'returned' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={decision === 'returned' ? 'Explain what changes or missing items are required...' : 'Optional approval comments...'}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Review Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  decision === 'approved'
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="approved"
                  checked={decision === 'approved'}
                  onChange={() => setDecision('approved')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs">Approve (Move to next stage)</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  decision === 'returned'
                    ? 'border-red-500 bg-red-50/40 text-red-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="returned"
                  checked={decision === 'returned'}
                  onChange={() => setDecision('returned')}
                  className="text-red-600 focus:ring-red-500"
                />
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs">Return for Correction</span>
              </label>
            </div>
          </div>

          {isSelfSubmission && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You cannot review your own work. Your assigner (upper branch) or the task creator must review this submission.
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer order-last sm:order-first"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDecision('returned');
                  handleSubmitDecision('returned');
                }}
                disabled={loading || isSelfSubmission}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Reject work and return to submitter for correction"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Reject / Return for Correction</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecision('approved');
                  handleSubmitDecision('approved');
                }}
                disabled={loading || isSelfSubmission}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Approve work and move to reviewer pending queue"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve & Move to Pending</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
