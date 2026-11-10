<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TaskAttachment;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm',
            'task_id' => 'required|exists:tasks,id',
            'task_branch_id' => 'nullable|exists:task_branches,id',
        ]);

        $user = $request->user();
        $task = Task::findOrFail($request->task_id);

        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        $isParticipant = (int)$task->creator_id === (int)$user->id
            || $task->branches()->where('owner_id', $user->id)->exists()
            || $task->branches()->whereHas('assignments', fn($a) => $a->where('assigned_to_id', $user->id)->orWhere('assigned_by_id', $user->id))->exists()
            || $task->branches()->whereHas('collaborators', fn($c) => $c->where('user_id', $user->id)->orWhere('invited_by_id', $user->id))->exists()
            || $task->submissions()->whereHas('reviews', fn($r) => $r->where('reviewer_id', $user->id))->exists();

        if (!$isAdmin && !$isParticipant) {
            return response()->json([
                'message' => 'Unauthorized: You are not assigned to or collaborating on this task, and cannot upload attachments.'
            ], 403);
        }

        $file = $request->file('file');
        $path = $file->store('attachments', 'public');

        $attachment = TaskAttachment::create([
            'task_id' => $request->task_id,
            'task_branch_id' => $request->task_branch_id,
            'uploaded_by_id' => $user->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'file_type' => $file->getMimeType(),
        ]);

        ActivityLogger::log('attachment_uploaded', "Uploaded attachment '{$file->getClientOriginalName()}' on task: {$task->title}", $task->id);

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

        $isCreator = (int)$task->creator_id === (int)$user->id;
        $userActiveBranch = $task->branches()->where('owner_id', $user->id)
            ->orWhereHas('assignments', fn($a) => $a->where('assigned_to_id', $user->id))
            ->first();
        $isAssignee = $userActiveBranch && !$isCreator;

        // When assigner assigns to assignee, assigner attachment doc (whereNull task_branch_id)
        // is NOT shared with assignee
        if ($isAssignee && is_null($attachment->task_branch_id)) {
            return response()->json(['message' => 'Unauthorized: Assigner attachments are not accessible to subtask assignees.'], 403);
        }

        // Role check: Global Admin has unrestricted access when not acting as an assignee
        if ($user->role !== 'admin' || $isAssignee) {
            $isUploader = (int)$attachment->uploaded_by_id === (int)$user->id;

            if ($attachment->task_branch_id) {
                // Strict branch isolation: Individual attachment belongs to a specific branch/employee
                $branch = $attachment->branch ?? TaskBranch::find($attachment->task_branch_id);
                $isBranchOwner = $branch && (int)$branch->owner_id === (int)$user->id;
                $isBranchAssigner = $branch && $branch->assignments()->where('assigned_by_id', $user->id)->exists();
                $isBranchCollaborator = $branch && $branch->collaborators()->where('user_id', $user->id)->exists();

                if (!$isCreator && !$isUploader && !$isBranchOwner && !$isBranchAssigner && !$isBranchCollaborator) {
                    return response()->json(['message' => 'Unauthorized: You do not have permission to access this individual assignment attachment.'], 403);
                }
            } else {
                // Shared task attachment: Any authorized participant of the task can access
                // unless all branches owned by this user have share_parent_details === false
                $userBranches = $task->branches()->where('owner_id', $user->id)->get();
                if ($userBranches->isNotEmpty() && $userBranches->every(fn($b) => $b->share_parent_details === false)) {
                    return response()->json(['message' => 'Unauthorized: This shared attachment is not shared with your assignment.'], 403);
                }

                $isParticipant = $isCreator
                    || $isUploader
                    || $task->branches()->where('owner_id', $user->id)->exists()
                    || $task->branches()->whereHas('assignments', fn($a) => $a->where('assigned_by_id', $user->id)->orWhere('assigned_to_id', $user->id))->exists()
                    || $task->branches()->whereHas('collaborators', fn($c) => $c->where('user_id', $user->id)->orWhere('invited_by_id', $user->id))->exists()
                    || $task->submissions()->whereHas('reviews', fn($r) => $r->where('reviewer_id', $user->id))->exists();

                if (!$isParticipant) {
                    return response()->json(['message' => 'You do not have permission to download this shared attachment.'], 403);
                }
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
