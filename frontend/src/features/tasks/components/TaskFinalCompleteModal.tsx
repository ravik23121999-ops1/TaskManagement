import React from 'react';
import { CheckCircle2, XCircle, Paperclip, Upload, FileText } from 'lucide-react';

interface TaskFinalCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e?: React.FormEvent) => void;
  isWorkAlone: boolean;
  taskCode: string;
  taskTitle: string;
  description: string;
  setDescription: (val: string) => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  submitting: boolean;
}

export const TaskFinalCompleteModal: React.FC<TaskFinalCompleteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isWorkAlone,
  taskCode,
  taskTitle,
  description,
  setDescription,
  files,
  setFiles,
  submitting,
}) => {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-blue-600">{taskCode}</span>
            <span className="text-slate-700 font-semibold truncate">{taskTitle}</span>
          </div>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full text-[10px] border border-emerald-200 shrink-0">
            {isWorkAlone ? 'Work Alone Mode' : 'Final Sign-off'}
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Deliverables & Completion Description <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Summary of completed work</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe your final deliverables, outcome, checklist verification, or closing remarks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

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
                    setFiles((prev) => [...prev, ...newFiles]);
                  }
                }}
              />
            </label>

            {files.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {files.map((file, idx) => (
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
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
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
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Finalizing...' : 'Final Approval & Complete'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
