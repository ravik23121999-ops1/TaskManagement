<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskHoldRecord;
use App\Models\User;
use Illuminate\Support\Collection;

class TaskHierarchyService
{
    /**
     * Compute hierarchical metadata (levels, dot_code like 1.1, 1.2, 1.1.1, and task/subtask codes) for a task.
     *
     * Task: T-010
     * Subtasks: 1.1, 1.2 (T-010.1, T-010.2)
     * Child Subtasks: 1.1.1, 1.1.2 (T-010.1.1, T-010.1.2)
     * Further Subtasks: 1.1.1.1, etc.
     */
    public static function buildHierarchy(Task $task, ?Collection $branches = null, string $prefix = 'T'): array
    {
        $allBranches = ($branches ?? $task->branches)->sortBy('id')->values();
        $baseCode = sprintf('%s-%03d', $prefix, $task->id);

        if ($allBranches->isEmpty()) {
            return [
                'task_code' => $baseCode,
                'summary' => [
                    'level_1_count' => 1,
                    'level_2_count' => 0,
                    'level_3_count' => 0,
                    'level_4_count' => 0,
                    'total_assignments' => 0,
                    'max_level' => 1,
                ],
                'branch_meta' => [],
                'tree' => [
                    'id' => $task->id,
                    'level' => 1,
                    'level_name' => 'Main Task',
                    'code' => $baseCode,
                    'dot_code' => '1',
                    'title' => $task->title,
                    'status' => $task->status,
                    'owner' => $task->creator ? [
                        'id' => $task->creator->id,
                        'name' => $task->creator->name,
                        'email' => $task->creator->email,
                        'role' => $task->creator->role,
                    ] : null,
                    'children' => [],
                ],
            ];
        }

        // Map parent assignments to parent branch IDs
        $branchesById = $allBranches->keyBy('id');
        $parentBranchMap = []; // child_branch_id => parent_branch_id

        foreach ($allBranches as $branch) {
            $parentAssignmentId = $branch->parent_assignment_id;
            if ($parentAssignmentId) {
                $parentAssignment = $branch->relationLoaded('parentAssignment')
                    ? $branch->parentAssignment
                    : $branch->parentAssignment()->first();

                if ($parentAssignment && isset($branchesById[$parentAssignment->task_branch_id])) {
                    $parentBranchMap[$branch->id] = $parentAssignment->task_branch_id;
                }
            }
        }

        // Level 2: Subtasks directly under the task
        $level2Branches = $allBranches->filter(fn($b) => !isset($parentBranchMap[$b->id]))->values();

        $branchMeta = [];
        $treeLevel2 = [];

        $l2Count = $level2Branches->count();
        $l3Count = 0;
        $l4Count = 0;

        foreach ($level2Branches as $l2Idx => $l2Branch) {
            $dotCode = sprintf('1.%d', $l2Idx + 1);
            $l2Code = sprintf('%s.%d', $baseCode, $l2Idx + 1);
            $l2Meta = [
                'level' => 2,
                'level_name' => 'Subtask',
                'dot_code' => $dotCode,
                'hierarchical_code' => $l2Code,
                'parent_branch_id' => null,
                'can_assign_further' => (bool)($l2Branch->can_assign_further ?? true),
            ];
            $branchMeta[$l2Branch->id] = $l2Meta;

            // Find Level 3 children (child subtasks)
            $l3Children = $allBranches->filter(fn($b) => ($parentBranchMap[$b->id] ?? null) === $l2Branch->id)->values();
            $treeLevel3 = [];
            $l3Count += $l3Children->count();

            foreach ($l3Children as $l3Idx => $l3Branch) {
                $dotCode3 = sprintf('%s.%d', $dotCode, $l3Idx + 1);
                $l3Code = sprintf('%s.%d', $l2Code, $l3Idx + 1);
                $l3Meta = [
                    'level' => 3,
                    'level_name' => 'Subtask',
                    'dot_code' => $dotCode3,
                    'hierarchical_code' => $l3Code,
                    'parent_branch_id' => $l2Branch->id,
                    'can_assign_further' => (bool)($l3Branch->can_assign_further ?? true),
                ];
                $branchMeta[$l3Branch->id] = $l3Meta;

                // Find Level 4 children (further subtasks)
                $l4Children = $allBranches->filter(fn($b) => ($parentBranchMap[$b->id] ?? null) === $l3Branch->id)->values();
                $treeLevel4 = [];
                $l4Count += $l4Children->count();

                foreach ($l4Children as $l4Idx => $l4Branch) {
                    $dotCode4 = sprintf('%s.%d', $dotCode3, $l4Idx + 1);
                    $l4Code = sprintf('%s.%d', $l3Code, $l4Idx + 1);
                    $l4Meta = [
                        'level' => 4,
                        'level_name' => 'Subtask',
                        'dot_code' => $dotCode4,
                        'hierarchical_code' => $l4Code,
                        'parent_branch_id' => $l3Branch->id,
                        'can_assign_further' => false,
                    ];
                    $branchMeta[$l4Branch->id] = $l4Meta;

                    $treeLevel4[] = [
                        'id' => $l4Branch->id,
                        'level' => 4,
                        'level_name' => 'Subtask',
                        'code' => $l4Code,
                        'dot_code' => $dotCode4,
                        'title' => $l4Branch->title,
                        'description' => $l4Branch->description,
                        'status' => $l4Branch->status,
                        'due_date' => $l4Branch->due_date?->toISOString(),
                        'completed_at' => $l4Branch->completed_at?->toISOString(),
                        'owner' => $l4Branch->owner ? [
                            'id' => $l4Branch->owner->id,
                            'name' => $l4Branch->owner->name,
                            'email' => $l4Branch->owner->email,
                            'role' => $l4Branch->owner->role,
                        ] : null,
                        'can_assign_further' => false,
                        'children' => [],
                    ];
                }

                $treeLevel3[] = [
                    'id' => $l3Branch->id,
                    'level' => 3,
                    'level_name' => 'Subtask',
                    'code' => $l3Code,
                    'dot_code' => $dotCode3,
                    'title' => $l3Branch->title,
                    'description' => $l3Branch->description,
                    'status' => $l3Branch->status,
                    'due_date' => $l3Branch->due_date?->toISOString(),
                    'completed_at' => $l3Branch->completed_at?->toISOString(),
                    'owner' => $l3Branch->owner ? [
                        'id' => $l3Branch->owner->id,
                        'name' => $l3Branch->owner->name,
                        'email' => $l3Branch->owner->email,
                        'role' => $l3Branch->owner->role,
                    ] : null,
                    'can_assign_further' => (bool)($l3Branch->can_assign_further ?? true),
                    'children' => $treeLevel4,
                ];
            }

            $treeLevel2[] = [
                'id' => $l2Branch->id,
                'level' => 2,
                'level_name' => 'Subtask',
                'code' => $l2Code,
                'dot_code' => $dotCode,
                'title' => $l2Branch->title,
                'description' => $l2Branch->description,
                'status' => $l2Branch->status,
                'due_date' => $l2Branch->due_date?->toISOString(),
                'completed_at' => $l2Branch->completed_at?->toISOString(),
                'owner' => $l2Branch->owner ? [
                    'id' => $l2Branch->owner->id,
                    'name' => $l2Branch->owner->name,
                    'email' => $l2Branch->owner->email,
                    'role' => $l2Branch->owner->role,
                ] : null,
                'can_assign_further' => (bool)($l2Branch->can_assign_further ?? true),
                'children' => $treeLevel3,
            ];
        }

        // Handle any orphan branches gracefully
        foreach ($allBranches as $branch) {
            if (!isset($branchMeta[$branch->id])) {
                $orphanIdx = count($treeLevel2) + 1;
                $dotCode = sprintf('1.%d', $orphanIdx);
                $orphanCode = sprintf('%s.%d', $baseCode, $orphanIdx);
                $branchMeta[$branch->id] = [
                    'level' => 2,
                    'level_name' => 'Subtask',
                    'dot_code' => $dotCode,
                    'hierarchical_code' => $orphanCode,
                    'parent_branch_id' => null,
                    'can_assign_further' => (bool)($branch->can_assign_further ?? true),
                ];
                $treeLevel2[] = [
                    'id' => $branch->id,
                    'level' => 2,
                    'level_name' => 'Subtask',
                    'code' => $orphanCode,
                    'dot_code' => $dotCode,
                    'title' => $branch->title,
                    'description' => $branch->description,
                    'status' => $branch->status,
                    'due_date' => $branch->due_date?->toISOString(),
                    'completed_at' => $branch->completed_at?->toISOString(),
                    'owner' => $branch->owner ? [
                        'id' => $branch->owner->id,
                        'name' => $branch->owner->name,
                        'email' => $branch->owner->email,
                        'role' => $branch->owner->role,
                    ] : null,
                    'can_assign_further' => (bool)($branch->can_assign_further ?? true),
                    'children' => [],
                ];
                $l2Count++;
            }
        }

        $maxLevel = 1;
        if ($l4Count > 0) $maxLevel = 4;
        elseif ($l3Count > 0) $maxLevel = 3;
        elseif ($l2Count > 0) $maxLevel = 2;

        return [
            'task_code' => $baseCode,
            'summary' => [
                'level_1_count' => 1,
                'level_2_count' => $l2Count,
                'level_3_count' => $l3Count,
                'level_4_count' => $l4Count,
                'total_assignments' => $allBranches->count(),
                'max_level' => $maxLevel,
            ],
            'branch_meta' => $branchMeta,
            'tree' => [
                'id' => $task->id,
                'level' => 1,
                'level_name' => 'Main Task',
                'code' => $baseCode,
                'dot_code' => '1',
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'due_date' => $task->due_date?->toISOString(),
                'completed_at' => $task->completed_at?->toISOString(),
                'owner' => $task->creator ? [
                    'id' => $task->creator->id,
                    'name' => $task->creator->name,
                    'email' => $task->creator->email,
                    'role' => $task->creator->role,
                ] : null,
                'children' => $treeLevel2,
            ],
        ];
    }

