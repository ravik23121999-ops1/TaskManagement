<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskComment;
use App\Services\ActivityLogger;
use App\Jobs\SendTaskNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'task_branch_id' => 'nullable|exists:task_branches,id',
            'comment' => 'required|string|min:1',
        ]);

        $user = $request->user();
        $task = Task::findOrFail($request->task_id);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'task_branch_id' => $request->task_branch_id,
            'user_id' => $user->id,
            'comment' => $request->comment,
            'is_internal' => $request->boolean('is_internal', false),
        ]);

        ActivityLogger::log('comment_added', "Added comment on task: {$task->title}", $task->id);

        // Notify creator and the user's upper branch assigner/inviter
        $userBranch = $task->branches()->where('owner_id', $user->id)->first();
        $assignerId = $userBranch?->assignments()->where('is_current', true)->value('assigned_by_id');
        $inviterId = $userBranch?->collaborators()->where('user_id', $user->id)->value('invited_by_id');

        $recipients = collect([$task->creator_id]);
        if ($assignerId) {
            $recipients->push($assignerId);
        }
        if ($inviterId) {
            $recipients->push($inviterId);
        }

        $recipients = $recipients->unique()->reject(fn($id) => (int)$id === (int)$user->id);

        foreach ($recipients as $recipientId) {
            SendTaskNotification::dispatch(
                $recipientId,
                'comment_added',
                "{$user->name} commented on '{$task->title}': {$request->comment}",
                $task->id,
                'New Comment'
            );
        }

        return response()->json([
            'message' => 'Comment added successfully',
            'data' => $comment->load('user'),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = TaskComment::with('user');
        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }
        $comments = $query->oldest()->get();
        return response()->json(['data' => $comments]);
    }
}
