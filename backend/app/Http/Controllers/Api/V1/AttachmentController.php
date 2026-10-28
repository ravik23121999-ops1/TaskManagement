<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TaskAttachment;
use App\Models\Task;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB
            'task_id' => 'required|exists:tasks,id',
            'task_branch_id' => 'nullable|exists:task_branches,id',
        ]);

        $file = $request->file('file');
        $path = $file->store('attachments', 'public');

        $attachment = TaskAttachment::create([
            'task_id' => $request->task_id,
            'task_branch_id' => $request->task_branch_id,
            'uploaded_by_id' => $request->user()->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'file_type' => $file->getMimeType(),
        ]);

        $task = Task::find($request->task_id);
        ActivityLogger::log('attachment_uploaded', "Uploaded attachment '{$file->getClientOriginalName()}' on task: " . ($task?->title ?? $request->task_id), $request->task_id);

        return response()->json(['data' => $attachment], 201);
    }

    public function download(Request $request, TaskAttachment $attachment)
    {
        $user = $request->user();

        // Support both Bearer header and token query param
        if (!$user) {
            $tokenStr = $request->query('token') ?: $request->bearerToken();
            if ($tokenStr) {
                $personalAccessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($tokenStr);
                if ($personalAccessToken) {
                    $user = $personalAccessToken->tokenable;
                }
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $task = $attachment->task;
        if (!$task) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        // Role check: Admin and Sub-Admin have unrestricted access
        if ($user->role !== 'admin' && $user->role !== 'sub_admin') {
            $isAuthorized = $task->creator_id === $user->id
                || $attachment->uploaded_by_id === $user->id
                || $task->branches()->where('owner_id', $user->id)->exists()
                || $task->branches()->whereHas('assignments', fn($a) => $a->where('assigned_by_id', $user->id))->exists()
                || $task->branches()->whereHas('collaborators', fn($c) => $c->where('user_id', $user->id)->orWhere('invited_by_id', $user->id))->exists()
                || $task->submissions()->whereHas('reviews', fn($r) => $r->where('reviewer_id', $user->id))->exists();

            if (!$isAuthorized) {
                return response()->json(['message' => 'You do not have permission to download this attachment.'], 403);
            }
        }

        if (!Storage::disk('public')->exists($attachment->file_path)) {
            return response()->json(['message' => 'Attachment file not found on disk.'], 404);
        }

        return Storage::disk('public')->download($attachment->file_path, $attachment->file_name);
    }

    public function index(Request $request): JsonResponse
    {
        $taskId = $request->query('task_id');
        $attachments = TaskAttachment::where('task_id', $taskId)
            ->with('uploadedBy')
            ->get();

        return response()->json(['data' => $attachments]);
    }
}
