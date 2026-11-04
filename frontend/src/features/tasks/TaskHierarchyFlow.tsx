import React, { useState } from 'react';
import type { Task } from '../../api/tasks';
import {
  GitBranch,
  Crown,
  Users,
  Layers,
  Box,
  Info,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface TaskHierarchyFlowProps {
  task: Task;
  onSelectBranch?: (branchId: number) => void;
  onOpenAssignModal?: (branchId?: number) => void;
  currentUser?: any;
}

// Demo prototype data matching the reference infographic
const REFERENCE_PROTOTYPE = {
  task_code: 'QL-0001',
  title: 'Project: QuickLifeNow v2',
  creator: { name: 'Ravi Singh', role: 'Creator / Manager' },
  level2: [
    {
      code: 'QL-0001.1',
      title: 'Frontend Module',
      owner: { name: 'Aman Kumar', role: 'Team Lead' },
      level3: [
        {
          code: 'QL-0001.1.1',
          title: 'UI Development',
          owner: { name: 'Rohit Mehta', role: 'Sub Lead' },
          level4: [
            { code: 'QL-0001.1.1.1', title: 'UI Pages', owner: { name: 'Karan', role: 'Executor' } },
            { code: 'QL-0001.1.1.2', title: 'Components', owner: { name: 'Anjali', role: 'Executor' } },
          ],
        },
        {
          code: 'QL-0001.1.2',
          title: 'Integration & API',
          owner: { name: 'Neha Rawat', role: 'Sub Lead' },
          level4: [
            { code: 'QL-0001.1.2.1', title: 'API Connect', owner: { name: 'Deepak', role: 'Executor' } },
            { code: 'QL-0001.1.2.2', title: 'Payment Int.', owner: { name: 'Simran', role: 'Executor' } },
          ],
        },
      ],
    },
    {
      code: 'QL-0001.2',
      title: 'Backend Module',
      owner: { name: 'Pooja Sharma', role: 'Team Lead' },
      level3: [
        {
          code: 'QL-0001.2.1',
          title: 'Database Design',
          owner: { name: 'Vikram Singh', role: 'Sub Lead' },
          level4: [
            { code: 'QL-0001.2.1.1', title: 'Schema Design', owner: { name: 'Manish', role: 'Executor' } },
            { code: 'QL-0001.2.1.2', title: 'Data Migration', owner: { name: 'Ritika', role: 'Executor' } },
          ],
        },
        {
          code: 'QL-0001.2.2',
          title: 'Testing & QA',
          owner: { name: 'Priya Verma', role: 'Sub Lead' },
          level4: [
            { code: 'QL-0001.2.2.1', title: 'Test Cases', owner: { name: 'Saurav', role: 'Executor' } },
            { code: 'QL-0001.2.2.2', title: 'Bug Fixes', owner: { name: 'Isha', role: 'Executor' } },
          ],
        },
      ],
    },
  ],
};

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarBg(name: string): string {
  const colors = [
    'bg-purple-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-indigo-600',
    'bg-rose-600',
    'bg-cyan-600',
    'bg-teal-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const TaskHierarchyFlow: React.FC<TaskHierarchyFlowProps> = ({
  task,
  onSelectBranch,
  onOpenAssignModal,
  currentUser: _currentUser,
}) => {
  const [viewMode, setViewMode] = useState<'live' | 'reference'>('live');

  const baseCode = task.hierarchical_code || `QL-${String(task.id).padStart(4, '0')}`;
  const branches = task.branches || [];

  // Group real branches by parent / level
  const level2Branches = branches.filter((b) => (b.level ?? 2) === 2);
  const level3Branches = branches.filter((b) => b.level === 3);
  const level4Branches = branches.filter((b) => b.level === 4);

  const l2Count = level2Branches.length;
  const l3Count = level3Branches.length;
  const l4Count = level4Branches.length;

  const hasAnyBranches = branches.length > 0;

  // Build tree structure for live task
  const liveTree = {
    task_code: baseCode,
    code: baseCode,
    title: task.title,
    status: task.status,
    creator: {
      name: task.creator?.name || 'Task Creator',
      role: 'Creator / Manager',
    },
    level2: level2Branches.map((l2, idx) => {
      const l2Code = l2.hierarchical_code || `${baseCode}.${idx + 1}`;
      const myLevel3 = level3Branches.filter(
        (l3) => l3.parent_branch_id === l2.id || l3.hierarchical_code?.startsWith(`${l2Code}.`)
      );

      return {
        id: l2.id,
        raw: l2,
        code: l2Code,
        title: l2.title,
        status: l2.status,
        owner: {
          name: l2.owner?.name || 'Team Lead',
          role: l2.owner?.role || 'Team Lead',
        },
        level3: myLevel3.map((l3, l3Idx) => {
          const l3Code = l3.hierarchical_code || `${l2Code}.${l3Idx + 1}`;
          const myLevel4 = level4Branches.filter(
            (l4) => l4.parent_branch_id === l3.id || l4.hierarchical_code?.startsWith(`${l3Code}.`)
          );

          return {
            id: l3.id,
            raw: l3,
            code: l3Code,
            title: l3.title,
            status: l3.status,
            owner: {
              name: l3.owner?.name || 'Sub Lead',
              role: l3.owner?.role || 'Sub Lead',
            },
            level4: myLevel4.map((l4, l4Idx) => ({
              id: l4.id,
              raw: l4,
              code: l4.hierarchical_code || `${l3Code}.${l4Idx + 1}`,
              title: l4.title,
              status: l4.status,
              owner: {
                name: l4.owner?.name || 'Executor',
                role: l4.owner?.role || 'Executor',
              },
            })),
          };
        }),
      };
    }),
  };

  const isLive = viewMode === 'live' && hasAnyBranches;
  const activeData = isLive ? liveTree : REFERENCE_PROTOTYPE;

  const summaryL1 = 1;
  const summaryL2 = isLive ? l2Count : 2;
  const summaryL3 = isLive ? l3Count : 4;
  const summaryL4 = isLive ? l4Count : 8;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden text-slate-800">
      {/* 1. Header Banner */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-white to-purple-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-purple-700 uppercase">QuickLifeNow</span>
              <span className="text-xs text-slate-400 font-medium">Task Management</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              4-Level Task Assignment Flow (Hierarchical)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              One task → multiple levels of delegation (1 → 2 → 4 → 8)
            </p>
          </div>
        </div>

        {/* View Mode Toggle Pill */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl self-start md:self-auto border border-slate-200/60">
          <button
            type="button"
            onClick={() => setViewMode('live')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'live'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${hasAnyBranches ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span>Active Task Flow ({branches.length} branches)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('reference')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'reference'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Reference Architecture</span>
          </button>
        </div>
      </div>

      {/* Notice if task has no branches yet */}
      {viewMode === 'live' && !hasAnyBranches && (
        <div className="m-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              This task currently has no sub-delegations assigned yet. Showing the <strong>Reference 4-Level Architecture</strong> below.
              You can click <strong>"+ Assign (1 or More)"</strong> above to start delegating to Team Leads (Level 2).
            </p>
          </div>
          {onOpenAssignModal && (
            <button
              type="button"
              onClick={() => onOpenAssignModal()}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition whitespace-nowrap self-start sm:self-auto"
            >
              + Assign Team Leads
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Tree Area on Left, Summary Cards on Right */}
      <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8 items-start">
        {/* Left Column (3/4 width): 4-Level Visual Tree */}
        <div className="xl:col-span-3 space-y-8 overflow-x-auto pb-4">
          <div className="min-w-[850px] space-y-8">
            {/* LEVEL 1: Main Task */}
            <div className="flex items-center gap-6">
              {/* Level indicator pill on the left */}
              <div className="w-44 shrink-0 flex items-center gap-3">
                <div className="w-full">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-600 text-white shadow-xs">
                    Level 1
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1">Creator / Owner</div>
                  <div className="text-[11px] text-slate-400 font-medium">(Main Task)</div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-purple-100 shrink-0" />
              </div>

              {/* Level 1 Node Card */}
              <div className="flex-1 flex justify-center">
                <div className="relative group bg-white border-2 border-purple-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition max-w-md w-full ring-4 ring-purple-50/50">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-full ${getAvatarBg(
                        activeData.creator.name
                      )} flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-white shrink-0`}
                    >
                      {getInitials(activeData.creator.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 font-mono">
                          {activeData.task_code || baseCode}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white shadow-xs">
                          Level 1
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 truncate" title={activeData.title}>
                        {activeData.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium truncate">
                        {activeData.creator.name} ({activeData.creator.role})
                      </p>
                    </div>
                  </div>

                  {/* Downward Connector to Level 2 */}
                  <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                    <div className="w-0.5 h-8 bg-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* LEVEL 2: Team Leads */}
            <div className="flex items-start gap-6 pt-2">
              {/* Level indicator pill */}
              <div className="w-44 shrink-0 flex items-center gap-3 pt-4">
                <div className="w-full">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-600 text-white shadow-xs">
                    Level 2
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1">Team Leads</div>
                  <div className="text-[11px] text-slate-400 font-medium">({summaryL2} Assignments)</div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-4 ring-sky-100 shrink-0" />
              </div>

              {/* Level 2 Cards Row */}
              <div className="flex-1">
                {/* Horizontal branching connector line across Level 2 */}
                <div className="relative mb-3">
                  <div className="h-0.5 bg-gradient-to-r from-sky-400 via-purple-400 to-sky-400 mx-16" />
                </div>

                <div className={`grid gap-4 ${activeData.level2.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {activeData.level2.map((lead: any, l2Idx: number) => (
                    <div
                      key={lead.code || l2Idx}
                      onClick={() => lead.id && onSelectBranch?.(lead.id)}
                      className={`relative group bg-sky-50/40 border border-sky-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md transition hover:border-sky-400 ${
                        lead.id ? 'cursor-pointer' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-full ${getAvatarBg(
                            lead.owner.name
                          )} flex items-center justify-center text-white font-black text-xs shadow-sm ring-2 ring-white shrink-0`}
                        >
                          {getInitials(lead.owner.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100/80 text-sky-800 border border-sky-200 font-mono">
                              {lead.code}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white shadow-xs">
                              Level 2
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 truncate">{lead.title}</h4>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            {lead.owner.name} ({lead.owner.role})
                          </p>
                        </div>
                      </div>

                      {/* Connectors to Level 3 */}
                      <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                        <div className="w-0.5 h-8 bg-sky-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LEVEL 3: Sub Leads */}
            <div className="flex items-start gap-6 pt-2">
              {/* Level indicator pill */}
              <div className="w-44 shrink-0 flex items-center gap-3 pt-4">
                <div className="w-full">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs">
                    Level 3
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1">Sub Leads</div>
                  <div className="text-[11px] text-slate-400 font-medium">({summaryL3} Assignments)</div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
              </div>

              {/* Level 3 Cards Row */}
              <div className="flex-1">
                <div className="relative mb-3">
                  <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-400 mx-8" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {activeData.level2.map((l2: any, l2Idx: number) => {
                    const l3List = l2.level3 || [];
                    return (
                      <div key={l2Idx} className="grid grid-cols-2 gap-3">
                        {l3List.map((sub: any, sIdx: number) => (
                          <div
                            key={sub.code || sIdx}
                            onClick={() => sub.id && onSelectBranch?.(sub.id)}
                            className={`relative group bg-emerald-50/40 border border-emerald-200/90 rounded-2xl p-3 shadow-xs hover:shadow-md transition hover:border-emerald-400 ${
                              sub.id ? 'cursor-pointer' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-9 h-9 rounded-full ${getAvatarBg(
                                  sub.owner.name
                                )} flex items-center justify-center text-white font-black text-[11px] shadow-xs ring-2 ring-white shrink-0`}
                              >
                                {getInitials(sub.owner.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 font-mono mb-0.5">
                                  {sub.code}
                                </span>
                                <h5 className="text-[11px] font-bold text-slate-900 truncate">{sub.title}</h5>
                                <p className="text-[10px] text-slate-500 font-medium truncate">{sub.owner.name}</p>
                              </div>
                            </div>
                            <div className="mt-1 flex justify-end">
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-600 text-white">
                                Level 3
                              </span>
                            </div>

                            {/* Downward Connector to Level 4 */}
                            <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                              <div className="w-0.5 h-8 bg-emerald-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LEVEL 4: Executors */}
            <div className="flex items-start gap-6 pt-2">
              {/* Level indicator pill */}
              <div className="w-44 shrink-0 flex items-center gap-3 pt-3">
                <div className="w-full">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-600 text-white shadow-xs">
                    Level 4
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1">Executors</div>
                  <div className="text-[11px] text-slate-400 font-medium">({summaryL4} Assignments)</div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100 shrink-0" />
              </div>

              {/* Level 4 Cards Row (8 cards) */}
              <div className="flex-1">
                <div className="relative mb-3">
                  <div className="h-0.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-400 mx-4" />
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {activeData.level2.flatMap((l2: any) =>
                    (l2.level3 || []).flatMap((l3: any) =>
                      (l3.level4 || []).map((exec: any, eIdx: number) => (
                        <div
                          key={exec.code || eIdx}
                          onClick={() => exec.id && onSelectBranch?.(exec.id)}
                          className={`bg-amber-50/50 border border-amber-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-sm transition hover:border-amber-400 flex flex-col items-center text-center ${
                            exec.id ? 'cursor-pointer' : ''
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full ${getAvatarBg(
                              exec.owner.name
                            )} flex items-center justify-center text-white font-bold text-[10px] shadow-2xs ring-1 ring-white mb-1.5`}
                          >
                            {getInitials(exec.owner.name)}
                          </div>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 font-mono mb-1 w-full truncate">
                            {exec.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-900 truncate w-full" title={exec.title}>
                            {exec.title}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium truncate w-full">
                            {exec.owner.name}
                          </span>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/4 width): Hierarchy Summary & Logic/Flow Cards */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Task Hierarchy Summary</span>
            </h2>

            <div className="space-y-3">
              {/* Level 1 Summary */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-purple-950">Level 1 - {summaryL1} Task</div>
                  <div className="text-[11px] text-purple-700 font-mono font-medium truncate">
                    {activeData.task_code || baseCode}
                  </div>
                </div>
              </div>

              {/* Level 2 Summary */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sky-50/60 border border-sky-100">
                <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-sky-950">Level 2 - {summaryL2} Assignments</div>
                  <div className="text-[11px] text-sky-700 font-mono font-medium truncate">
                    {baseCode}.1, {baseCode}.2
                  </div>
                </div>
              </div>

              {/* Level 3 Summary */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-emerald-950">Level 3 - {summaryL3} Assignments</div>
                  <div className="text-[11px] text-emerald-700 font-mono font-medium truncate">
                    {baseCode}.1.1, 1.2, 2.1, 2.2
                  </div>
                </div>
              </div>

              {/* Level 4 Summary */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Box className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-amber-950">Level 4 - {summaryL4} Assignments</div>
                  <div className="text-[11px] text-amber-700 font-mono font-medium truncate">
                    {baseCode}.1.1.1 ... {baseCode}.2.2.2
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logic / Flow Guide Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Logic / Flow</span>
            </h3>

            <div className="space-y-3">
              {[
                { step: 1, text: `Creator creates a main task (${baseCode}).` },
                { step: 2, text: 'Assigns to team leads (Level 2).' },
                { step: 3, text: 'Each lead assigns to members (Level 3).' },
                { step: 4, text: 'Each Level 3 member assigns to members (Level 4).' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full border border-blue-500 text-blue-600 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 bg-blue-50/50">
                    {item.step}
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Banner: Task ID Pattern & Scalable Note */}
      <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Progression Flow */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 mr-2">
            <Info className="w-4 h-4 text-sky-600" />
            <span>Task ID Pattern</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs font-mono">
            <span className="font-bold text-purple-700">{baseCode}</span>
            <span className="text-[10px] text-slate-400 font-sans">Main Task (Level 1)</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-sky-200 shadow-2xs font-mono">
            <span className="font-bold text-sky-700">{baseCode}.1</span>
            <span className="text-[10px] text-slate-400 font-sans">Level 2 (1st Assignee)</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs font-mono">
            <span className="font-bold text-emerald-700">{baseCode}.1.1</span>
            <span className="text-[10px] text-slate-400 font-sans">Level 3 (Child of 1.1)</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs font-mono">
            <span className="font-bold text-amber-700">{baseCode}.1.1.1</span>
            <span className="text-[10px] text-slate-400 font-sans">Level 4 (Child of 1.1.1)</span>
          </div>
        </div>

        {/* Right: Scalable Note */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-900 text-xs shrink-0">
          <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
          <div>
            <span className="font-bold">Scalable:</span>{' '}
            <span className="text-purple-800">
              You can assign more than 2 at any level (e.g., 3, 4, 5... as per requirement up to Level 4).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskHierarchyFlow;
