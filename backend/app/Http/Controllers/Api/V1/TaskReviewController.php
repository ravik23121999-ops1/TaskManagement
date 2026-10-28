<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskReview;
use App\Models\TaskSubmission;
use App\Models\TaskStatusHistory;
use App\Services\ActivityLogger;
use App\Jobs\SendTaskNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskReviewController extends Controller
{
    public function review(Request $request, TaskSubmission $submission): JsonResponse
    {
        $request->validate([
            'decision' => 'required|in:approved,returned,rejected',
            'comments' => 'required_if:decision,returned,rejected|nullable|string',
            'return_to_user_id' => 'nullable|exists:users,id',
        ]);

        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        
        $branch = $submission->branch;
        $task = $submission->task ?? ($branch ? $branch->task : null);

        if (!$task) {
            return response()->json(['message' => 'Associated task not found'], 404);
        }

        // Submitter CANNOT review their own submission
        if ($submission->submitted_by_id === $user->id && !$isAdmin) {
            return response()->json(['message' => 'Unauthorized: You cannot review your own submission.'], 403);
        }

        // Verify reviewer authorization:
        // Direct reviewer is upper branch delegator/assigner, or admin/sub-admin
        $isCreator = $task->creator_id === $user->id;
        $isDelegator = false;
        $isCollabInviter = false;

        if ($branch) {
            $lastAssignment = $branch->assignments()->where('is_current', true)->first();
            $isDelegator = $lastAssignment && (int)$lastAssignment->assigned_by_id === (int)$user->id && (int)$lastAssignment->assigned_to_id !== (int)$user->id;
            $isCollabInviter = $branch->collaborators()->where('invited_by_id', $user->id)->where('user_id', $submission->submitted_by_id)->exists();
        }

        $canReviewThisSubmission = $isAdmin || $isDelegator || $isCollabInviter || (!$branch && $isCreator);

        if (!$canReviewThisSubmission) {
            return response()->json(['message' => 'Unauthorized: Only the assigner (upper branch) who delegated this branch, or an administrator, can review this submission.'], 403);
        }

        return DB::transaction(function () use ($request, $submission, $branch, $task, $user) {
            $rawDecision = $request->decision;
            $decision = ($rawDecision === 'rejected') ? 'returned' : $rawDecision;
            $comments = $request->comments ?? ($decision === 'approved' ? 'Approved by reviewer' : 'Returned for revision');

            $review = TaskReview::create([
                'task_id' => $task->id,
                'task_branch_id' => $branch?->id,
                'task_submission_id' => $submission->id,
                'reviewer_id' => $user->id,
                'decision' => $decision,
                'comments' => $comments,
                'reviewed_at' => now(),
            ]);

            if ($decision === 'approved') {
                if ($branch) {
                    $oldBranchStatus = $branch->status;
                    $branch->update([
                        'status' => 'completed',
                        'completed_at' => now(),
                    ]);

                    TaskStatusHistory::create([
                        'task_id' => $task->id,
                        'task_branch_id' => $branch->id,
                        'from_status' => $oldBranchStatus,
                        'to_status' => 'completed',
                        'changed_by_id' => $user->id,
                        'reason' => "Review approved: {$comments}",
                        'changed_at' => now(),
                    ]);
                }

                // Check if all branches of the task are now completed
                $totalBranches = $task->branches()->count();
                $completedBranches = $task->branches()->where('status', 'completed')->count();

                if ($totalBranches > 0 && $completedBranches === $totalBranches) {
                    // All branches approved! Move task to 'review' (Final Sign-off stage) for creator final completion
                    $task->update(['status' => 'review']);
                    
                    SendTaskNotification::dispatch(
                        $task->creator_id,
                        'final_check_ready',
                        "All {$totalBranches} branches approved on '{$task->title}'. Ready in your Pending Tasks for final check & completion.",
                        $task->id,
                        'Final Check Ready'
                    );
                } else {
                    // Intermediate reviewer approved a sub-branch.
                    // If the intermediate reviewer has their own branch, move it to in_progress so it appears in reviewer's pending page for submission!
                    $reviewerBranch = $task->branches()->where('owner_id', $user->id)->first();
                    if ($reviewerBranch && $reviewerBranch->status !== 'completed') {
                        $reviewerBranch->update(['status' => 'in_progress']);
                    }
                    $task->update(['status' => 'in_progress']);
                }

                ActivityLogger::log('review_approved', "Approved submission on '{$task->title}'", $task->id);

                // Notify submitter that their work was approved
                if ($submission->submitted_by_id !== $user->id) {
                    SendTaskNotification::dispatch(
                        $submission->submitted_by_id,
                        'work_approved',
                        "Your submitted work on '{$task->title}' has been approved by {$user->name}",
                        $task->id,
                        'Work Approved',
                        $branch?->id
                    );
                }

                return response()->json([
                    'message' => 'Submission approved successfully. Task moved to reviewer pending queue for submission.',
                    'data' => $review->load(['reviewer', 'submission']),
                ], 201);
            } else {
                // Reject / Return for correction - requires comments and routes back to submitter's pending page
                if ($branch) {
                    $oldBranchStatus = $branch->status;
                    $branch->update(['status' => 'post_comment']);

                    TaskStatusHistory::create([
                        'task_id' => $task->id,
                        'task_branch_id' => $branch->id,
                        'from_status' => $oldBranchStatus,
                        'to_status' => 'post_comment',
                        'changed_by_id' => $user->id,
                        'reason' => "Returned for correction by {$user->name}: {$comments}",
                        'changed_at' => now(),
                    ]);
                }

                $task->update(['status' => 'post_comment']);

                // Also save review comments as a TaskComment so it is logged in the conversation history
                \App\Models\TaskComment::create([
                    'task_id' => $task->id,
                    'task_branch_id' => $branch?->id,
                    'task_review_id' => $review->id,
                    'user_id' => $user->id,
                    'comment' => "⚠️ Work Returned for Correction: {$comments}",
                    'is_internal' => false,
                ]);

                ActivityLogger::log('review_returned', "Work returned for correction on '{$task->title}': {$comments}", $task->id);

                // Notify submitter
                $returnToUserId = $request->return_to_user_id ?? $submission->submitted_by_id;
                SendTaskNotification::dispatch(
                    $returnToUserId,
                    'work_returned',
                    "Work returned for correction on '{$task->title}': {$comments}",
                    $task->id,
                    'Work Returned for Correction',
                    $branch?->id
                );

                return response()->json([
                    'message' => 'Submission rejected and returned to submitter for correction',
                    'data' => $review->load(['reviewer', 'submission']),
                ], 201);
            }
        });
    }
}
