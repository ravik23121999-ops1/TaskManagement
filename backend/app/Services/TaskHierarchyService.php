<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskBranch;
use Illuminate\Support\Collection;

class TaskHierarchyService
{
    /**
     * Compute hierarchical metadata (levels, codes, summary, and tree structure) for a task.
     *
     * Level 1: Creator / Owner (Main Task) -> QL-0001
     * Level 2: Team Leads (Direct Assignees) -> QL-0001.1, QL-0001.2
     * Level 3: Sub Leads (Delegated by Level 2) -> QL-0001.1.1, QL-0001.1.2
     * Level 4: Executors (Delegated by Level 3) -> QL-0001.1.1.1, QL-0001.1.1.2
     * Capped at Level 4.
     */
    public static function buildHierarchy(Task $task, ?Collection $branches = null, string $prefix = 'QL'): array
    {
        $allBranches = ($branches ?? $task->branches)->sortBy('id')->values();
        $baseCode = sprintf('%s-%04d', $prefix, $task->id);

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
                    'level_name' => 'Creator / Owner (Main Task)',
                    'code' => $baseCode,
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
                // Check if parentAssignment relation is already loaded or fetch from DB
                $parentAssignment = $branch->relationLoaded('parentAssignment')
                    ? $branch->parentAssignment
                    : $branch->parentAssignment()->first();

                if ($parentAssignment && isset($branchesById[$parentAssignment->task_branch_id])) {
                    $parentBranchMap[$branch->id] = $parentAssignment->task_branch_id;
                }
            }
        }

        // Group into levels
        // Level 2: Branches with no valid parent branch in this task
        $level2Branches = $allBranches->filter(fn($b) => !isset($parentBranchMap[$b->id]))->values();

        $branchMeta = [];
        $treeLevel2 = [];

        $l2Count = $level2Branches->count();
        $l3Count = 0;
        $l4Count = 0;

        foreach ($level2Branches as $l2Idx => $l2Branch) {
            $l2Code = sprintf('%s.%d', $baseCode, $l2Idx + 1);
            $l2Meta = [
                'level' => 2,
                'level_name' => 'Team Lead',
                'hierarchical_code' => $l2Code,
                'parent_branch_id' => null,
                'can_assign_further' => (bool)($l2Branch->can_assign_further ?? true),
            ];
            $branchMeta[$l2Branch->id] = $l2Meta;

            // Find Level 3 children
            $l3Children = $allBranches->filter(fn($b) => ($parentBranchMap[$b->id] ?? null) === $l2Branch->id)->values();
            $treeLevel3 = [];
            $l3Count += $l3Children->count();

            foreach ($l3Children as $l3Idx => $l3Branch) {
                $l3Code = sprintf('%s.%d', $l2Code, $l3Idx + 1);
                $l3Meta = [
                    'level' => 3,
                    'level_name' => 'Sub Lead',
                    'hierarchical_code' => $l3Code,
                    'parent_branch_id' => $l2Branch->id,
                    'can_assign_further' => (bool)($l3Branch->can_assign_further ?? true),
                ];
                $branchMeta[$l3Branch->id] = $l3Meta;

                // Find Level 4 children
                $l4Children = $allBranches->filter(fn($b) => ($parentBranchMap[$b->id] ?? null) === $l3Branch->id)->values();
                $treeLevel4 = [];
                $l4Count += $l4Children->count();

                foreach ($l4Children as $l4Idx => $l4Branch) {
                    $l4Code = sprintf('%s.%d', $l3Code, $l4Idx + 1);
                    $l4Meta = [
                        'level' => 4,
                        'level_name' => 'Executor',
                        'hierarchical_code' => $l4Code,
                        'parent_branch_id' => $l3Branch->id,
                        'can_assign_further' => false, // Capped at Level 4
                    ];
                    $branchMeta[$l4Branch->id] = $l4Meta;

                    $treeLevel4[] = [
                        'id' => $l4Branch->id,
                        'level' => 4,
                        'level_name' => 'Executor',
                        'code' => $l4Code,
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
                    'level_name' => 'Sub Lead',
                    'code' => $l3Code,
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
                'level_name' => 'Team Lead',
                'code' => $l2Code,
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

        // Catch any orphaned branches (e.g., if parent was somehow deleted) and place at Level 2
        foreach ($allBranches as $branch) {
            if (!isset($branchMeta[$branch->id])) {
                $orphanIdx = count($treeLevel2) + 1;
                $orphanCode = sprintf('%s.%d', $baseCode, $orphanIdx);
                $branchMeta[$branch->id] = [
                    'level' => 2,
                    'level_name' => 'Team Lead',
                    'hierarchical_code' => $orphanCode,
                    'parent_branch_id' => null,
                    'can_assign_further' => (bool)($branch->can_assign_further ?? true),
                ];
                $treeLevel2[] = [
                    'id' => $branch->id,
                    'level' => 2,
                    'level_name' => 'Team Lead',
                    'code' => $orphanCode,
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
                'level_name' => 'Creator / Owner (Main Task)',
                'code' => $baseCode,
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
}