    /**
     * Get the hierarchical level of a branch (2, 3, or 4).
     */
    public static function getBranchLevel(TaskBranch $branch): int
    {
        if (!$branch->parent_assignment_id) {
            return 2;
        }

        $parentAssignment = $branch->relationLoaded('parentAssignment')
            ? $branch->parentAssignment
            : $branch->parentAssignment()->first();

        if (!$parentAssignment || !$parentAssignment->task_branch_id) {
            return 2;
        }

        $parentBranch = TaskBranch::find($parentAssignment->task_branch_id);
        if (!$parentBranch || !$parentBranch->parent_assignment_id) {
            return 3;
        }

        return 4;
    }

    /**
     * Determine active current owners according to industry bottom-up delegation rules:
     * 1. Work alone, completed task, or empty branches: Task Creator is the current owner.
     * 2. All branches completed: Task Creator is the current owner (ready for final sign-off).
     * 3. When subtasks are delegated:
     *    - An assignee who has NOT assigned further is an active current owner (holding the work).
     *    - An assigner who DID assign further is NOT a current owner while their subordinate assignees are working.
     *    - When the assigner has reviewed and approved all subordinate assignees' tasks,
     *      then AFTER approval, the assigner BECOMES the current owner (ready to submit their deliverable upward).
     */
    public static function determineCurrentOwners(Task $task, ?Collection $branches = null): array
    {
        $allBranches = ($branches ?? $task->branches)->filter(fn($b) => $b->status !== 'cancelled');

        if ($task->handling_method === 'work_alone' || $task->status === 'completed' || $allBranches->isEmpty()) {
            return $task->creator ? [$task->creator] : [];
        }

        // If all active branches of the entire task are completed & approved, ownership returns to Creator for final sign-off
        $uncompletedBranches = $allBranches->filter(fn($b) => $b->status !== 'completed');
        if ($uncompletedBranches->isEmpty()) {
            return $task->creator ? [$task->creator] : [];
        }

        // Map parent assignments to parent branch IDs
        $branchesById = $allBranches->keyBy('id');
        $parentBranchMap = [];

        foreach ($allBranches as $branch) {
            $parentAssignmentId = $branch->parent_assignment_id;
            if ($parentAssignmentId) {
                $parentAssignment = $branch->relationLoaded('parentAssignment')
                    ? $branch->parentAssignment
                    : $branch->parentAssignment()->first();

                if ($parentAssignment && isset($branchesById[$parentAssignment->task_branch_id])) {
                    $parentBranchMap[$branch->id] = $parentAssignment->task_branch_id;
                }
            }
        }

        // Recursive helper to get all descendant branches under a given branch
        $getDescendants = function ($parentId) use (&$getDescendants, $allBranches, $parentBranchMap) {
            $directChildren = $allBranches->filter(function ($b) use ($parentId, $parentBranchMap) {
                if (($parentBranchMap[$b->id] ?? null) === $parentId) {
                    return true;
                }
                if ($b->parent_assignment_id && $b->parentAssignment && (int)$b->parentAssignment->task_branch_id === (int)$parentId) {
                    return true;
                }
                return false;
            });

            $descendants = collect();
            foreach ($directChildren as $child) {
                $descendants->push($child);
                $descendants = $descendants->merge($getDescendants($child->id));
            }
            return $descendants->unique('id');
        };

        $currentOwners = collect();

        foreach ($allBranches as $branch) {
            // Completed branches have already delivered their work; their owners are no longer active
            if ($branch->status === 'completed' || $branch->status === 'cancelled') {
                continue;
            }

            if (!$branch->owner) {
                continue;
            }

            $descendants = $getDescendants($branch->id);

            if ($descendants->isEmpty()) {
                // Leaf assignment: Assignee who has NOT assigned further is an active current owner
                $currentOwners->push($branch->owner);
            } else {
                // Has delegated to subordinates:
                // Assigner is NOT current owner while subordinate assignees are working.
                // Assigner BECOMES current owner ONLY AFTER reviewing and approving all subordinate deliverables.
                $uncompletedDescendants = $descendants->filter(fn($c) => $c->status !== 'completed' && $c->status !== 'cancelled');

                if ($uncompletedDescendants->isEmpty()) {
                    // All subordinates below this assigner are approved & completed!
                    // This assigner now holds the work to submit upward.
                    $currentOwners->push($branch->owner);
                }
            }
        }

        $uniqueOwners = $currentOwners->unique('id')->values()->all();

        if (empty($uniqueOwners) && $task->creator) {
            return [$task->creator];
        }

        return $uniqueOwners;
    }

