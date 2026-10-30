<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isCreator = $user && (int)$this->creator_id === (int)$user->id;
        $isAdmin = $user && ($user->role === 'admin' || $user->role === 'sub_admin');
        $canOverseeAll = $isCreator || $isAdmin;

        // Permissions for current user
        $isBranchOwner = $user && $this->branches->where('owner_id', $user->id)->isNotEmpty();
        $userActiveBranch = $user ? ($this->branches->firstWhere('owner_id', $user->id)
            ?? $this->branches->first(fn($b) => $b->assignments->contains('assigned_to_id', $user->id) || $b->collaborators->contains('user_id', $user->id))) : null;

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

        // Calculate current owner
        $currentOwner = null;
        if ($this->handling_method === 'work_alone') {
            $currentOwner = $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
                'role' => $this->creator->role,
            ] : null;
        } else {
            // For isolated assignee, current owner is the user/branch owner
            if (!$canOverseeAll && $userActiveBranch && $userActiveBranch->owner) {
                $currentOwner = [
                    'id' => $userActiveBranch->owner->id,
                    'name' => $userActiveBranch->owner->name,
                    'email' => $userActiveBranch->owner->email,
                    'role' => $userActiveBranch->owner->role,
                ];
            } else {
                // Find active branch or first branch
                $activeBranch = $visibleBranches->firstWhere('status', 'in_progress')
                    ?? $visibleBranches->firstWhere('status', 'review')
                    ?? $visibleBranches->firstWhere('status', 'pending')
                    ?? $visibleBranches->first();

                if ($activeBranch && $activeBranch->owner) {
                    $currentOwner = [
                        'id' => $activeBranch->owner->id,
                        'name' => $activeBranch->owner->name,
                        'email' => $activeBranch->owner->email,
                        'role' => $activeBranch->owner->role,
                    ];
                } elseif ($this->creator) {
                    $currentOwner = [
                        'id' => $this->creator->id,
                        'name' => $this->creator->name,
                        'email' => $this->creator->email,
                        'role' => $this->creator->role,
                    ];
                }
            }
        }

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
            $totalBranches = $visibleBranches->count();
            if ($totalBranches > 0) {
                $completedBranches = $visibleBranches->where('status', 'completed')->count();
                $progress = (int) round(($completedBranches / $totalBranches) * 100);
                if ($this->status === 'review' && $progress < 90) $progress = 90;
            } else {
                $progress = 20;
            }
        }
        
        $canSubmit = false;
        if ($this->status !== 'completed' && $this->status !== 'cancelled' && $this->status !== 'on_hold') {
            if ($this->handling_method === 'work_alone') {
                $canSubmit = false; // Work alone directly uses Final Approval & Complete
            } else {
                $canSubmit = $isBranchOwner && $userActiveBranch && in_array($userActiveBranch->status, ['pending', 'in_progress', 'post_comment']);
            }
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
                $totalBranches = $this->branches->count();
                $completedBranches = $this->branches->where('status', 'completed')->count();
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
        $canHold = ($isCreator || $isAdmin || $isBranchOwner) && !in_array($this->status, ['completed', 'cancelled', 'on_hold']);
        $canResume = ($isCreator || $isAdmin || $isBranchOwner) && $this->status === 'on_hold';
        $canEdit = ($isCreator || $isAdmin) && !in_array($this->status, ['completed', 'cancelled']);

        // Request missing details permission:
        // Assignee who has branch in pending or in_progress can request missing details from assigner
        $canRequestDetails = false;
        if ($user && !in_array($this->status, ['completed', 'cancelled', 'on_hold'])) {
            if ($this->handling_method !== 'work_alone') {
                $userBranch = $userActiveBranch ?? $this->branches->first(function ($b) use ($user) {
                    return $b->collaborators->where('user_id', $user->id)->isNotEmpty();
                });
                if ($userBranch && in_array($userBranch->status, ['pending', 'in_progress'])) {
                    $canRequestDetails = true;
                }
            }
        }

        // Provide missing details permission:
        // Task or any branch is in post_comment (clarification requested), and user is assigner, creator, or admin
        $canProvideDetails = false;
        $clarificationBranch = $this->branches->firstWhere('status', 'post_comment');
        if ($user && ($this->status === 'post_comment' || $clarificationBranch) && !in_array($this->status, ['completed', 'cancelled', 'on_hold'])) {
            if ($isAdmin || $isCreator) {
                $canProvideDetails = true;
            } elseif ($clarificationBranch) {
                $curAssign = $clarificationBranch->assignments->firstWhere('is_current', true);
                if ($curAssign && (int)$curAssign->assigned_by_id === (int)$user->id) {
                    $canProvideDetails = true;
                }
            }
        }

        // Latest clarification request & return reason
        $latestClarificationComment = $this->comments->filter(function ($c) {
            return str_starts_with($c->comment, '❓ Missing Details Requested');
        })->sortByDesc('created_at')->first();

        $latestReturnReview = $this->submissions->flatMap->reviews->filter(function ($r) {
            return in_array($r->decision, ['returned', 'rejected']);
        })->sortByDesc('reviewed_at')->first();

        return [
            'id' => $this->id,
            'task_code' => sprintf('T-%03d', $this->id),
            'title' => $this->title,
            'description' => $this->description,
            'expected_result' => $this->expected_result,
            'acceptance_criteria' => $this->acceptance_criteria,
            'handling_method' => $this->handling_method,
            'priority' => $this->priority,
            'status' => $this->status,
            'start_date' => $this->start_date?->toISOString(),
            'due_date' => $this->due_date?->toISOString(),
            'is_overdue' => (bool) ($this->due_date && $this->due_date->isPast() && !in_array($this->status, ['completed', 'cancelled'])),
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
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
                'role' => $this->creator->role,
            ] : null,
            'current_owner' => $currentOwner,
            'department' => $this->department ? [
                'id' => $this->department->id,
                'name' => $this->department->name,
            ] : null,
            'is_peer_isolated' => !$canOverseeAll,
            'my_branch' => $userActiveBranch ? [
                'id' => $userActiveBranch->id,
                'title' => $userActiveBranch->title,
                'description' => $userActiveBranch->description,
                'status' => $userActiveBranch->status,
                'due_date' => $userActiveBranch->due_date?->toISOString(),
                'completed_at' => $userActiveBranch->completed_at?->toISOString(),
                'assigned_by' => $userActiveBranch->assignments->firstWhere('is_current', true)?->assignedBy ? [
                    'id' => $userActiveBranch->assignments->firstWhere('is_current', true)->assignedBy->id,
                    'name' => $userActiveBranch->assignments->firstWhere('is_current', true)->assignedBy->name,
                    'role' => $userActiveBranch->assignments->firstWhere('is_current', true)->assignedBy->role,
                ] : null,
            ] : null,
            'branches' => $visibleBranches->map(function ($branch) {
                $currentAssignment = $branch->assignments->firstWhere('is_current', true);
                $assignedBy = $currentAssignment?->assignedBy;
                return [
                    'id' => $branch->id,
                    'title' => $branch->title,
                    'description' => $branch->description,
                    'status' => $branch->status,
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
                    'due_date' => $branch->due_date?->toISOString(),
                    'completed_at' => $branch->completed_at?->toISOString(),
                ];
            }),
            'collaborators' => $visibleBranches->flatMap->collaborators->map(fn($c) => [
                'id' => $c->user?->id,
                'name' => $c->user?->name,
                'email' => $c->user?->email,
                'role' => $c->user?->role,
            ])->unique('id')->values(),
            'comments' => $this->comments->map(fn($comment) => [
                'id' => $comment->id,
                'comment' => $comment->comment,
                'created_at' => $comment->created_at?->toISOString(),
                'user' => $comment->user ? [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                    'role' => $comment->user->role,
                ] : null,
            ]),
            'attachments' => $this->attachments->map(fn($att) => [
                'id' => $att->id,
                'file_name' => $att->file_name,
                'file_size' => $att->file_size,
                'file_type' => $att->file_type,
                'file_path' => $att->file_path,
                'url' => url("/api/v1/attachments/{$att->id}/download"),
                'direct_url' => asset('storage/' . $att->file_path),
                'created_at' => $att->created_at?->toISOString(),
                'uploaded_by' => $att->uploadedBy ? [
                    'id' => $att->uploadedBy->id,
                    'name' => $att->uploadedBy->name,
                ] : null,
            ]),
            'status_history' => $this->statusHistory->sortBy('changed_at')->values()->map(fn($history) => [
                'id' => $history->id,
                'from_status' => $history->from_status,
                'to_status' => $history->to_status,
                'reason' => $history->reason,
                'changed_at' => $history->changed_at?->toISOString(),
                'changed_by' => $history->changedBy ? [
                    'id' => $history->changedBy->id,
                    'name' => $history->changedBy->name,
                    'role' => $history->changedBy->role,
                ] : null,
            ]),
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
            'latest_clarification' => $latestClarificationComment ? [
                'id' => $latestClarificationComment->id,
                'comment' => $latestClarificationComment->comment,
                'requested_by' => $latestClarificationComment->user ? [
                    'id' => $latestClarificationComment->user->id,
                    'name' => $latestClarificationComment->user->name,
                ] : null,
                'requested_at' => $latestClarificationComment->created_at?->toISOString(),
            ] : null,
            'latest_return' => $latestReturnReview ? [
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
                'can_review' => $canReview,
                'can_final_submit' => $canFinalSubmit,
                'can_request_details' => $canRequestDetails,
                'can_provide_details' => $canProvideDetails,
                'can_hold' => $canHold,
                'can_resume' => $canResume,
                'can_cancel' => $canCancel,
                'can_delete' => $canDelete,
                'can_assign' => ($isCreator || $isAdmin || $isBranchOwner) && !in_array($this->status, ['completed', 'cancelled']),
                'can_collaborate' => ($isCreator || $isAdmin || $isBranchOwner) && !in_array($this->status, ['completed', 'cancelled']),
            ],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
