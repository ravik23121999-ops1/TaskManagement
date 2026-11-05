<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskSubmission;
use App\Models\TaskStatusHistory;
use App\Models\TaskAttachment;
use App\Services\ActivityLogger;
use App\Jobs\SendTaskNotification;
use App\Mail\TaskAssignedMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskSubmissionController extends Controller
{
    public function submit(Request $request, Task $task): JsonResponse
    {
        $request->validate([
            'description' => 'required|string|min:5',
            'task_branch_id' => 'nullable|exists:task_branches,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'nullable|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm',
            'file' => 'nullable|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm',
        ], [
            'description.required' => 'Please provide work notes or a deliverables summary before submitting.',
            'description.min' => 'Work notes description must be at least 5 characters long.',
        ]);

        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        $branchId = $request->task_branch_id;

        if (in_array($task->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Cannot submit deliverables: Task is already completed or cancelled.'], 422);
        }
        if ($task->status === 'on_hold') {
            return response()->json(['message' => 'Cannot submit deliverables: Task is currently on hold. Resume the task first.'], 422);
        }

        return DB::transaction(function () use ($request, $task, $user, $isAdmin, $branchId) {
            if ($task->handling_method === 'work_alone') {
                // Creator works alone - directly completes the work
                if ($task->creator_id !== $user->id && !$isAdmin) {
                    return response()->json(['message' => 'Unauthorized to submit this task'], 403);
                }

                $submission = TaskSubmission::create([
                    'task_id' => $task->id,
                    'task_branch_id' => $task->branches()->first()?->id,
                    'submitted_by_id' => $user->id,
                    'description' => $request->description,
                    'submitted_at' => now(),
                    'is_final' => true,
                ]);

                // Save any attachments uploaded with the submission
                $uploadedFiles = [];
                if ($request->hasFile('attachments')) {
                    $uploadedFiles = (array) $request->file('attachments');
                } elseif ($request->hasFile('file')) {
                    $uploadedFiles = [$request->file('file')];
                }

                foreach ($uploadedFiles as $file) {
                    if ($file && $file->isValid()) {
                        $path = $file->store('attachments', 'public');
                        TaskAttachment::create([
                            'task_id' => $task->id,
                            'task_branch_id' => $task->branches()->first()?->id,
                            'uploaded_by_id' => $user->id,
                            'file_name' => $file->getClientOriginalName(),
                            'file_path' => $path,
                            'file_size' => $file->getSize(),
                            'file_type' => $file->getMimeType(),
                        ]);
                        ActivityLogger::log('attachment_uploaded', "Uploaded deliverable '{$file->getClientOriginalName()}' on task: {$task->title}", $task->id);
                    }
                }

                $oldStatus = $task->status;
                $task->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);

                // Also complete the default branch if present
                $task->branches()->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);

                TaskStatusHistory::create([
                    'task_id' => $task->id,
                    'from_status' => $oldStatus,
                    'to_status' => 'completed',
                    'changed_by_id' => $user->id,
                    'reason' => 'Direct completion by creator (Work Alone): ' . $request->description,
                    'changed_at' => now(),
                ]);

                ActivityLogger::log('task_completed', "Work Alone task completed by creator: {$task->title}", $task->id);

                return response()->json([
                    'message' => 'Task completed successfully',
                    'data' => $submission->load(['submittedBy', 'task']),
                ], 201);
            } else {
                // Assign or Collaborate workflow
                $branch = null;
                if ($branchId) {
                    $branch = TaskBranch::where('task_id', $task->id)->where('id', $branchId)->first();
                } else {
                    // Strictly find the branch assigned to the current authenticated user
                    $branch = $task->branches()->where('owner_id', $user->id)->whereNotIn('status', ['completed', 'cancelled'])->first()
                        ?? $task->branches()->where('owner_id', $user->id)->first();
                }

                if (!$branch) {
                    return response()->json(['message' => 'No active assignment found for you on this task.'], 404);
                }

                // Strict Maker-Checker Rule: Only the assigned owner can submit deliverables for their branch
                if ((int)$branch->owner_id !== (int)$user->id) {
                    $ownerName = $branch->owner ? $branch->owner->name : 'the assigned employee';
                    return response()->json([
                        'message' => "Unauthorized: Only {$ownerName} can submit work for this assignment. An assigner, manager, or administrator cannot submit deliverables on behalf of another employee.",
                    ], 403);
                }

                // Subtask Blocking Rule (PMI/Jira standard): Lock parent if any child subtasks delegated below are unapproved
                $submissionLock = \App\Services\TaskHierarchyService::getBranchSubmissionLock($branch);
                if ($submissionLock['is_locked']) {
                    return response()->json([
                        'message' => 'Cannot submit work: ' . $submissionLock['reason'],
                        'lock_details' => $submissionLock,
                    ], 422);
                }

                $submission = TaskSubmission::create([
                    'task_id' => $task->id,
                    'task_branch_id' => $branch->id,
                    'submitted_by_id' => $user->id,
                    'description' => $request->description,
                    'submitted_at' => now(),
                    'is_final' => false,
                ]);

                // Save any attachments uploaded with intermediate submission
                $uploadedFiles = [];
                if ($request->hasFile('attachments')) {
                    $uploadedFiles = (array) $request->file('attachments');
                } elseif ($request->hasFile('file')) {
                    $uploadedFiles = [$request->file('file')];
                }

                foreach ($uploadedFiles as $file) {
                    if ($file && $file->isValid()) {
                        $path = $file->store('attachments', 'public');
                        TaskAttachment::create([
                            'task_id' => $task->id,
                            'task_branch_id' => $branch->id,
                            'uploaded_by_id' => $user->id,
                            'file_name' => $file->getClientOriginalName(),
                            'file_path' => $path,
                            'file_size' => $file->getSize(),
                            'file_type' => $file->getMimeType(),
                        ]);
                        ActivityLogger::log('attachment_uploaded', "Uploaded deliverable '{$file->getClientOriginalName()}' on task: {$task->title}", $task->id);
                    }
                }

                $oldBranchStatus = $branch->status;
                $branch->update(['status' => 'review']);

                // Also set task status to review
                $oldTaskStatus = $task->status;
                $task->update(['status' => 'review']);

                TaskStatusHistory::create([
                    'task_id' => $task->id,
                    'task_branch_id' => $branch->id,
                    'from_status' => $oldBranchStatus,
                    'to_status' => 'review',
                    'changed_by_id' => $user->id,
                    'reason' => "Work submitted for review: {$request->description}",
                    'changed_at' => now(),
                ]);

                ActivityLogger::log('task_submitted', "Work submitted for review on '{$branch->title}': {$request->description}", $task->id);

                // Notify both the upper branch assigner (delegator) and creator
                $reviewerIds = collect([$task->creator_id]);
                $lastAssignment = $branch->assignments()->where('is_current', true)->first();
                if ($lastAssignment && $lastAssignment->assigned_by_id) {
                    $reviewerIds->push($lastAssignment->assigned_by_id);
                }
                $inviterId = $branch->collaborators()->where('user_id', $user->id)->value('invited_by_id');
                if ($inviterId) {
                    $reviewerIds->push($inviterId);
                }

                $reviewerIds = $reviewerIds->unique()->reject(fn($id) => (int)$id === (int)$user->id);

                foreach ($reviewerIds as $rId) {
                    SendTaskNotification::dispatch(
                        $rId,
                        'submission',
                        "Work submitted for review on '{$task->title}' by {$user->name}",
                        $task->id,
                        'Review Needed',
                        $branch->id
                    );
                }

                return response()->json([
                    'message' => 'Work submitted for review successfully',
                    'data' => $submission->load(['submittedBy', 'branch']),
                ], 201);
            }
        });
    }

    public function finalSubmit(Request $request, Task $task): JsonResponse
    {
        $request->validate([
            'description' => 'required|string|min:3',
            'attachments' => 'nullable|array',
            'attachments.*' => 'nullable|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm',
            'file' => 'nullable|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm',
        ], [
            'description.required' => 'Closing remarks or deliverables summary note is required for final sign-off.',
        ]);

        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';

        if (in_array($task->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Cannot complete task: Task is already completed or cancelled.'], 422);
        }
        if ($task->status === 'on_hold') {
            return response()->json(['message' => 'Cannot complete task: Task is currently on hold. Resume the task first.'], 422);
        }

        // Approved workflow rule: The creator performs final check and final submission
        if ($task->creator_id !== $user->id && !$isAdmin) {
            return response()->json(['message' => 'Unauthorized: Only the original creator (or Admin) can give final completion approval'], 403);
        }

        // Subtask Blocking Rule (Jira / Enterprise standard): All active (non-cancelled) branches must be submitted & approved
        if ($task->handling_method !== 'work_alone') {
            $activeBranches = $task->branches()->where('status', '!=', 'cancelled')->get();
            $totalActive = $activeBranches->count();
            $completedActive = $activeBranches->where('status', 'completed')->count();

            if ($totalActive === 0) {
                return response()->json([
                    'message' => 'Cannot complete task: No assignments found for this task.',
                ], 422);
            }

            if ($completedActive < $totalActive) {
                $pendingCount = $totalActive - $completedActive;
                $samplePending = $activeBranches->where('status', '!=', 'completed')->take(3)->map(fn($b) => "'{$b->title}' ({$b->status})")->implode(', ');
                return response()->json([
                    'message' => "Cannot complete task: All subtasks and branches must be submitted and approved first ({$pendingCount} of {$totalActive} pending: {$samplePending}).",
                ], 422);
            }
        }

        return DB::transaction(function () use ($request, $task, $user) {
            $oldStatus = $task->status;
            $task->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            // Note: Auto-complete shortcut removed per Maker-Checker / Subtask Blocking compliance.
            // Every branch has already been legitimately submitted and approved above.

            // Process uploaded final attachments if provided
            $uploadedFiles = [];
            if ($request->hasFile('attachments')) {
                $uploadedFiles = (array) $request->file('attachments');
            } elseif ($request->hasFile('file')) {
                $uploadedFiles = [$request->file('file')];
            }

            foreach ($uploadedFiles as $file) {
                if ($file && $file->isValid()) {
                    $path = $file->store('attachments', 'public');
                    TaskAttachment::create([
                        'task_id' => $task->id,
                        'task_branch_id' => $task->branches->first()?->id,
                        'uploaded_by_id' => $user->id,
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size' => $file->getSize(),
                        'file_type' => $file->getMimeType(),
                    ]);
                    ActivityLogger::log('attachment_uploaded', "Uploaded final deliverable '{$file->getClientOriginalName()}' on task: {$task->title}", $task->id);
                }
            }

            // Record submission entry with description if provided (or default for work_alone)
            $desc = $request->input('description');
            $finalDescription = !empty(trim($desc ?? ''))
                ? trim($desc)
                : ($task->handling_method === 'work_alone' ? 'Work completed and verified by creator' : 'Final verification and approval by creator');

            $submission = $task->submissions()->create([
                'task_branch_id' => $task->branches->first()?->id,
                'submitted_by_id' => $user->id,
                'description' => $finalDescription,
                'submitted_at' => now(),
                'is_final' => true,
            ]);

            TaskStatusHistory::create([
                'task_id' => $task->id,
                'from_status' => $oldStatus,
                'to_status' => 'completed',
                'changed_by_id' => $user->id,
                'reason' => 'Final approval and completion: ' . $finalDescription,
                'changed_at' => now(),
            ]);

            ActivityLogger::log('task_completed', "Task completed via final approval by creator: {$task->title}", $task->id);

            // Notify all branch owners / collaborators
            $recipientIds = $task->branches->pluck('owner_id')
                ->merge($task->branches->flatMap->collaborators->pluck('user_id'))
                ->unique()
                ->reject(fn($id) => $id === $user->id);

            foreach ($recipientIds as $recipientId) {
                SendTaskNotification::dispatch(
                    $recipientId,
                    'task_completed',
                    "Task '{$task->title}' has been verified and fully completed by creator",
                    $task->id,
                    'Task Completed'
                );
            }

            // Send automated completion email notification to all active assignees & collaborators
            $recipientUsers = User::whereIn('id', $recipientIds)->get();
            foreach ($recipientUsers as $recipientUser) {
                TaskAssignedMail::safeSend(
                    $task,
                    $recipientUser,
                    $user,
                    null,
                    $finalDescription,
                    'task_completed'
                );
            }

            return response()->json([
                'message' => 'Task completed successfully',
                'data' => $task->fresh(['creator', 'branches', 'submissions', 'attachments']),
            ]);
        });
    }
}
