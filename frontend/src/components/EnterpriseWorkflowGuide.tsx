import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Activity,
  FileCheck2,
  CheckCircle2,
  Crown,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  Layers,
  Info,
} from 'lucide-react';

interface EnterpriseWorkflowGuideProps {
  metrics: {
    openTasks?: number;
    inProgress?: number;
    pendingReview?: number;
    completed?: number;
    awaitingSignoff?: number;
    myAction?: number;
  };
  isEmployeeView?: boolean;
}

export const EnterpriseWorkflowGuide: React.FC<EnterpriseWorkflowGuideProps> = ({
  metrics,
  isEmployeeView = false,
}) => {
  const navigate = useNavigate();
  const [showExplanation, setShowExplanation] = useState(false);

  const stages = [
    {
      id: 'step-1',
      stepNumber: '1',
      title: 'Created & Delegated',
      subtitle: 'Owner assigns task or sub-branches',
      count: metrics.openTasks ?? (isEmployeeView ? metrics.myAction ?? 0 : 0),
      countLabel: 'Open',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      activeRing: 'border-orange-300 group-hover:border-orange-400',
      icon: Layers,
      iconColor: 'text-orange-600 bg-orange-50',
      route: isEmployeeView ? '/tasks/pending' : '/tasks?status=pending',
      help: 'Creator initiates the task and assigns it to an operational lead or team members.',
    },
    {
      id: 'step-2',
      stepNumber: '2',
      title: 'Execution & Inquiry',
      subtitle: 'Assignee works or requests missing details',
      count: metrics.inProgress ?? 0,
      countLabel: 'Working',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      activeRing: 'border-sky-300 group-hover:border-sky-400',
      icon: Activity,
      iconColor: 'text-sky-600 bg-sky-50',
      route: '/tasks?status=in_progress',
      help: 'Assignees execute deliverables. If anything is unclear, they can click "Request Missing Details" to bounce it back to the assigner.',
    },
    {
      id: 'step-3',
      stepNumber: '3',
      title: 'Review & Quality Check',
      subtitle: 'Reviewer evaluates: Approve or Return',
      count: metrics.pendingReview ?? 0,
      countLabel: 'In Review',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      activeRing: 'border-purple-300 group-hover:border-purple-400',
      icon: FileCheck2,
      iconColor: 'text-purple-600 bg-purple-50',
      route: '/tasks/review',
      help: 'Deliverables are submitted. The reviewer inspects attachments and approves to advance, or rejects with feedback for correction.',
    },
    {
      id: 'step-4',
      stepNumber: '4',
      title: 'Final Sign-Off',
      subtitle: 'Creator validates all branch deliverables',
      count: metrics.awaitingSignoff ?? (metrics.pendingReview ? 1 : 0),
      countLabel: 'Sign-off',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      activeRing: 'border-indigo-300 group-hover:border-indigo-400',
      icon: CheckCircle2,
      iconColor: 'text-indigo-600 bg-indigo-50',
      route: '/tasks/pending',
      help: 'When all sub-branches complete and are verified, the Task Creator performs the final review and signs off.',
    },
    {
      id: 'step-5',
      stepNumber: '5',
      title: 'Completed & Archived',
      subtitle: 'Verified closure with full audit journey',
      count: metrics.completed ?? 0,
      countLabel: 'Verified',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activeRing: 'border-emerald-300 group-hover:border-emerald-400',
      icon: Crown,
      iconColor: 'text-emerald-600 bg-emerald-50',
      route: '/tasks/completed',
      help: 'Task reaches 100% completion. All milestone handovers, deliverables, and comments are permanently logged.',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_#2563eb]" />
            <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
              How Work Flows In QuickLifeNow
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              5-Stage Lifecycle
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Clear accountability at every stage: tasks flow seamlessly from Creator ➔ Assignee ➔ Reviewer ➔ Final Sign-off.
          </p>
        </div>

        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 transition cursor-pointer self-start sm:self-auto"
        >
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <span>{showExplanation ? 'Hide Guide' : 'Explain Workflow Rules'}</span>
        </button>
      </div>

      {/* Expandable Workflow Logic Guide */}
      {showExplanation && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs animate-in fade-in duration-200">
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Core Enterprise Operating Rules (No Guesswork Required):
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>1. Request Missing Details</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                If an assignee needs more information or instructions, they click <strong>"Request Missing Details"</strong>. The task automatically moves back to the assigner's pending queue until clarified.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-rose-800 mb-1">
                <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
                <span>2. Reviewer Return & Reject</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                When work is submitted for review, the reviewer can either <strong>Approve</strong> or <strong>Reject / Return</strong> with feedback. If rejected, it moves to the submitter's pending queue for correction.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-emerald-800 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>3. Multi-Level Final Sign-off</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                When sub-assignees complete their branches, the upper assignee reviews first. Once all branches pass inspection, the <strong>Task Creator</strong> performs the final verification and signs off.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5-Step Visual Stepper Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              onClick={() => navigate(stage.route)}
              className={`group relative p-3.5 rounded-xl border border-slate-200/90 hover:border-blue-400 bg-white hover:bg-gradient-to-b hover:from-white hover:to-blue-50/30 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between`}
            >
              {/* Connecting arrow indicator for desktop (except last step) */}
              {idx < stages.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 text-slate-300 group-hover:text-blue-500 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}

              <div>
                {/* Step pill & Counter */}
                <div className="flex items-center justify-between mb-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 text-[10px] font-black flex items-center justify-center transition-colors">
                    {stage.stepNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stage.badgeColor}`}
                  >
                    {stage.count} {stage.countLabel}
                  </span>
                </div>

                {/* Stage Title */}
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${stage.iconColor} group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {stage.title}
                    </h3>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {stage.subtitle}
                </p>
              </div>

              {/* Bottom Quick-Action link */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                <span>View Stage</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
