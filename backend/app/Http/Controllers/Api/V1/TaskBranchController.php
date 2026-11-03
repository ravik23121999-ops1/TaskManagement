<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendTaskNotification;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskStatusHistory;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskBranchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $branches = TaskBranch::with(['owner', 'task'])->paginate($request->input('per_page', 15));
        return response()->json(['data' => $branches]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'title' => 'required|string',
            'description' => 'nullable|string',
            'owner_id' => 'required|exists:users,id',
            'due_date' => 'nullable|date',
        ]);

        $task = \App\Models\Task::find($validated['task_id']);
        if ($task && $task->due_date && !empty($validated['due_date'])) {
            if (strtotime($validated['due_date']) > strtotime($task->due_date)) {
                return response()->json([
                    'message' => 'Subtask due date cannot exceed the parent task due date.'
                ], 422);
            }
        }

        $branch = TaskBranch::create($validated);

        return response()->json(['data' => $branch->load(['owner', 'task'])], 201);
    }

    public function show(TaskBranch $branch): JsonResponse
    {
        return response()->json(['data' => $branch->load(['owner', 'task', 'collaborators'])]);
    }

    public function update(Request $request, TaskBranch $branch): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string',
            'description' => 'sometimes|nullable|string',
            'status' => 'sometimes|in:pending,in_progress,review,on_hold,post_comment,completed,cancelled',
            'due_date' => 'sometimes|nullable|date',
            'owner_id' => 'sometimes|exists:users,id',
        ]);

        if (!empty($validated['due_date']) && $branch->task && $branch->task->due_date) {
            if (strtotime($validated['due_date']) > strtotime($branch->task->due_date)) {
                return response()->json([
                    'message' => 'Subtask due date cannot exceed the parent task due date.'
                ], 422);
            }
        }

        $branch->update($validated);

        // If owner changed, create new assignment record
        if ($request->has('owner_id') && $request->owner_id !== $branch->owner_id) {
            $branch->assignments()->create([
                'assigned_to_id' => $request->owner_id,
                'assigned_by_id' => $request->user()->id,
                'is_current' => true,
                'assigned_at' => now(),
            ]);

            // Mark previous assignments as not current
            $branch->assignments()
                ->where('assigned_to_id', '!=', $request->owner_id)
                ->update(['is_current' => false]);
        }

        return response()->json(['data' => $branch->load(['owner', 'task'])]);
    }

    public function delegate(Request $request, TaskBranch $branch): JsonResponse
    {
        return $this->transfer($request, $branch);
    }

    public function transfer(Request $request, TaskBranch $branch): JsonResponse
    {
        $user = $request->user();
        $task = $branch->task;

        if (!$task) {
            return response()->json(['message' => 'Associated task not found.'], 404);
        }

        $isAdmin = in_array($user->role, ['admin', 'sub_admin']);
        $isCreator = (int) $task->creator_id === (int) $user->id;
        $isAssigner = $branch->assignments()->where('is_current', true)->where('assigned_by_id', $user->id)->exists()
            || ($branch->parentAssignment && (int) $branch->parentAssignment->assigned_by_id === (int) $user->id);

        if (!$isAdmin && !$isCreator && !$isAssigner) {
            return response()->json([
                'message' => 'Unauthorized: Only the assigner, task creator, or an Administrator can reassign this branch.'
            ], 403);
        }

        if (in_array($task->status, ['completed', 'cancelled'])) {
            return response()->json([
                'message' => 'Cannot reassign branches on a completed or cancelled task.'
            ], 422);
        }

        if (in_array($branch->status, ['completed', 'cancelled'])) {
            return response()->json([
                'message' => 'Cannot reassign a completed or cancelled subtask.'
            ], 422);
        }

        $request->validate([
            'new_owner_id' => 'required|exists:users,id',
            'reason' => 'nullable|string|max:1000',
        ]);

        if ((int) $request->new_owner_id === (int) $branch->owner_id) {
            return response()->json([
                'message' => 'The selected employee is already assigned to this subtask.'
            ], 422);
        }

        $oldOwner = $branch->owner;
        $newOwner = User::findOrFail($request->new_owner_id);
        $reasonNote = $request->input('reason');

        // Update branch owner
        $updates = ['owner_id' => $newOwner->id];
        // If status was in post_comment (e.g. details needed/correction), reset to in_progress so new assignee starts active
        if ($branch->status === 'post_comment') {
            $updates['status'] = 'in_progress';
        }
        $branch->update($updates);

        // Update assignment records
        $branch->assignments()->where('is_current', true)->update(['is_current' => false]);
        $branch->assignments()->create([
            'assigned_to_id' => $newOwner->id,
            'assigned_by_id' => $user->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // Audit Trail
        $historyNote = "Subtask '{$branch->title}' transferred from " . ($oldOwner?->name ?? 'Unassigned') . " to {$newOwner->name}." . ($reasonNote ? " Reason: {$reasonNote}" : '');
        TaskStatusHistory::create([
            'task_id' => $task->id,
            'task_branch_id' => $branch->id,
            'from_status' => $branch->status,
            'to_status' => $branch->fresh()->status,
            'changed_by_id' => $user->id,
            'reason' => $historyNote,
            'changed_at' => now(),
        ]);

        ActivityLogger::log('branch_transferred', $historyNote, $task->id, $user->id);

        // Dispatch Notifications
        try {
            $taskCode = $task->code ?? 'T-' . str_pad($task->id, 3, '0', STR_PAD_LEFT);
            SendTaskNotification::dispatch(
                $newOwner->id,
                'task_assigned',
                "Subtask '{$branch->title}' on task {$taskCode} has been transferred to you by {$user->name}." . ($reasonNote ? " Note: {$reasonNote}" : ''),
                $task->id,
                "Subtask Assigned: {$taskCode}",
                $branch->id
            );

            if ($oldOwner && (int) $oldOwner->id !== (int) $user->id) {
                SendTaskNotification::dispatch(
                    $oldOwner->id,
                    'task_reassigned',
                    "Your assignment for '{$branch->title}' on task {$taskCode} was transferred to {$newOwner->name} by {$user->name}." . ($reasonNote ? " Note: {$reasonNote}" : ''),
                    $task->id,
                    "Assignment Transferred: {$taskCode}",
                    $branch->id
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('TaskBranch transfer notification failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => "Subtask '{$branch->title}' successfully transferred to {$newOwner->name}.",
            'data' => $branch->fresh()->load(['owner', 'task'])
        ]);
    }

    public function cancelAssignment(Request $request, TaskBranch $branch): JsonResponse
    {
        $user = $request->user();
        $task = $branch->task;

        if (!$task) {
            return response()->json(['message' => 'Associated task not found.'], 404);
        }

        $isAdmin = in_array($user->role, ['admin', 'sub_admin']);
        $isCreator = (int) $task->creator_id === (int) $user->id;
        $isAssigner = $branch->assignments()->where('is_current', true)->where('assigned_by_id', $user->id)->exists()
            || ($branch->parentAssignment && (int) $branch->parentAssignment->assigned_by_id === (int) $user->id);

        if (!$isAdmin && !$isCreator && !$isAssigner) {
            return response()->json([
                'message' => 'Unauthorized: Only the assigner, task creator, or an Administrator can cancel this assignment.'
            ], 403);
        }

        if (in_array($task->status, ['completed', 'cancelled'])) {
            return response()->json([
                'message' => 'Cannot cancel branches on a completed or cancelled task.'
            ], 422);
        }

        if (in_array($branch->status, ['completed', 'cancelled'])) {
            return response()->json([
                'message' => 'Subtask is already completed or cancelled.'
            ], 422);
        }

        $request->validate([
            'reason' => 'nullable|string|max:1000',
            'delete_permanently' => 'nullable|boolean',
        ]);

        $owner = $branch->owner;
        $oldStatus = $branch->status;
        $reasonNote = $request->input('reason', 'Work allocation withdrawn by assigner');

        $branch->update(['status' => 'cancelled']);
        $branch->assignments()->where('is_current', true)->update(['is_current' => false]);

        $historyNote = "Subtask assignment '{$branch->title}' for " . ($owner?->name ?? 'Assignee') . " was cancelled/withdrawn." . ($reasonNote ? " Reason: {$reasonNote}" : '');

        TaskStatusHistory::create([
            'task_id' => $task->id,
            'task_branch_id' => $branch->id,
            'from_status' => $oldStatus,
            'to_status' => 'cancelled',
            'changed_by_id' => $user->id,
            'reason' => $historyNote,
            'changed_at' => now(),
        ]);

        ActivityLogger::log('branch_cancelled', $historyNote, $task->id, $user->id);

        if ($request->boolean('delete_permanently')) {
            $branch->delete();
        }

        // Dispatch Notification to the removed owner
        try {
            if ($owner && (int) $owner->id !== (int) $user->id) {
                $taskCode = $task->code ?? 'T-' . str_pad($task->id, 3, '0', STR_PAD_LEFT);
                SendTaskNotification::dispatch(
                    $owner->id,
                    'task_assignment_cancelled',
                    "Your assignment for '{$branch->title}' on task {$taskCode} was withdrawn by {$user->name}." . ($reasonNote ? " Note: {$reasonNote}" : ''),
                    $task->id,
                    "Assignment Withdrawn: {$taskCode}",
                    $branch->id
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('TaskBranch cancel notification failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => "Assignment for " . ($owner?->name ?? 'Assignee') . " was successfully withdrawn.",
            'data' => $branch->fresh()->load(['owner', 'task'])
        ]);
    }

    public function destroy(Request $request, TaskBranch $branch): JsonResponse
    {
        return $this->cancelAssignment($request, $branch);
    }
}
