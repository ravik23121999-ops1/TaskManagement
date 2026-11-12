<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isCreator = $user && (int)$this->creator_id === (int)$user->id;
        $isAdmin = $user && ($user->role === 'admin' || $user->role === 'sub_admin');

        // Permissions for current user
        $isBranchOwner = $user && $this->branches->where('owner_id', $user->id)->isNotEmpty();
        $userActiveBranch = $user ? ($this->branches->firstWhere('owner_id', $user->id)
            ?? $this->branches->first(fn($b) => $b->assignments->contains('assigned_to_id', $user->id) || $b->collaborators->contains('user_id', $user->id))) : null;

        // An employee assigned to a branch acts as an isolated assignee.
        // Administrators and Sub-Administrators, like the Task Creator, retain organizational oversight.
        $isAssignee = $userActiveBranch && !$isCreator && !$isAdmin;
        $canOverseeAll = $isCreator || $isAdmin;

        // Strict Peer Isolation:
        // A peer assignee or collaborator must NEVER see another peer's branch work, instructions, or deliverables!
        // Only the Task Creator and Executive Admins (Overseers) see all branches.
        $visibleBranches = $this->branches;
        if (!$canOverseeAll) {
            $visibleBranches = $this->branches->filter(function ($branch) use ($user) {
                if (!$user) return false;
                $isOwner = (int)$branch->owner_id === (int)$user->id;
                $isAssignedTo = $branch->assignments->contains(fn($a) => (int)$a->assigned_to_id === (int)$user->id);
                $isAssignedBy = $branch->assignments->contains(fn($a) => (int)$a->assigned_by_id === (int)$user->id && (int)$a->assigned_to_id !== (int)$user->id);
                $isCollaborator = $branch->collaborators->contains(fn($c) => (int)$c->user_id === (int)$user->id);
                return $isOwner || $isAssignedTo || $isAssignedBy || $isCollaborator;
            })->values();
        }

        // Calculate aggregated branch completion metrics (excluding cancelled branches)
        $allBranches = $this->branches;
        $activeBranches = $allBranches->filter(fn($b) => $b->status !== 'cancelled');
        $totalBranchCount = $activeBranches->count();
        $completedBranchCount = $activeBranches->filter(fn($b) => $b->status === 'completed')->count();
        $allBranchesCompleted = ($totalBranchCount > 0 && $completedBranchCount === $totalBranchCount);

        // Calculate current owner / responsibility based on industry bottom-up delegation rules:
        // 1. Assignee is owner if they have not assigned further.
        // 2. Assigner is owner if they have not assigned further.
        // 3. Assigner who delegated further is NOT owner while subordinates are working.
        // 4. Assigner BECOMES owner after reviewing and approving subordinate assignees' tasks.
        // 5. Creator is owner when all branches are completed or handling method is work_alone.
        // STRICT PEER ISOLATION:
        // When viewing as an assignee (!canOverseeAll), an assignee must NEVER see other peer assignees!
        // Their ownership scope is strictly restricted to branches visible to them (themselves and any subordinates).
        $branchesForOwnership = $canOverseeAll ? $allBranches : $visibleBranches;
        $rawOwners = \App\Services\TaskHierarchyService::determineCurrentOwners($this->resource, $branchesForOwnership);

        $allowedUserIds = null;
        if (!$canOverseeAll && $user) {
            $allowedUserIds = collect([
                (int)$user->id,
                (int)$this->creator_id,
            ]);

            if ($userActiveBranch) {
                $currAssign = $userActiveBranch->assignments->firstWhere('is_current', true);
                if ($currAssign?->assigned_by_id) {
                    $allowedUserIds->push((int)$currAssign->assigned_by_id);
                }
                foreach ($visibleBranches as $vb) {
                    if ($vb->owner_id) {
                        $allowedUserIds->push((int)$vb->owner_id);
                    }
                }
            }
            $allowedUserIds = $allowedUserIds->filter()->unique()->all();

            $rawOwners = array_values(array_filter($rawOwners, function ($u) use ($allowedUserIds) {
                return in_array((int)$u->id, $allowedUserIds);
            }));

            // Fallback: if empty, default to user themselves or creator
            if (empty($rawOwners)) {
                $rawOwners = $userActiveBranch && (int)$userActiveBranch->owner_id === (int)$user->id
                    ? [$user]
                    : ($this->creator ? [$this->creator] : []);
            }
        }

        $currentOwners = array_values(array_map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
            ];
        }, $rawOwners));

        $currentOwner = $currentOwners[0] ?? null;

        // Calculate progress percentage
        $progress = 0;
        if ($this->status === 'completed') {
            $progress = 100;
        } elseif ($this->handling_method === 'work_alone') {
            if ($this->status === 'in_progress') $progress = 50;
            elseif ($this->status === 'review') $progress = 80;
            elseif ($this->status === 'pending') $progress = 10;
        } elseif (!$canOverseeAll && $userActiveBranch) {
            // Isolated progress specifically for this assignee's assigned work
            if ($userActiveBranch->status === 'completed') $progress = 100;
            elseif ($userActiveBranch->status === 'review') $progress = 90;
            elseif ($userActiveBranch->status === 'in_progress') $progress = 50;
            else $progress = 10;
        } else {
            $activeVisibleBranches = $visibleBranches->filter(fn($b) => $b->status !== 'cancelled');
            $totalBranches = $activeVisibleBranches->count();
            if ($totalBranches > 0) {
                $completedBranches = $activeVisibleBranches->where('status', 'completed')->count();
                $progress = (int) round(($completedBranches / $totalBranches) * 100);
                if ($this->status === 'review' && $progress < 90) $progress = 90;
            } elseif ($allBranches->where('status', 'cancelled')->isNotEmpty()) {
                $progress = 0;
            } else {
                $progress = 20;
            }
        }

        // Aggregated progress summary (total represents active non-cancelled assignments)
        $activeAllBranches = $allBranches->filter(fn($b) => $b->status !== 'cancelled');
        $progressSummary = [
            'total' => $activeAllBranches->count(),
            'completed' => $activeAllBranches->where('status', 'completed')->count(),
            'in_progress' => $activeAllBranches->where('status', 'in_progress')->count(),
            'pending_review' => $activeAllBranches->where('status', 'review')->count(),
            'pending' => $activeAllBranches->where('status', 'pending')->count(),
            'cancelled' => $allBranches->where('status', 'cancelled')->count(),
        ];
        
        // Determine active Clarification Request vs active Return for Correction
        $latestClarificationComment = $this->comments->filter(function ($c) {
            return str_starts_with($c->comment, '❓ Missing Details Requested');
        })->sortByDesc('created_at')->first();

        $latestDetailsProvidedComment = $this->comments->filter(function ($c) {
            return str_starts_with($c->comment, '💡 Details Provided');
        })->sortByDesc('created_at')->first();

        $latestSubmission = $this->submissions->sortByDesc('submitted_at')->first();

        $latestReturnReview = $this->submissions->flatMap->reviews->filter(function ($r) {
            return in_array($r->decision, ['returned', 'rejected']);
        })->sortByDesc('reviewed_at')->first();

        $clarificationBranch = $this->branches->firstWhere('status', 'post_comment');
        $isPostComment = ($this->status === 'post_comment' || $clarificationBranch) && !in_array($this->status, ['completed', 'cancelled', 'on_hold']);

        $isClarificationActive = false;
        $isReturnActive = false;

        if ($isPostComment) {
            // Check status history for the definitive latest transition into post_comment
            $latestPostCommentHistory = $this->statusHistory
                ->filter(fn($h) => $h->to_status === 'post_comment')
                ->sortByDesc('id')
                ->first();

            if ($latestPostCommentHistory) {
                if (str_starts_with($latestPostCommentHistory->reason ?? '', 'Missing Details Requested')) {
                    $isClarificationActive = true;
                } elseif (str_starts_with($latestPostCommentHistory->reason ?? '', 'Returned for correction')) {
                    $isReturnActive = true;
                }
            }

            // Fallback if status history reason not matched
            if (!$isClarificationActive && !$isReturnActive) {
                if ($latestReturnReview && (!$latestClarificationComment || $latestReturnReview->reviewed_at >= $latestClarificationComment->created_at)) {
                    $isReturnActive = true;
                } elseif ($latestClarificationComment && (!$latestDetailsProvidedComment || $latestDetailsProvidedComment->created_at < $latestClarificationComment->created_at)) {
                    $isClarificationActive = true;
                }
            }
        }

        $canSubmit = false;
        if ($this->status !== 'completed' && $this->status !== 'cancelled' && $this->status !== 'on_hold') {
            if ($this->handling_method === 'work_alone') {
                $canSubmit = false; // Work alone directly uses Final Approval & Complete
            } else {
                $canSubmit = $isBranchOwner && $userActiveBranch && in_array($userActiveBranch->status, ['pending', 'in_progress', 'post_comment']) && !$isClarificationActive;
            }
        }

        // Bottom-Up Hierarchy Dependency:
        // An intermediate assigner who has delegated subtasks to team members below them
        // CANNOT submit their own work deliverables upward until all delegated subtasks are completed and approved!
        $userBranchIds = $userActiveBranch ? [$userActiveBranch->id] : ($user ? $this->branches->where('owner_id', $user->id)->pluck('id')->all() : []);

        $delegatedChildBranches = $this->branches->filter(function ($b) use ($user, $userBranchIds) {
            if (!$user) return false;
            if ((int)$b->owner_id === (int)$user->id) return false;
            if ($b->status === 'cancelled') return false;

            if ($b->parent_assignment_id && $b->parentAssignment && in_array($b->parentAssignment->task_branch_id, $userBranchIds)) {
                return true;
            }

            $curAssign = $b->assignments->firstWhere('is_current', true);
            if ($curAssign && (int)$curAssign->assigned_by_id === (int)$user->id) {
                return true;
            }

            return false;
        });

        $uncompletedChildBranches = $delegatedChildBranches->filter(fn($b) => $b->status !== 'completed');
        $hasUncompletedDelegatedBranches = $uncompletedChildBranches->isNotEmpty();

        $cannotSubmitReason = null;
        if ($canSubmit && $hasUncompletedDelegatedBranches) {
            $canSubmit = false;
            $cannotSubmitReason = "You have {$uncompletedChildBranches->count()} delegated subtask(s) still in progress or awaiting your review. Under workflow policy, you must review and approve all subordinate deliverables before submitting to your assigner.";
        }

        // Review permissions:
        // A user can review IF there is an active review needed, AND:
        // - Submitter CANNOT review their own submission!
        // - User is Admin/Sub-admin, OR
        // - User is the direct Assigner who assigned the branch to the submitter, OR
        // - User is the collaborator inviter who invited the submitter, OR
        // - If task has no branch assignment, Task Creator (and not reviewing their own work_alone completion)
        $canReview = false;
        if ($user && ($this->status === 'review' || $this->branches->where('status', 'review')->isNotEmpty() || $this->submissions->where('reviews', 'empty')->isNotEmpty())) {
            // Find unreviewed submissions
            $pendingSubmissions = $this->submissions->filter(fn($s) => $s->reviews->isEmpty());

            if ($pendingSubmissions->isNotEmpty()) {
                foreach ($pendingSubmissions as $sub) {
                    // Submitter CANNOT review their own work
                    if ((int)$sub->submitted_by_id === (int)$user->id) {
                        continue;
                    }

                    if ($isAdmin) {
                        $canReview = true;
                        break;
                    }

                    $subBranch = $sub->branch ?? $this->branches->firstWhere('id', $sub->task_branch_id);
                    if ($subBranch) {
                        $currentAssignment = $subBranch->assignments->firstWhere('is_current', true);
                        $isBranchAssigner = $currentAssignment && (int)$currentAssignment->assigned_by_id === (int)$user->id && (int)$currentAssignment->assigned_to_id !== (int)$user->id;
                        $isCollabInviter = $subBranch->collaborators->where('invited_by_id', $user->id)->where('user_id', '!=', $user->id)->isNotEmpty();

                        if ($isBranchAssigner || $isCollabInviter) {
                            $canReview = true;
                            break;
                        }
                    } else {
                        // Direct task-level submission without separate branches
                        if ($isCreator && $this->handling_method !== 'work_alone') {
                            $canReview = true;
                            break;
                        }
                    }
                }
            } else {
                // If branches are marked in review
                $branchesInReview = $this->branches->where('status', 'review');
                foreach ($branchesInReview as $b) {
                    // Cannot review if current user is the owner of this branch in review
                    if ((int)$b->owner_id === (int)$user->id) {
                        continue;
                    }

                    if ($isAdmin) {
                        $canReview = true;
                        break;
                    }

                    $currentAssignment = $b->assignments->firstWhere('is_current', true);
                    $isBranchAssigner = $currentAssignment && (int)$currentAssignment->assigned_by_id === (int)$user->id && (int)$currentAssignment->assigned_to_id !== (int)$user->id;
                    $isCollabInviter = $b->collaborators->where('invited_by_id', $user->id)->where('user_id', '!=', $user->id)->isNotEmpty();

                    if ($isBranchAssigner || $isCollabInviter) {
                        $canReview = true;
                        break;
                    }
                }
            }
        }

        // Final check / completion permission
        $canFinalSubmit = false;
        if (($isCreator || $isAdmin) && $this->status !== 'completed' && $this->status !== 'cancelled') {
            if ($this->handling_method === 'work_alone') {
                $canFinalSubmit = true;
            } else {
                $activeBranches = $this->branches->filter(fn($b) => $b->status !== 'cancelled');
                $totalBranches = $activeBranches->count();
                $completedBranches = $activeBranches->where('status', 'completed')->count();
                if ($totalBranches > 0 && $completedBranches === $totalBranches) {
                    $canFinalSubmit = true;
                }
            }
        }

        $subAdminCanCancel = $user && $user->role === 'sub_admin' && \App\Models\SystemSetting::get('allow_subadmin_cancel_tasks', false);
        $subAdminCanDelete = $user && $user->role === 'sub_admin' && \App\Models\SystemSetting::get('allow_subadmin_delete_records', false);
        $isFullAdmin = $user && $user->role === 'admin';

        $canCancel = ($isCreator || $isFullAdmin || $subAdminCanCancel) && !in_array($this->status, ['completed', 'cancelled']);
        $canDelete = ($isFullAdmin || $subAdminCanDelete);
        $canHold = \App\Services\TaskHierarchyService::canUserHoldTask($this->resource, $user);
        $canResume = \App\Services\TaskHierarchyService::canUserResumeTask($this->resource, $user);
        $canEdit = ($isCreator || $isAdmin) && !in_array($this->status, ['completed', 'cancelled']);

        // Request missing details permission:
        // Assignee who has branch in pending, in_progress, or post_comment (returned) can request clarification
        $canRequestDetails = false;
        if ($user && !in_array($this->status, ['completed', 'cancelled', 'on_hold'])) {
            if ($this->handling_method !== 'work_alone') {
                $userBranch = $userActiveBranch ?? $this->branches->first(function ($b) use ($user) {
                    return $b->collaborators->where('user_id', $user->id)->isNotEmpty();
                });
                if ($userBranch && in_array($userBranch->status, ['pending', 'in_progress', 'post_comment']) && !$isClarificationActive) {
                    $canRequestDetails = true;
                }
            }
        }

        // Provide missing details permission:
        // Only active if clarification is actively requested and user is not the person who asked
        $canProvideDetails = false;
        if ($user && $isClarificationActive) {
            $questionUserId = $latestClarificationComment?->user_id;
            if ((int)$user->id !== (int)$questionUserId) {
                if ($isAdmin || $isCreator) {
                    $canProvideDetails = true;
                } elseif ($clarificationBranch) {
                    $curAssign = $clarificationBranch->assignments->firstWhere('is_current', true);
                    if ($curAssign && (int)$curAssign->assigned_by_id === (int)$user->id) {
                        $canProvideDetails = true;
                    }
                }
            }
        }

        // Build hierarchical subtask structure & codes (1.1, 1.2, 1.1.1, etc.)
        $hierarchyData = \App\Services\TaskHierarchyService::buildHierarchy($this->resource, $allBranches, 'T');
        $branchMeta = $hierarchyData['branch_meta'];

        return [
            'id' => $this->id,
            'task_code' => sprintf('T-%03d', $this->id),
            'hierarchical_code' => sprintf('T-%03d', $this->id),
            'hierarchy_summary' => $hierarchyData['summary'],
            'hierarchy_tree' => $hierarchyData['tree'],
            'title' => $this->title,
            'description' => $this->description,
            'expected_result' => $this->expected_result,
            'acceptance_criteria' => $this->acceptance_criteria,
            'handling_method' => $this->handling_method,
            'priority' => $this->priority,
            'status' => $this->status,
            'start_date' => $this->start_date?->toISOString(),
            'due_date' => $this->due_date?->toISOString(),
            'is_overdue' => (bool) ($this->due_date && $this->due_date->isPast() && !in_array($this->status, ['completed', 'cancelled', 'on_hold'])),
            'completed_at' => $this->completed_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'cancellation_reason' => $this->cancellation_reason,
            'cancelled_by' => $this->cancelledBy ? [
                'id' => $this->cancelledBy->id,
                'name' => $this->cancelledBy->name,
                'email' => $this->cancelledBy->email,
                'role' => $this->cancelledBy->role,
            ] : null,
            'progress' => $progress,
            'progress_summary' => $progressSummary,
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
                'role' => $this->creator->role,
            ] : null,
            'current_owner' => $currentOwner,
            'current_owners' => $currentOwners,
            'is_direct_delegation' => ($this->handling_method === 'assign') && (
                $this->branches->count() <= 1 && (
                    !$this->branches->first() || ($this->branches->first()->share_parent_details ?? true)
                ) && (
                    !$this->branches->first() || $this->branches->first()->title === $this->title
                )
            ),
            'has_subtasks' => ($this->handling_method === 'assign' && !(
                $this->branches->count() <= 1 && (
                    !$this->branches->first() || ($this->branches->first()->share_parent_details ?? true)
                ) && (
                    !$this->branches->first() || $this->branches->first()->title === $this->title
                )
            )) || ($this->handling_method === 'collaborate' && $this->branches->count() > 1),
            'is_ready_for_final_signoff' => ($this->handling_method !== 'work_alone') && ($totalBranchCount > 0 && $completedBranchCount === $totalBranchCount) && !in_array($this->status, ['completed', 'cancelled']),
            'all_branches_completed' => ($totalBranchCount > 0 && $completedBranchCount === $totalBranchCount),
            'department' => $this->department ? [
                'id' => $this->department->id,
                'name' => $this->department->name,
            ] : null,
            'is_peer_isolated' => !$canOverseeAll,
            'my_branch' => $userActiveBranch ? [
                'id' => $userActiveBranch->id,
                'level' => $branchMeta[$userActiveBranch->id]['level'] ?? 2,
                'level_name' => $branchMeta[$userActiveBranch->id]['level_name'] ?? 'Subtask',
                'dot_code' => $branchMeta[$userActiveBranch->id]['dot_code'] ?? '1.1',
                'hierarchical_code' => $branchMeta[$userActiveBranch->id]['hierarchical_code'] ?? sprintf('T-%03d.1', $this->id),
                'parent_branch_id' => $branchMeta[$userActiveBranch->id]['parent_branch_id'] ?? null,
                'title' => $userActiveBranch->title,
                'description' => $userActiveBranch->description,
                'expected_result' => $userActiveBranch->expected_result,
                'acceptance_criteria' => $userActiveBranch->acceptance_criteria,
                'status' => $userActiveBranch->status,
                'start_date' => $userActiveBranch->start_date?->toISOString(),
                'due_date' => $userActiveBranch->due_date?->toISOString(),
                'completed_at' => $userActiveBranch->completed_at?->toISOString(),
                'assigned_by' => $userActiveBranch->assignments->firstWhere('is_current', true)?->assignedBy ? [
                    'id' => $userActiveBranch->assignments->firstWhere('is_current', true)->assignedBy->id,
                    'name' => $userActiveBranch->assignments->firstWhere('is_current', true)->assignedBy->name,
                    'role' => $userActiveBranch->assignments->firstWhere('is_current', true)->assignedBy->role,
                ] : null,
                'share_parent_details' => $userActiveBranch->share_parent_details ?? true,
                'can_assign_further' => ($branchMeta[$userActiveBranch->id]['level'] ?? 2) < 4 && ($userActiveBranch->can_assign_further ?? true),
                'has_uncompleted_delegated_subtasks' => $hasUncompletedDelegatedBranches,
                'uncompleted_delegated_subtasks_count' => $uncompletedChildBranches->count(),
                'attachments' => $this->attachments->where('task_branch_id', $userActiveBranch->id)->values()->map(fn($att) => $this->formatAttachment($att)),
                'submissions' => $this->submissions->where('task_branch_id', $userActiveBranch->id)->sortByDesc('submitted_at')->values()->map(fn($sub) => [
                    'id' => $sub->id,
                    'description' => $sub->description,
                    'is_final' => (bool)$sub->is_final,
                    'submitted_at' => $sub->submitted_at?->toISOString(),
                    'submitted_by' => $sub->submittedBy ? [
                        'id' => $sub->submittedBy->id,
                        'name' => $sub->submittedBy->name,
                    ] : null,
                    'reviews' => $sub->reviews->map(fn($rev) => [
                        'id' => $rev->id,
                        'decision' => $rev->decision,
                        'comments' => $rev->comments,
                        'reviewed_at' => $rev->reviewed_at?->toISOString(),
                        'reviewer' => $rev->reviewer ? [
                            'id' => $rev->reviewer->id,
                            'name' => $rev->reviewer->name,
                        ] : null,
                    ]),
                ]),
            ] : null,
            'delegation_prerequisites' => [
                'has_delegated_subtasks' => $delegatedChildBranches->isNotEmpty(),
                'has_uncompleted_subtasks' => $hasUncompletedDelegatedBranches,
                'uncompleted_count' => $uncompletedChildBranches->count(),
                'pending_review_count' => $uncompletedChildBranches->where('status', 'review')->count(),
                'in_progress_count' => $uncompletedChildBranches->whereIn('status', ['pending', 'in_progress', 'post_comment'])->count(),
                'subtasks' => $uncompletedChildBranches->map(fn($b) => [
                    'id' => $b->id,
                    'title' => $b->title,
                    'owner_name' => $b->owner?->name ?? 'Teammate',
                    'status' => $b->status,
                ])->values()->all(),
            ],
            'branches' => $visibleBranches->map(function ($branch) use ($branchMeta) {
                $meta = $branchMeta[$branch->id] ?? [
                    'level' => 2,
                    'level_name' => 'Team Lead',
                    'hierarchical_code' => sprintf('QL-%04d.%d', $this->id, $branch->id),
                    'parent_branch_id' => null,
                ];
                $currentAssignment = $branch->assignments->firstWhere('is_current', true);
                $assignedBy = $currentAssignment?->assignedBy;
                $branchAttachments = $this->attachments->where('task_branch_id', $branch->id)->values()->map(fn($att) => $this->formatAttachment($att));
                $branchSubmissions = $this->submissions->where('task_branch_id', $branch->id)->sortByDesc('submitted_at')->values()->map(fn($sub) => [
                    'id' => $sub->id,
                    'description' => $sub->description,
                    'is_final' => (bool)$sub->is_final,
                    'submitted_at' => $sub->submitted_at?->toISOString(),
                    'submitted_by' => $sub->submittedBy ? [
                        'id' => $sub->submittedBy->id,
                        'name' => $sub->submittedBy->name,
                    ] : null,
                    'reviews' => $sub->reviews->map(fn($rev) => [
                        'id' => $rev->id,
                        'decision' => $rev->decision,
                        'comments' => $rev->comments,
                        'reviewed_at' => $rev->reviewed_at?->toISOString(),
                        'reviewer' => $rev->reviewer ? [
                            'id' => $rev->reviewer->id,
                            'name' => $rev->reviewer->name,
                        ] : null,
                    ]),
                ]);

                return [
                    'id' => $branch->id,
                    'level' => $meta['level'],
                    'level_name' => $meta['level_name'],
                    'dot_code' => $meta['dot_code'] ?? "1.{$branch->id}",
                    'hierarchical_code' => $meta['hierarchical_code'],
                    'parent_branch_id' => $meta['parent_branch_id'],
                    'parent_assignment_id' => $branch->parent_assignment_id,
                    'title' => $branch->title,
                    'description' => $branch->description,
                    'expected_result' => $branch->expected_result,
                    'acceptance_criteria' => $branch->acceptance_criteria,
                    'status' => $branch->status,
                    'start_date' => $branch->start_date?->toISOString(),
                    'due_date' => $branch->due_date?->toISOString(),
                    'completed_at' => $branch->completed_at?->toISOString(),
                    'owner' => $branch->owner ? [
                        'id' => $branch->owner->id,
                        'name' => $branch->owner->name,
                        'email' => $branch->owner->email,
                        'role' => $branch->owner->role,
                    ] : null,
                    'assigned_by' => $assignedBy ? [
                        'id' => $assignedBy->id,
                        'name' => $assignedBy->name,
                        'email' => $assignedBy->email,
                        'role' => $assignedBy->role,
                    ] : null,
                    'attachments' => $branchAttachments,
                    'submissions' => $branchSubmissions,
                    'share_parent_details' => $branch->share_parent_details ?? true,
                    'can_assign_further' => $meta['level'] < 4 && ($branch->can_assign_further ?? true),
                ];
            }),
            'collaborators' => $visibleBranches->flatMap->collaborators->map(fn($c) => [
                'id' => $c->user?->id,
                'name' => $c->user?->name,
                'email' => $c->user?->email,
                'role' => $c->user?->role,
            ])->unique('id')->values(),
            'comments' => $this->comments
                ->when(!$canOverseeAll && !empty($allowedUserIds), function ($cColl) use ($allowedUserIds) {
                    return $cColl->filter(fn($c) => in_array((int)$c->user_id, $allowedUserIds));
                })
                ->map(fn($comment) => [
                    'id' => $comment->id,
                    'comment' => $comment->comment,
                    'created_at' => $comment->created_at?->toISOString(),
                    'user' => $comment->user ? [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                        'role' => $comment->user->role,
                    ] : null,
                ]),
            'shared_attachments' => $isAssignee
                ? []
                : ((!$canOverseeAll && $userActiveBranch && $userActiveBranch->share_parent_details === false)
                    ? []
                    : $this->attachments->whereNull('task_branch_id')->values()->map(fn($att) => $this->formatAttachment($att))),
            'attachments' => $this->attachments->filter(function ($att) use ($canOverseeAll, $visibleBranches, $userActiveBranch, $isAssignee) {
                if ($isAssignee) {
                    // When assigner assigns to assignee, assignee only receives their subtask attachments
                    // The assigner's attachment doc (whereNull task_branch_id) is strictly hidden
                    if (is_null($att->task_branch_id)) {
                        return false;
                    }
                    $visibleBranchIds = $visibleBranches->pluck('id')->all();
                    return in_array($att->task_branch_id, $visibleBranchIds);
                }
                if ($canOverseeAll) return true;
                $visibleBranchIds = $visibleBranches->pluck('id')->all();
                if (is_null($att->task_branch_id)) {
                    if ($userActiveBranch && $userActiveBranch->share_parent_details === false) {
                        return false;
                    }
                    return true;
                }
                return in_array($att->task_branch_id, $visibleBranchIds);
            })->values()->map(fn($att) => $this->formatAttachment($att)),
            'status_history' => (function () use ($canOverseeAll, $visibleBranches, $allowedUserIds) {
                $taskCreatedAt = $this->created_at ? (is_string($this->created_at) ? Carbon::parse($this->created_at) : $this->created_at) : now();

                $historyItems = $this->statusHistory->map(function ($h) use ($taskCreatedAt) {
                    $isTaskCreated = str_contains(strtolower($h->reason ?? ''), 'task created');
                    $changedAt = $h->changed_at ? (is_string($h->changed_at) ? Carbon::parse($h->changed_at) : $h->changed_at) : $taskCreatedAt;

                    // Ensure "Task created" uses task created_at so it is strictly anchored as Milestone #1
                    if ($isTaskCreated && $taskCreatedAt) {
                        $changedAt = $taskCreatedAt;
                    }

                    return [
                        'id' => $h->id,
                        'from_status' => $h->from_status,
                        'to_status' => $h->to_status,
                        'reason' => $h->reason,
                        'changed_at' => $changedAt ? $changedAt->toISOString() : null,
                        'changed_by' => $h->changedBy ? [
                            'id' => $h->changedBy->id,
                            'name' => $h->changedBy->name,
                            'role' => $h->changedBy->role,
                        ] : null,
                        '_is_task_created' => $isTaskCreated,
                    ];
                });

                // Guarantee "Task created" entry always exists
                $hasTaskCreated = $historyItems->contains(fn($item) => !empty($item['_is_task_created']));
                if (!$hasTaskCreated) {
                    $historyItems->prepend([
                        'id' => 'created_' . $this->id,
                        'from_status' => null,
                        'to_status' => 'in_progress',
                        'reason' => 'Task created',
                        'changed_at' => $taskCreatedAt ? $taskCreatedAt->toISOString() : null,
                        'changed_by' => $this->creator ? [
                            'id' => $this->creator->id,
                            'name' => $this->creator->name,
                            'role' => $this->creator->role,
                        ] : null,
                        '_is_task_created' => true,
                    ]);
                }

                // Include subtask assignment events strictly for visible branches
                $branchesToLog = $canOverseeAll
                    ? ($this->relationLoaded('branches') ? $this->branches : collect())
                    : $visibleBranches;

                foreach ($branchesToLog as $b) {
                    if ($b->owner) {
                        $alreadyLogged = $historyItems->contains(function ($item) use ($b) {
                            return str_contains(strtolower($item['reason'] ?? ''), 'assigned')
                                && str_contains(strtolower($item['reason'] ?? ''), strtolower($b->owner->name ?? ''));
                        });

                        if (!$alreadyLogged) {
                            $assigner = $this->creator;
                            if ($b->relationLoaded('assignments')) {
                                $firstAssign = $b->assignments->sortBy('assigned_at')->first();
                                if ($firstAssign && $firstAssign->relationLoaded('assignedBy') && $firstAssign->assignedBy) {
                                    $assigner = $firstAssign->assignedBy;
                                }
                            }

                            $bCreatedAt = $b->created_at ? (is_string($b->created_at) ? Carbon::parse($b->created_at) : $b->created_at) : $taskCreatedAt;

                            if ($taskCreatedAt && $bCreatedAt && $bCreatedAt->timestamp <= $taskCreatedAt->timestamp) {
                                $bCreatedAt = $taskCreatedAt->copy()->addSecond();
                            }

                            $historyItems->push([
                                'id' => 'assign_' . $b->id,
                                'from_status' => null,
                                'to_status' => 'in_progress',
                                'reason' => "Subtask '{$b->title}' assigned to {$b->owner->name}",
                                'changed_at' => $bCreatedAt ? $bCreatedAt->toISOString() : null,
                                'changed_by' => $assigner ? [
                                    'id' => $assigner->id,
                                    'name' => $assigner->name,
                                    'role' => $assigner->role,
                                ] : null,
                                '_is_task_created' => false,
                            ]);
                        }
                    }
                }

                // Strict peer isolation for assignees: filter out any history items that reference peer assignees
                if (!$canOverseeAll && !empty($allowedUserIds)) {
                    $historyItems = $historyItems->filter(function ($item) use ($visibleBranches, $allowedUserIds) {
                        if (!empty($item['_is_task_created'])) {
                            return true;
                        }
                        $reason = strtolower($item['reason'] ?? '');
                        if (str_contains($reason, 'assigned to')) {
                            return $visibleBranches->contains(function ($b) use ($reason) {
                                return $b->owner && str_contains($reason, strtolower($b->owner->name ?? ''));
                            });
                        }
                        $actorId = $item['changed_by']['id'] ?? null;
                        return $actorId && in_array((int)$actorId, $allowedUserIds);
                    })->values();
                }

                // Sort strictly in ascending chronological order:
                // 1. "Task created" is ALWAYS first
                // 2. All subsequent events sorted by changed_at ascending
                // 3. For ties at same second, subtask assignments precede subsequent submissions/reviews
                return $historyItems->sort(function ($a, $b) {
                    $aIsCreated = !empty($a['_is_task_created']);
                    $bIsCreated = !empty($b['_is_task_created']);

                    if ($aIsCreated && !$bIsCreated) return -1;
                    if (!$aIsCreated && $bIsCreated) return 1;

                    $tA = !empty($a['changed_at']) ? strtotime($a['changed_at']) : 0;
                    $tB = !empty($b['changed_at']) ? strtotime($b['changed_at']) : 0;

                    if ($tA === $tB) {
                        $aIsAssign = str_contains(strtolower($a['reason'] ?? ''), 'assigned');
                        $bIsAssign = str_contains(strtolower($b['reason'] ?? ''), 'assigned');
                        if ($aIsAssign && !$bIsAssign) return -1;
                        if (!$aIsAssign && $bIsAssign) return 1;
                        return 0;
                    }

                    return $tA <=> $tB;
                })->values()->map(function ($item) {
                    unset($item['_is_task_created']);
                    return $item;
                })->all();
            })(),
            'submissions' => $this->submissions
                ->when(!$canOverseeAll, function ($q) use ($visibleBranches, $user) {
                    $visibleBranchIds = $visibleBranches->pluck('id')->all();
                    return $q->filter(function ($sub) use ($visibleBranchIds, $user) {
                        return in_array($sub->task_branch_id, $visibleBranchIds) || (int)$sub->submitted_by_id === (int)$user->id;
                    });
                })
                ->sortByDesc('submitted_at')->values()->map(fn($sub) => [
                'id' => $sub->id,
                'description' => $sub->description,
                'is_final' => (bool) $sub->is_final,
                'submitted_at' => $sub->submitted_at?->toISOString(),
                'submitted_by' => $sub->submittedBy ? [
                    'id' => $sub->submittedBy->id,
                    'name' => $sub->submittedBy->name,
                ] : null,
                'branch_id' => $sub->task_branch_id,
                'reviews' => $sub->reviews->map(fn($rev) => [
                    'id' => $rev->id,
                    'decision' => $rev->decision,
                    'comments' => $rev->comments,
                    'reviewed_at' => $rev->reviewed_at?->toISOString(),
                    'reviewer' => $rev->reviewer ? [
                        'id' => $rev->reviewer->id,
                        'name' => $rev->reviewer->name,
                    ] : null,
                ]),
            ]),
            'hold_record' => $this->holdRecords->sortByDesc('held_at')->first() ? [
                'reason' => $this->holdRecords->sortByDesc('held_at')->first()->reason,
                'held_at' => $this->holdRecords->sortByDesc('held_at')->first()->held_at?->toISOString(),
                'held_by' => $this->holdRecords->sortByDesc('held_at')->first()->putOnHoldBy?->name,
            ] : null,
            'latest_clarification' => ($isClarificationActive && $latestClarificationComment) ? [
                'id' => $latestClarificationComment->id,
                'comment' => $latestClarificationComment->comment,
                'requested_by' => $latestClarificationComment->user ? [
                    'id' => $latestClarificationComment->user->id,
                    'name' => $latestClarificationComment->user->name,
                ] : null,
                'requested_at' => $latestClarificationComment->created_at?->toISOString(),
            ] : null,
            'latest_return' => ($isReturnActive && $latestReturnReview) ? [
                'id' => $latestReturnReview->id,
                'decision' => $latestReturnReview->decision,
                'comments' => $latestReturnReview->comments,
                'reviewer' => $latestReturnReview->reviewer ? [
                    'id' => $latestReturnReview->reviewer->id,
                    'name' => $latestReturnReview->reviewer->name,
                ] : null,
                'reviewed_at' => $latestReturnReview->reviewed_at?->toISOString(),
            ] : null,
            'permissions' => [
                'can_edit' => $canEdit,
                'can_submit' => $canSubmit,
                'cannot_submit_reason' => $cannotSubmitReason,
                'can_review' => $canReview,
                'can_final_submit' => $canFinalSubmit,
                'can_request_details' => $canRequestDetails,
                'can_provide_details' => $canProvideDetails,
                'can_hold' => $canHold,
                'can_resume' => $canResume,
                'can_cancel' => $canCancel,
                'can_delete' => $canDelete,
                'can_assign' => ($isCreator || $isAdmin || ($isBranchOwner && ($userActiveBranch?->can_assign_further ?? true))) && !in_array($this->status, ['completed', 'cancelled']),
                'can_assign_further' => $isAdmin || $isCreator || ($userActiveBranch && ($userActiveBranch->can_assign_further ?? true)),
                'can_collaborate' => ($isCreator || $isAdmin || $isBranchOwner) && !in_array($this->status, ['completed', 'cancelled']),
            ],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    protected function formatAttachment($att): array
    {
        return [
            'id' => $att->id,
            'file_name' => $att->file_name,
            'file_size' => $att->file_size,
            'file_type' => $att->file_type,
            'file_path' => $att->file_path,
            'task_branch_id' => $att->task_branch_id,
            'url' => url("/api/v1/attachments/{$att->id}/download"),
            'direct_url' => asset('storage/' . $att->file_path),
            'created_at' => $att->created_at?->toISOString(),
            'uploaded_by' => $att->uploadedBy ? [
                'id' => $att->uploadedBy->id,
                'name' => $att->uploadedBy->name,
            ] : null,
        ];
    }
}