    /**
     * Determine if a user has the right to pause (hold) a task dynamically:
     * 1. System Admin & Sub-Admin always retain organizational override authority.
     * 2. When tasks are delegated down:
     *    - The leaf node assignee who is actively working (pending, in_progress, post_comment)
     *      has the right to pause the task at that time.
     *    - The intermediate assigner who delegated further has NO right to pause while their
     *      assignees are executing the work.
     *    - After the leaf node submits their deliverable (review status), the leaf node loses pause right,
     *      and the above person (the assigner/reviewer) gains the right to pause while reviewing.
     *    - After the assigner approves the subordinate's task, it is the assigner's responsibility to
     *      submit their consolidated work upward to the upper level; the assigner holds the work and
     *      HAS the right to pause at that time!
     * 3. For work_alone or task creator with all branches completed: Creator has the right to pause.
     */
    public static function canUserHoldTask(Task $task, ?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (in_array($task->status, ['completed', 'cancelled', 'on_hold'])) {
            return false;
        }

        // 1. System Admin and Sub-Admin always have administrative pause authority
        if ($user->role === 'admin' || $user->role === 'sub_admin') {
            return true;
        }

        $allBranches = $task->relationLoaded('branches')
            ? $task->branches->filter(fn($b) => $b->status !== 'cancelled')
            : $task->branches()->where('status', '!=', 'cancelled')->get();

        // 2. Work alone handling method or task with no subtasks
        if ($task->handling_method === 'work_alone' || $allBranches->isEmpty()) {
            return (int)$task->creator_id === (int)$user->id;
        }

        // Map parent assignments to parent branch IDs
        $branchesById = $allBranches->keyBy('id');
        $parentBranchMap = [];
        foreach ($allBranches as $branch) {
            $parentAssignmentId = $branch->parent_assignment_id;
            if ($parentAssignmentId) {
                $parentAssignment = $branch->relationLoaded('parentAssignment')
                    ? $branch->parentAssignment
                    : $branch->parentAssignment()->first();

                if ($parentAssignment && isset($branchesById[$parentAssignment->task_branch_id])) {
                    $parentBranchMap[$branch->id] = $parentAssignment->task_branch_id;
                }
            }
        }

        // Helper to get direct children under a branch
        $getChildren = function ($branchId) use ($allBranches, $parentBranchMap) {
            return $allBranches->filter(function ($b) use ($branchId, $parentBranchMap) {
                return ($parentBranchMap[$b->id] ?? null) === $branchId
                    || ($b->parent_assignment_id && $b->parentAssignment && (int)$b->parentAssignment->task_branch_id === (int)$branchId);
            });
        };

        // Recursive helper to get all descendants
        $getDescendants = function ($parentId) use (&$getDescendants, $getChildren) {
            $children = $getChildren($parentId);
            $descendants = collect();
            foreach ($children as $child) {
                $descendants->push($child);
                $descendants = $descendants->merge($getDescendants($child->id));
            }
            return $descendants->unique('id');
        };

        $userBranches = $allBranches->filter(fn($b) => (int)$b->owner_id === (int)$user->id);

        // CASE A: User is an active Leaf Node (working on an uncompleted subtask, not delegated further)
        foreach ($userBranches as $branch) {
            if ($branch->status === 'completed' || $branch->status === 'cancelled') {
                continue;
            }

            $children = $getChildren($branch->id);
            if ($children->isEmpty()) {
                // Leaf node branch!
                // If currently working on it: has pause right!
                if (in_array($branch->status, ['pending', 'in_progress', 'post_comment'])) {
                    return true;
                }
                // If branch status is 'review', the leaf node has submitted and cannot pause!
            }
        }

        // CASE B: User is an Assigner / Reviewer whose subordinate has SUBMITTED for review
        // (The leaf node submitted, so responsibility shifted up to this assigner to review)
        foreach ($allBranches as $branch) {
            if ($branch->status === 'completed' || $branch->status === 'cancelled') {
                continue;
            }

            $currentAssignment = $branch->relationLoaded('assignments')
                ? $branch->assignments->firstWhere('is_current', true)
                : $branch->assignments()->where('is_current', true)->first();

            $isDirectAssigner = $currentAssignment
                && (int)$currentAssignment->assigned_by_id === (int)$user->id
                && (int)$currentAssignment->assigned_to_id !== (int)$user->id;

            $isParentBranchAssigner = false;
            if ($branch->parent_assignment_id && $branch->parentAssignment) {
                $isParentBranchAssigner = (int)$branch->parentAssignment->assigned_to_id === (int)$user->id
                    || (int)$branch->parentAssignment->assigned_by_id === (int)$user->id;
            }

            if ($isDirectAssigner || $isParentBranchAssigner) {
                // Subordinate is in review status! Assigner is reviewing -> Assigner CAN pause!
                if ($branch->status === 'review') {
                    return true;
                }

                // Check pending unreviewed submissions on this subordinate branch
                $submissions = $branch->relationLoaded('submissions')
                    ? $branch->submissions
                    : $branch->submissions()->with('reviews')->get();

                if ($submissions->contains(fn($s) => $s->reviews->isEmpty() && (int)$s->submitted_by_id !== (int)$user->id)) {
                    return true;
                }
            }
        }

        // CASE C: User is an Intermediate Assigner whose subordinates are ALL completed & approved!
        // (Assigner approved subordinate tasks, now holds their own deliverable to submit upward)
        foreach ($userBranches as $branch) {
            if ($branch->status === 'completed' || $branch->status === 'cancelled') {
                continue;
            }

            $descendants = $getDescendants($branch->id);
            if ($descendants->isNotEmpty()) {
                $uncompletedDescendants = $descendants->filter(fn($c) => $c->status !== 'completed' && $c->status !== 'cancelled');
                if ($uncompletedDescendants->isEmpty() && in_array($branch->status, ['pending', 'in_progress', 'post_comment'])) {
                    // All subordinates approved! Assigner is active holder of work before submitting upward!
                    return true;
                }
            }
        }

        // CASE D: Task Creator when ALL branches are completed & approved (ready for final sign-off)
        if ((int)$task->creator_id === (int)$user->id) {
            $uncompletedAll = $allBranches->filter(fn($b) => $b->status !== 'completed' && $b->status !== 'cancelled');
            if ($uncompletedAll->isEmpty() && !in_array($task->status, ['completed', 'cancelled'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine if a user has the right to resume a task from on_hold.
     */
    public static function canUserResumeTask(Task $task, ?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($task->status !== 'on_hold') {
            return false;
        }

        // 1. Admin and Sub-Admin can always resume
        if ($user->role === 'admin' || $user->role === 'sub_admin') {
            return true;
        }

        // 2. The user who placed the task on hold can always resume it
        $activeHold = TaskHoldRecord::where('task_id', $task->id)->whereNull('resumed_at')->latest('held_at')->first();
        if ($activeHold && (int)$activeHold->put_on_hold_by_id === (int)$user->id) {
            return true;
        }

        // 3. The current responsibility holder can resume
        $tempTask = clone $task;
        $tempTask->status = 'in_progress';
        return self::canUserHoldTask($tempTask, $user);
    }
}
