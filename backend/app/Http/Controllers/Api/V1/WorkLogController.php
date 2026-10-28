<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskStatusHistory;
use App\Models\TaskAttachment;
use App\Models\TaskReview;
use App\Models\TaskSubmission;
use App\Models\TaskHoldRecord;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class WorkLogController extends Controller
{
    private function checkAdminPermission(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'admin' && $user->role !== 'sub_admin')) {
            return response()->json([
                'message' => 'Unauthorized. Only Admins and Sub-Admins have access to company work logs.'
            ], 403);
        }
        return null;
    }

    /**
     * Unified work logs stream with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        if ($unauthorized = $this->checkAdminPermission($request)) {
            return $unauthorized;
        }

        $type = $request->query('type', 'all');
        $taskId = $request->query('task_id');
        $userId = $request->query('user_id');
        $search = $request->query('search');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 15);

        $logs = collect();

        // 1. Comments & Communications
        if (in_array($type, ['all', 'comment'])) {
            $commentsQuery = TaskComment::with(['user.department', 'task'])
                ->when($taskId, fn($q) => $q->where('task_id', $taskId))
                ->when($userId, fn($q) => $q->where('user_id', $userId))
                ->when($dateFrom, fn($q) => $q->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay()))
                ->when($dateTo, fn($q) => $q->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay()))
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($sub) use ($search) {
                        $sub->where('comment', 'like', "%{$search}%")
                            ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%"))
                            ->orWhereHas('task', fn($t) => $t->where('title', 'like', "%{$search}%"));
                    });
                })
                ->latest()
                ->take(100)
                ->get();

            foreach ($commentsQuery as $c) {
                if (!$c->task) continue;
                $logs->push([
                    'id' => 'comment_' . $c->id,
                    'raw_id' => $c->id,
                    'event_type' => 'comment',
                    'action_title' => 'Team Communication / Comment',
                    'task' => [
                        'id' => $c->task->id,
                        'task_code' => sprintf('T-%03d', $c->task->id),
                        'title' => $c->task->title,
                        'status' => $c->task->status,
                    ],
                    'actor' => [
                        'id' => $c->user?->id,
                        'name' => $c->user?->name ?? 'System User',
                        'role' => $c->user?->role ?? 'employee',
                        'department' => $c->user?->department?->name ?? 'General',
                    ],
                    'content' => $c->comment,
                    'details' => [
                        'comment' => $c->comment,
                        'is_internal' => $c->is_internal,
                    ],
                    'created_at' => $c->created_at->toIso8601String(),
                    'time_ago' => $c->created_at->diffForHumans(),
                ]);
            }
        }

        // 2. Status & Journey Transitions
        if (in_array($type, ['all', 'status_change'])) {
            $statusQuery = TaskStatusHistory::with(['changedBy.department', 'task'])
                ->when($taskId, fn($q) => $q->where('task_id', $taskId))
                ->when($userId, fn($q) => $q->where('changed_by_id', $userId))
                ->when($dateFrom, fn($q) => $q->where('changed_at', '>=', Carbon::parse($dateFrom)->startOfDay()))
                ->when($dateTo, fn($q) => $q->where('changed_at', '<=', Carbon::parse($dateTo)->endOfDay()))
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($sub) use ($search) {
                        $sub->where('reason', 'like', "%{$search}%")
                            ->orWhere('to_status', 'like', "%{$search}%")
                            ->orWhereHas('task', fn($t) => $t->where('title', 'like', "%{$search}%"));
                    });
                })
                ->latest('changed_at')
                ->take(100)
                ->get();

            foreach ($statusQuery as $s) {
                if (!$s->task) continue;
                $logs->push([
                    'id' => 'status_' . $s->id,
                    'raw_id' => $s->id,
                    'event_type' => 'status_change',
                    'action_title' => "Stage Transition: " . strtoupper($s->from_status ?? 'draft') . " → " . strtoupper($s->to_status),
                    'task' => [
                        'id' => $s->task->id,
                        'task_code' => sprintf('T-%03d', $s->task->id),
                        'title' => $s->task->title,
                        'status' => $s->task->status,
                    ],
                    'actor' => [
                        'id' => $s->changedBy?->id,
                        'name' => $s->changedBy?->name ?? 'System',
                        'role' => $s->changedBy?->role ?? 'user',
                        'department' => $s->changedBy?->department?->name ?? 'Operations',
                    ],
                    'content' => $s->reason ?: "Status moved to " . str_replace('_', ' ', $s->to_status),
                    'details' => [
                        'from_status' => $s->from_status,
                        'to_status' => $s->to_status,
                        'reason' => $s->reason,
                    ],
                    'created_at' => $s->changed_at->toIso8601String(),
                    'time_ago' => $s->changed_at->diffForHumans(),
                ]);
            }
        }

        // 3. Attachments & Deliverables
        if (in_array($type, ['all', 'attachment'])) {
            $attachmentQuery = TaskAttachment::with(['uploadedBy.department', 'task'])
                ->when($taskId, fn($q) => $q->where('task_id', $taskId))
                ->when($userId, fn($q) => $q->where('uploaded_by_id', $userId))
                ->when($dateFrom, fn($q) => $q->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay()))
                ->when($dateTo, fn($q) => $q->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay()))
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($sub) use ($search) {
                        $sub->where('file_name', 'like', "%{$search}%")
                            ->orWhereHas('task', fn($t) => $t->where('title', 'like', "%{$search}%"));
                    });
                })
                ->latest()
                ->take(100)
                ->get();

            foreach ($attachmentQuery as $a) {
                if (!$a->task) continue;
                $logs->push([
                    'id' => 'attachment_' . $a->id,
                    'raw_id' => $a->id,
                    'event_type' => 'attachment',
                    'action_title' => "Deliverable Uploaded: {$a->file_name}",
                    'task' => [
                        'id' => $a->task->id,
                        'task_code' => sprintf('T-%03d', $a->task->id),
                        'title' => $a->task->title,
                        'status' => $a->task->status,
                    ],
                    'actor' => [
                        'id' => $a->uploadedBy?->id,
                        'name' => $a->uploadedBy?->name ?? 'Uploader',
                        'role' => $a->uploadedBy?->role ?? 'employee',
                        'department' => $a->uploadedBy?->department?->name ?? 'General',
                    ],
                    'content' => "Uploaded file '{$a->file_name}' (" . $a->getFileSizeInMB() . " MB)",
                    'details' => [
                        'attachment_id' => $a->id,
                        'file_name' => $a->file_name,
                        'file_size' => $a->file_size,
                        'file_size_formatted' => $a->getFileSizeInMB() . ' MB',
                        'file_type' => $a->file_type,
                        'download_url' => url("/api/v1/attachments/{$a->id}/download"),
                    ],
                    'created_at' => $a->created_at->toIso8601String(),
                    'time_ago' => $a->created_at->diffForHumans(),
                ]);
            }
        }

        // 4. Reviews & Evaluation Decisions
        if (in_array($type, ['all', 'review'])) {
            $reviewQuery = TaskReview::with(['reviewer.department', 'submission.task', 'nextReviewer'])
                ->when($taskId, fn($q) => $q->whereHas('submission', fn($s) => $s->where('task_id', $taskId)))
                ->when($userId, fn($q) => $q->where('reviewer_id', $userId))
                ->when($dateFrom, fn($q) => $q->where('reviewed_at', '>=', Carbon::parse($dateFrom)->startOfDay()))
                ->when($dateTo, fn($q) => $q->where('reviewed_at', '<=', Carbon::parse($dateTo)->endOfDay()))
                ->latest('reviewed_at')
                ->take(100)
                ->get();

            foreach ($reviewQuery as $r) {
                $task = $r->submission?->task;
                if (!$task) continue;

                $isApproved = $r->decision === 'approved';
                $logs->push([
                    'id' => 'review_' . $r->id,
                    'raw_id' => $r->id,
                    'event_type' => 'review',
                    'action_title' => $isApproved ? 'Submission Approved' : 'Submission Returned for Correction',
                    'task' => [
                        'id' => $task->id,
                        'task_code' => sprintf('T-%03d', $task->id),
                        'title' => $task->title,
                        'status' => $task->status,
                    ],
                    'actor' => [
                        'id' => $r->reviewer?->id,
                        'name' => $r->reviewer?->name ?? 'Reviewer',
                        'role' => $r->reviewer?->role ?? 'admin',
                        'department' => $r->reviewer?->department?->name ?? 'Management',
                    ],
                    'content' => $r->comments ?: ($isApproved ? 'Approved without comment' : 'Returned for revision'),
                    'details' => [
                        'decision' => $r->decision,
                        'comments' => $r->comments,
                        'return_to' => $r->nextReviewer?->name,
                    ],
                    'created_at' => ($r->reviewed_at ?? now())->toIso8601String(),
                    'time_ago' => $r->reviewed_at ? $r->reviewed_at->diffForHumans() : 'recently',
                ]);
            }
        }

        // Sort all merged logs descending by timestamp
        $sorted = $logs->sortByDesc(fn($item) => Carbon::parse($item['created_at'])->timestamp)->values();

        // Paginate slice
        $total = $sorted->count();
        $offset = ($page - 1) * $perPage;
        $items = $sorted->slice($offset, $perPage)->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => max((int) ceil($total / $perPage), 1),
            ],
        ]);
    }

    /**
     * High-level summary metrics for Admin Work Logs.
     */
    public function stats(Request $request): JsonResponse
    {
        if ($unauthorized = $this->checkAdminPermission($request)) {
            return $unauthorized;
        }

        $totalComments = TaskComment::count();
        $totalStatusChanges = TaskStatusHistory::count();
        $totalAttachments = TaskAttachment::count();
        $totalReviews = TaskReview::count();
        $totalTasks = Task::count();
        $totalActivities = ActivityLog::count();

        $totalLogs = $totalComments + $totalStatusChanges + $totalAttachments + $totalReviews;

        return response()->json([
            'data' => [
                'total_logs' => $totalLogs,
                'total_comments' => $totalComments,
                'total_status_changes' => $totalStatusChanges,
                'total_attachments' => $totalAttachments,
                'total_reviews' => $totalReviews,
                'total_tasks' => $totalTasks,
                'total_activities' => $totalActivities,
            ],
        ]);
    }

    /**
     * Unified, paginated Task Journeys list (creation to end for every task).
     */
    public function journeys(Request $request): JsonResponse
    {
        if ($unauthorized = $this->checkAdminPermission($request)) {
            return $unauthorized;
        }

        $search = $request->query('search');
        $taskId = $request->query('task_id');
        $userId = $request->query('user_id');
        $status = $request->query('status');
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 8);

        $query = Task::with([
            'creator.department',
            'department',
            'branches.owner.department',
            'branches.assignments.assignedBy.department',
            'branches.assignments.assignedTo.department',
            'branches.collaborators.user.department',
            'statusHistory.changedBy.department',
            'submissions.submittedBy.department',
            'submissions.reviews.reviewer.department',
            'comments.user.department',
            'attachments.uploadedBy.department',
            'holdRecords.putOnHoldBy.department',
        ]);

        if ($taskId) {
            $query->where('id', $taskId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($userId) {
            $query->where(function ($q) use ($userId) {
                $q->where('creator_id', $userId)
                  ->orWhereHas('branches', fn($b) => $b->where('owner_id', $userId))
                  ->orWhereHas('branches.assignments', fn($a) => $a->where('assigned_to_id', $userId)->orWhere('assigned_by_id', $userId))
                  ->orWhereHas('submissions', fn($s) => $s->where('submitted_by_id', $userId))
                  ->orWhereHas('submissions.reviews', fn($r) => $r->where('reviewer_id', $userId));
            });
        }

        if ($search) {
            $cleanSearch = ltrim(preg_replace('/^t-0*/i', '', trim($search)), '#');
            $query->where(function ($q) use ($search, $cleanSearch) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
                if (is_numeric($cleanSearch) && (int)$cleanSearch > 0) {
                    $q->orWhere('id', (int)$cleanSearch);
                }
                $q->orWhereHas('creator', fn($u) => $u->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('branches.owner', fn($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        $paginated = $query->latest('id')->paginate($perPage, ['*'], 'page', $page);

        $data = collect($paginated->items())->map(function ($task) {
            $currentOwner = $task->branches->first()?->owner ?? $task->creator;
            return [
                'task' => [
                    'id' => $task->id,
                    'task_code' => sprintf('T-%03d', $task->id),
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'progress' => $task->progress,
                    'handling_method' => $task->handling_method,
                    'creator' => $task->creator ? [
                        'id' => $task->creator->id,
                        'name' => $task->creator->name,
                        'email' => $task->creator->email,
                        'role' => $task->creator->role,
                        'department' => $task->creator->department?->name ?? 'General',
                    ] : null,
                    'current_owner' => $currentOwner ? [
                        'id' => $currentOwner->id,
                        'name' => $currentOwner->name,
                        'role' => $currentOwner->role,
                        'department' => $currentOwner->department?->name ?? 'General',
                    ] : null,
                    'department' => $task->department ? [
                        'id' => $task->department->id,
                        'name' => $task->department->name,
                    ] : null,
                    'due_date' => $task->due_date?->toDateString(),
                    'created_at' => $task->created_at->toIso8601String(),
                    'completed_at' => $task->completed_at ? Carbon::parse($task->completed_at)->toIso8601String() : null,
                ],
                'stats' => [
                    'branches_count' => $task->branches->count(),
                    'submissions_count' => $task->submissions->count(),
                    'reviews_count' => $task->submissions->flatMap->reviews->count(),
                    'comments_count' => $task->comments->count(),
                    'attachments_count' => $task->attachments->count(),
                ],
                'branches' => $task->branches->map(fn($b) => [
                    'id' => $b->id,
                    'title' => $b->title,
                    'status' => $b->status,
                    'owner' => $b->owner ? ['id' => $b->owner->id, 'name' => $b->owner->name, 'role' => $b->owner->role] : null,
                    'assigned_by' => $b->assignments->firstWhere('is_current', true)?->assignedBy ? [
                        'id' => $b->assignments->firstWhere('is_current', true)->assignedBy->id,
                        'name' => $b->assignments->firstWhere('is_current', true)->assignedBy->name,
                        'role' => $b->assignments->firstWhere('is_current', true)->assignedBy->role,
                    ] : null,
                ]),
                'journey' => $this->buildTaskJourneyTimeline($task),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'last_page' => $paginated->lastPage(),
            ],
        ]);
    }

    /**
     * Build unified, clean, top-to-bottom chronological timeline for a task.
     */
    public function buildTaskJourneyTimeline(Task $task): array
    {
        $task->loadMissing([
            'creator.department',
            'department',
            'branches.owner.department',
            'branches.assignments.assignedBy.department',
            'branches.assignments.assignedTo.department',
            'branches.collaborators.user.department',
            'statusHistory.changedBy.department',
            'submissions.submittedBy.department',
            'submissions.reviews.reviewer.department',
            'comments.user.department',
            'attachments.uploadedBy.department',
            'holdRecords.putOnHoldBy.department',
        ]);

        $steps = collect();

        // 1. Inception & Creation
        $steps->push([
            'raw_time' => Carbon::parse($task->created_at)->timestamp,
            'sort_order' => 10,
            'timestamp' => Carbon::parse($task->created_at)->toIso8601String(),
            'formatted_time' => Carbon::parse($task->created_at)->format('M d, Y h:i A'),
            'time_ago' => Carbon::parse($task->created_at)->diffForHumans(),
            'stage_type' => 'creation',
            'badge_label' => 'Initiated',
            'title' => "Task Created: {$task->title}",
            'actor' => [
                'name' => $task->creator?->name ?? 'Creator',
                'role' => $task->creator?->role ?? 'admin',
                'department' => $task->creator?->department?->name ?? 'Operations',
            ],
            'summary' => "Task initiated with handling method " . strtoupper($task->handling_method) . " and priority " . strtoupper($task->priority) . ($task->description ? " — {$task->description}" : ""),
            'attachments' => [],
        ]);

        // 2. Branch Assignments & Delegations
        foreach ($task->branches as $b) {
            foreach ($b->assignments as $a) {
                $assignTime = $a->assigned_at ?? $b->created_at;
                $steps->push([
                    'raw_time' => Carbon::parse($assignTime)->timestamp,
                    'sort_order' => 20,
                    'timestamp' => Carbon::parse($assignTime)->toIso8601String(),
                    'formatted_time' => Carbon::parse($assignTime)->format('M d, Y h:i A'),
                    'time_ago' => Carbon::parse($assignTime)->diffForHumans(),
                    'stage_type' => 'assignment',
                    'badge_label' => 'Assignment',
                    'title' => "Assigned to " . ($a->assignedTo?->name ?? 'Assignee') . ($b->title && $b->title !== $task->title ? " ({$b->title})" : ""),
                    'actor' => [
                        'name' => $a->assignedBy?->name ?? $task->creator?->name ?? 'Assigner',
                        'role' => $a->assignedBy?->role ?? 'user',
                        'department' => $a->assignedBy?->department?->name ?? 'Operations',
                    ],
                    'summary' => "Task branch assigned to {$a->assignedTo?->name}" . ($b->due_date ? " with deadline " . Carbon::parse($b->due_date)->format('M d, Y') : ""),
                    'attachments' => [],
                ]);
            }
        }

        // 3. Submissions with their attached deliverables and reviews
        foreach ($task->submissions as $sub) {
            $subAttachments = $task->attachments->filter(function ($att) use ($sub) {
                if ($att->task_branch_id && $sub->task_branch_id && (int)$att->task_branch_id === (int)$sub->task_branch_id) {
                    return abs(Carbon::parse($att->created_at)->diffInSeconds(Carbon::parse($sub->submitted_at))) <= 20;
                }
                return (int)$att->uploaded_by_id === (int)$sub->submitted_by_id && abs(Carbon::parse($att->created_at)->diffInSeconds(Carbon::parse($sub->submitted_at))) <= 20;
            })->map(fn($att) => [
                'id' => $att->id,
                'file_name' => $att->file_name,
                'file_size' => $att->getFileSizeInMB() . ' MB',
                'download_url' => url("/api/v1/attachments/{$att->id}/download"),
            ])->values()->all();

            $subType = $sub->is_final ? 'final_sign_off' : 'submission';
            $subLabel = $sub->is_final ? 'Final Verification' : 'Submitted';
            $subTitle = $sub->is_final ? 'Final Deliverables Verified & Submitted' : 'Work Submitted for Review';

            $steps->push([
                'raw_time' => Carbon::parse($sub->submitted_at)->timestamp,
                'sort_order' => $sub->is_final ? 80 : 40,
                'timestamp' => Carbon::parse($sub->submitted_at)->toIso8601String(),
                'formatted_time' => Carbon::parse($sub->submitted_at)->format('M d, Y h:i A'),
                'time_ago' => Carbon::parse($sub->submitted_at)->diffForHumans(),
                'stage_type' => $subType,
                'badge_label' => $subLabel,
                'title' => $subTitle,
                'actor' => [
                    'name' => $sub->submittedBy?->name ?? 'Assignee',
                    'role' => $sub->submittedBy?->role ?? 'employee',
                    'department' => $sub->submittedBy?->department?->name ?? 'Operations',
                ],
                'summary' => $sub->description ?: 'Deliverables submitted for evaluation',
                'attachments' => $subAttachments,
            ]);

            foreach ($sub->reviews as $rev) {
                $isApproved = $rev->decision === 'approved';
                $steps->push([
                    'raw_time' => Carbon::parse($rev->reviewed_at)->timestamp,
                    'sort_order' => $isApproved ? 55 : 50,
                    'timestamp' => Carbon::parse($rev->reviewed_at)->toIso8601String(),
                    'formatted_time' => Carbon::parse($rev->reviewed_at)->format('M d, Y h:i A'),
                    'time_ago' => Carbon::parse($rev->reviewed_at)->diffForHumans(),
                    'stage_type' => $isApproved ? 'review_approved' : 'review_returned',
                    'badge_label' => $isApproved ? 'Approved' : 'Needs Correction',
                    'title' => $isApproved ? "Review Approved" : "Returned for Correction",
                    'actor' => [
                        'name' => $rev->reviewer?->name ?? 'Reviewer',
                        'role' => $rev->reviewer?->role ?? 'reviewer',
                        'department' => $rev->reviewer?->department?->name ?? 'Management',
                    ],
                    'summary' => $rev->comments ?: ($isApproved ? 'Submission approved by reviewer' : 'Returned for revision'),
                    'attachments' => [],
                ]);
            }
        }

        // 4. Comments & Clarifications
        foreach ($task->comments as $com) {
            if (str_starts_with($com->comment, '⚠️ Work Returned for Correction:')) {
                continue;
            }

            $isClarification = str_contains($com->comment, 'Clarification') || str_contains($com->comment, 'Missing Details') || str_contains($com->comment, 'Details Provided');

            $steps->push([
                'raw_time' => Carbon::parse($com->created_at)->timestamp,
                'sort_order' => 35,
                'timestamp' => Carbon::parse($com->created_at)->toIso8601String(),
                'formatted_time' => Carbon::parse($com->created_at)->format('M d, Y h:i A'),
                'time_ago' => Carbon::parse($com->created_at)->diffForHumans(),
                'stage_type' => $isClarification ? 'clarification' : 'communication',
                'badge_label' => $isClarification ? 'Clarification' : ($com->is_internal ? 'Internal Note' : 'Communication'),
                'title' => $isClarification ? "Details & Clarification Note" : ($com->is_internal ? "Internal Memo Logged" : "Team Communication Note"),
                'actor' => [
                    'name' => $com->user?->name ?? 'Team Member',
                    'role' => $com->user?->role ?? 'employee',
                    'department' => $com->user?->department?->name ?? 'General',
                ],
                'summary' => $com->comment,
                'attachments' => [],
            ]);
        }

        // 5. On Hold & Resume
        foreach ($task->holdRecords as $hold) {
            $steps->push([
                'raw_time' => Carbon::parse($hold->held_at ?? $hold->created_at)->timestamp,
                'sort_order' => 60,
                'timestamp' => Carbon::parse($hold->held_at ?? $hold->created_at)->toIso8601String(),
                'formatted_time' => Carbon::parse($hold->held_at ?? $hold->created_at)->format('M d, Y h:i A'),
                'time_ago' => Carbon::parse($hold->held_at ?? $hold->created_at)->diffForHumans(),
                'stage_type' => 'hold',
                'badge_label' => 'On Hold',
                'title' => "Task Put On Hold",
                'actor' => [
                    'name' => $hold->putOnHoldBy?->name ?? 'Manager',
                    'role' => $hold->putOnHoldBy?->role ?? 'manager',
                    'department' => $hold->putOnHoldBy?->department?->name ?? 'Operations',
                ],
                'summary' => "Reason: " . ($hold->reason ?: 'Temporary pause'),
                'attachments' => [],
            ]);
        }

        // 6. Final Closure
        if ($task->status === 'completed' && $task->completed_at) {
            $steps->push([
                'raw_time' => Carbon::parse($task->completed_at)->timestamp + 2,
                'sort_order' => 99,
                'timestamp' => Carbon::parse($task->completed_at)->toIso8601String(),
                'formatted_time' => Carbon::parse($task->completed_at)->format('M d, Y h:i A'),
                'time_ago' => Carbon::parse($task->completed_at)->diffForHumans(),
                'stage_type' => 'completed',
                'badge_label' => '100% Completed',
                'title' => "Task 100% Completed & Verified",
                'actor' => [
                    'name' => $task->creator?->name ?? 'Creator',
                    'role' => $task->creator?->role ?? 'admin',
                    'department' => $task->creator?->department?->name ?? 'Management',
                ],
                'summary' => "Creator confirmed all deliverables and officially closed the task.",
                'attachments' => [],
            ]);
        }

        // Sort chronologically: TOP TO BOTTOM (creation to end)
        return $steps->sortBy(function ($item) {
            return ($item['raw_time'] * 100) + $item['sort_order'];
        })->values()->map(function ($s, $idx) {
            $s['milestone_index'] = $idx + 1;
            unset($s['raw_time']);
            unset($s['sort_order']);
            return $s;
        })->all();
    }

    /**
     * Complete Task Journey Dossier: Creation to completion, with all communications and attachments.
     */
    public function taskJourney(Request $request, Task $task): JsonResponse
    {
        if ($unauthorized = $this->checkAdminPermission($request)) {
            return $unauthorized;
        }

        $task->load([
            'creator.department',
            'department',
            'branches.owner.department',
            'branches.collaborators.user',
            'holdRecords.putOnHoldBy',
        ]);

        $currentOwner = $task->branches->first()?->owner ?? $task->creator;

        // 1. All Communications (Comments)
        $comments = TaskComment::where('task_id', $task->id)
            ->with(['user.department', 'branch'])
            ->oldest()
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'user' => [
                    'id' => $c->user?->id,
                    'name' => $c->user?->name ?? 'User',
                    'role' => $c->user?->role ?? 'employee',
                    'department' => $c->user?->department?->name ?? 'General',
                ],
                'branch' => $c->branch ? ['id' => $c->branch->id, 'title' => $c->branch->title] : null,
                'comment' => $c->comment,
                'is_internal' => $c->is_internal,
                'created_at' => $c->created_at->toIso8601String(),
                'time_ago' => $c->created_at->diffForHumans(),
            ]);

        // 2. All Attachments
        $attachments = TaskAttachment::where('task_id', $task->id)
            ->with(['uploadedBy.department'])
            ->latest()
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'file_name' => $a->file_name,
                'file_size' => $a->file_size,
                'file_size_formatted' => $a->getFileSizeInMB() . ' MB',
                'file_type' => $a->file_type,
                'download_url' => url("/api/v1/attachments/{$a->id}/download"),
                'uploaded_by' => [
                    'id' => $a->uploadedBy?->id,
                    'name' => $a->uploadedBy?->name ?? 'User',
                    'role' => $a->uploadedBy?->role ?? 'employee',
                ],
                'created_at' => $a->created_at->toIso8601String(),
            ]);

        // 3. Chronological Journey Timeline (Creation -> Handovers -> Reviews -> Completion)
        $sortedTimeline = $this->buildTaskJourneyTimeline($task);

        // Branches
        $branches = $task->branches->map(fn($b) => [
            'id' => $b->id,
            'title' => $b->title,
            'description' => $b->description,
            'status' => $b->status,
            'owner' => $b->owner ? ['id' => $b->owner->id, 'name' => $b->owner->name, 'role' => $b->owner->role] : null,
            'collaborators' => $b->collaborators->map(fn($c) => [
                'id' => $c->user?->id,
                'name' => $c->user?->name,
                'role' => $c->user?->role,
            ]),
            'created_at' => $b->created_at->toIso8601String(),
        ]);

        return response()->json([
            'data' => [
                'task' => [
                    'id' => $task->id,
                    'task_code' => sprintf('T-%03d', $task->id),
                    'title' => $task->title,
                    'description' => $task->description,
                    'expected_result' => $task->expected_result,
                    'acceptance_criteria' => $task->acceptance_criteria,
                    'handling_method' => $task->handling_method,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'progress' => $task->progress,
                    'creator' => $task->creator ? ['id' => $task->creator->id, 'name' => $task->creator->name, 'email' => $task->creator->email] : null,
                    'current_owner' => $currentOwner ? ['id' => $currentOwner->id, 'name' => $currentOwner->name, 'email' => $currentOwner->email, 'role' => $currentOwner->role] : null,
                    'department' => $task->department ? ['id' => $task->department->id, 'name' => $task->department->name] : null,
                    'start_date' => $task->start_date?->toDateString(),
                    'due_date' => $task->due_date?->toDateString(),
                    'completed_at' => $task->completed_at ? Carbon::parse($task->completed_at)->toIso8601String() : null,
                    'created_at' => $task->created_at->toIso8601String(),
                ],
                'timeline' => $sortedTimeline,
                'conversations' => $comments,
                'attachments' => $attachments,
                'branches' => $branches,
            ],
        ]);
    }

    /**
     * Quick list of tasks for filtering.
     */
    public function tasksList(): JsonResponse
    {
        $tasks = Task::select('id', 'title', 'status', 'priority')
            ->latest('id')
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'task_code' => sprintf('T-%03d', $t->id),
                'title' => $t->title,
                'status' => $t->status,
            ]);

        return response()->json(['data' => $tasks]);
    }

    /**
     * Quick list of users for filtering.
     */
    public function usersList(): JsonResponse
    {
        $users = User::select('id', 'name', 'role', 'department_id')
            ->with('department:id,name')
            ->where('is_active', true)
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'role' => $u->role,
                'department' => $u->department?->name ?? 'General',
            ]);

        return response()->json(['data' => $users]);
    }
}
