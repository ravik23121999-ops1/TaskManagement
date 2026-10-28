<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskComment;
use App\Models\TaskStatusHistory;
use App\Models\TaskAttachment;
use App\Services\ActivityLogger;
use App\Jobs\SendTaskNotification;
use App\Http\Resources\V1\TaskResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskClarificationController extends Controller
{
    /**
     * Assignee posts a request back to the assigner asking for missing details.
     * Moves the task to the pending page of the assigner.
     */
    public function requestDetails(Request $request, Task $task): JsonResponse
    {
        $request->validate([
            'question' => 'required|string|min:3|max:5000',
            'branch_id' => 'nullable|exists:task_branches,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:20480',
        ]);

        $user = $request->user();

        // Find user's branch
        $branch = null;
        if ($request->branch_id) {
            $branch = $task->branches()->where('id', $request->branch_id)->first();
        }
        if (!$branch) {
            $branch = $task->branches()->where('owner_id', $user->id)->first();
        }
        if (!$branch) {
            // Check if user is a collaborator
            $branch = $task->branches()->whereHas('collaborators', fn($c) => $c->where('user_id', $user->id))->first();
        }

        if (!$branch && $user->role !== 'admin' && $user->role !== 'sub_admin') {
            return response()->json(['message' => 'Unauthorized: Only an assigned team member can request clarification.'], 403);
        }

        // Determine who the assigner is:
        // 1. Current branch assignment's assigned_by_id
        // 2. Otherwise task creator_id
        $assignerId = null;
        if ($branch) {
            $currentAssignment = $branch->assignments()->where('is_current', true)->first();
            if ($currentAssignment && (int)$currentAssignment->assigned_by_id !== (int)$user->id) {
                $assignerId = $currentAssignment->assigned_by_id;
            }
        }
        if (!$assignerId) {
            $assignerId = $task->creator_id;
        }

        return DB::transaction(function () use ($request, $task, $branch, $user, $assignerId) {
            $question = $request->question;
            $oldBranchStatus = $branch ? $branch->status : $task->status;

            if ($branch) {
                $branch->update(['status' => 'post_comment']);
            }
            $task->update(['status' => 'post_comment']);

            // Record status history
            TaskStatusHistory::create([
                'task_id' => $task->id,
                'task_branch_id' => $branch?->id,
                'from_status' => $oldBranchStatus,
                'to_status' => 'post_comment',
                'changed_by_id' => $user->id,
                'reason' => "Missing Details Requested: {$question}",
                'changed_at' => now(),
            ]);

            // Save comment
            $comment = TaskComment::create([
                'task_id' => $task->id,
                'task_branch_id' => $branch?->id,
                'user_id' => $user->id,
                'comment' => "❓ Missing Details Requested by {$user->name}: {$question}",
                'is_internal' => false,
            ]);

            // Save attachments if any
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $size = $file->getSize();
                    $mime = $file->getClientMimeType();
                    $path = $file->store('task-attachments/' . $task->id, 'local');

                    TaskAttachment::create([
                        'task_id' => $task->id,
                        'task_branch_id' => $branch?->id,
                        'task_comment_id' => $comment->id,
                        'file_path' => $path,
                        'file_name' => $originalName,
                        'file_size' => $size,
                        'file_type' => $mime,
                        'uploaded_by_id' => $user->id,
                    ]);
                }
            }

            ActivityLogger::log('clarification_requested', "{$user->name} requested missing details on '{$task->title}'", $task->id);

            // Notify assigner
            SendTaskNotification::dispatch(
                $assignerId,
                'details_requested',
                "{$user->name} requested missing details on '{$task->title}': {$question}",
                $task->id,
                'Missing Details Requested',
                $branch?->id
            );

            return response()->json([
                'message' => 'Request for missing details sent to assigner. Task moved to assigner pending queue.',
                'task' => new TaskResource($task->fresh([
                    'creator', 'department', 'branches.owner', 'branches.assignments',
                    'branches.collaborators.user', 'submissions.reviews', 'attachments', 'comments.user'
                ])),
            ], 200);
        });
    }

    /**
     * Assigner provides the requested details and submits back to the assignee.
     * Moves the task back to the pending page of the assignee.
     */
    public function provideDetails(Request $request, Task $task): JsonResponse
    {
        $request->validate([
            'response' => 'required|string|min:3|max:5000',
            'branch_id' => 'nullable|exists:task_branches,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:20480',
        ]);

        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        $isCreator = (int)$task->creator_id === (int)$user->id;

        // Find the branch awaiting details
        $branch = null;
        if ($request->branch_id) {
            $branch = $task->branches()->where('id', $request->branch_id)->first();
        }
        if (!$branch) {
            $branch = $task->branches()->where('status', 'post_comment')->first();
        }
        if (!$branch) {
            $branch = $task->branches()->first();
        }

        // Verify authorization: User must be creator, admin, or the assigner who assigned this branch
        $isAssigner = false;
        if ($branch) {
            $currentAssignment = $branch->assignments()->where('is_current', true)->first();
            $isAssigner = $currentAssignment && (int)$currentAssignment->assigned_by_id === (int)$user->id;
        }

        if (!$isAdmin && !$isCreator && !$isAssigner) {
            return response()->json(['message' => 'Unauthorized: Only the assigner or task creator can provide clarification.'], 403);
        }

        return DB::transaction(function () use ($request, $task, $branch, $user) {
            $response = $request->response;

            if ($branch) {
                $oldBranchStatus = $branch->status;
                $branch->update(['status' => 'in_progress']);

                TaskStatusHistory::create([
                    'task_id' => $task->id,
                    'task_branch_id' => $branch->id,
                    'from_status' => $oldBranchStatus,
                    'to_status' => 'in_progress',
                    'changed_by_id' => $user->id,
                    'reason' => "Missing Details Provided: {$response}",
                    'changed_at' => now(),
                ]);
            }

            $task->update(['status' => 'in_progress']);

            // Save comment
            $comment = TaskComment::create([
                'task_id' => $task->id,
                'task_branch_id' => $branch?->id,
                'user_id' => $user->id,
                'comment' => "💡 Details Provided by {$user->name}: {$response}",
                'is_internal' => false,
            ]);

            // Save attachments if any
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $size = $file->getSize();
                    $mime = $file->getClientMimeType();
                    $path = $file->store('task-attachments/' . $task->id, 'local');

                    TaskAttachment::create([
                        'task_id' => $task->id,
                        'task_branch_id' => $branch?->id,
                        'task_comment_id' => $comment->id,
                        'file_path' => $path,
                        'file_name' => $originalName,
                        'file_size' => $size,
                        'file_type' => $mime,
                        'uploaded_by_id' => $user->id,
                    ]);
                }
            }

            ActivityLogger::log('details_provided', "{$user->name} provided missing details on '{$task->title}'", $task->id);

            // Notify assignee (branch owner)
            if ($branch && (int)$branch->owner_id !== (int)$user->id) {
                SendTaskNotification::dispatch(
                    $branch->owner_id,
                    'details_provided',
                    "{$user->name} provided the missing details on '{$task->title}'",
                    $task->id,
                    'Missing Details Provided',
                    $branch->id
                );
            }

            return response()->json([
                'message' => 'Details provided successfully. Task returned to assignee for work.',
                'task' => new TaskResource($task->fresh([
                    'creator', 'department', 'branches.owner', 'branches.assignments',
                    'branches.collaborators.user', 'submissions.reviews', 'attachments', 'comments.user'
                ])),
            ], 200);
        });
    }
}
