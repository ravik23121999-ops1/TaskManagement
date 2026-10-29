<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskAssignment;
use App\Models\TaskMessage;
use App\Models\TaskAttachment;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    /**
     * Get list of conversation threads (branch-wise)
     * Tab: 'my_chats' (direct conversations) or 'other' (subordinate branch oversight)
     */
    public function threads(Request $request): JsonResponse
    {
        $user = $request->user();
        $tab = $request->query('tab', 'my_chats');

        if ($tab === 'other') {
            return $this->getOtherCommunicationsThreads($user);
        }

        return $this->getMyChatsThreads($user);
    }

    /**
     * Tab 1: My Chats (Direct 1-on-1 Assigner <-> Assignee Branch Conversations)
     */
    protected function getMyChatsThreads(User $user): JsonResponse
    {
        // 1. Find all branches where the user is either the current Assigner or Assignee
        $branches = TaskBranch::with([
            'task.creator.department',
            'owner.department',
            'assignments.assignedTo.department',
            'assignments.assignedBy.department',
        ])
        ->whereHas('task', function ($q) {
            $q->whereNull('deleted_at');
        })
        ->get();

        $threads = [];
        $seenThreadKeys = [];

        foreach ($branches as $branch) {
            $task = $branch->task;
            if (!$task) continue;

            // Get the current active assignment for this branch
            $currentAssignment = $branch->assignments->firstWhere('is_current', true)
                ?: $branch->assignments->sortByDesc('id')->first();

            $assigner = $currentAssignment?->assignedBy ?: $task->creator;
            $assignee = $currentAssignment?->assignedTo ?: $branch->owner;

            if (!$assigner || !$assignee) continue;

            // Check if current user is either the assigner or assignee
            $isAssigner = ($user->id === $assigner->id);
            $isAssignee = ($user->id === $assignee->id);

            // Also check if any messages exist involving the user for this branch
            $hasMessagesAsSenderOrRecipient = TaskMessage::where('task_branch_id', $branch->id)
                ->where(function ($q) use ($user) {
                    $q->where('sender_id', $user->id)
                      ->orWhere('recipient_id', $user->id);
                })
                ->exists();

            if (!$isAssigner && !$isAssignee && !$hasMessagesAsSenderOrRecipient) {
                continue;
            }

            // Determine partner
            $partner = $isAssigner ? $assignee : $assigner;
            if ($user->id === $partner->id) {
                // If user is both assigner and assignee (work-alone or self-assigned), partner is self or creator
                $partner = ($user->id === $task->creator_id && $assignee->id !== $user->id) ? $assignee : $assigner;
            }

            $threadKey = "{$branch->id}_{$partner->id}";
            if (isset($seenThreadKeys[$threadKey])) {
                continue;
            }
            $seenThreadKeys[$threadKey] = true;

            // Fetch latest message between user and partner on this branch
            $latestMessage = TaskMessage::where('task_branch_id', $branch->id)
                ->where(function ($q) use ($user, $partner) {
                    $q->where(function ($sub) use ($user, $partner) {
                        $sub->where('sender_id', $user->id)->where('recipient_id', $partner->id);
                    })->orWhere(function ($sub) use ($user, $partner) {
                        $sub->where('sender_id', $partner->id)->where('recipient_id', $user->id);
                    });
                })
                ->latest()
                ->first();

            // Unread count for current user
            $unreadCount = TaskMessage::where('task_branch_id', $branch->id)
                ->where('recipient_id', $user->id)
                ->where('sender_id', $partner->id)
                ->where('is_read', false)
                ->count();

            $lastTimestamp = $latestMessage ? $latestMessage->created_at : $branch->created_at;

            $threads[] = [
                'id' => $threadKey,
                'task_id' => $task->id,
                'task_code' => 'T-' . str_pad($task->id, 3, '0', STR_PAD_LEFT),
                'task_title' => $task->title,
                'task_status' => $task->status,
                'task_priority' => $task->priority,
                'task_handling_method' => $task->handling_method,
                'branch_id' => $branch->id,
                'branch_title' => $branch->title,
                'branch_status' => $branch->status,
                'branch_due_date' => $branch->due_date?->toIso8601String(),
                'partner' => [
                    'id' => $partner->id,
                    'name' => $partner->name,
                    'email' => $partner->email,
                    'role' => $partner->role,
                    'department' => $partner->department?->name ?? 'General',
                    'avatar_url' => $partner->avatar_url,
                    'gender' => $partner->gender ?? 'female',
                ],
                'my_role' => $isAssigner ? 'assigner' : 'assignee',
                'last_message' => $latestMessage ? $latestMessage->message : "Start branch conversation...",
                'last_message_type' => $latestMessage ? $latestMessage->message_type : 'text',
                'last_message_at' => $lastTimestamp->toIso8601String(),
                'last_message_time_ago' => $latestMessage ? $latestMessage->created_at->diffForHumans() : $branch->created_at->diffForHumans(),
                'unread_count' => $unreadCount,
                'has_attachment' => (bool) ($latestMessage?->attachment_id),
                'is_overseer' => false,
            ];
        }

        // Sort by last message timestamp descending
        usort($threads, function ($a, $b) {
            return strcmp($b['last_message_at'], $a['last_message_at']);
        });

        return response()->json([
            'tab' => 'my_chats',
            'threads' => $threads,
            'total_unread' => array_sum(array_column($threads, 'unread_count')),
        ]);
    }

    /**
     * Tab 2: Other Communications (Branch Hierarchy & Subordinate Oversight)
     * Allows managers/assigners to see all subordinate branch communications occurring below their delegation tree
     */
    protected function getOtherCommunicationsThreads(User $user): JsonResponse
    {
        $isAdminOrSubAdmin = in_array($user->role, ['admin', 'sub_admin']);

        // Find branches where the user is an overseer (created the task or assigned a parent branch that was sub-delegated)
        $branchesQuery = TaskBranch::with([
            'task.creator.department',
            'owner.department',
            'assignments.assignedTo.department',
            'assignments.assignedBy.department',
        ])
        ->whereHas('task', function ($q) {
            $q->whereNull('deleted_at');
        });

        if (!$isAdminOrSubAdmin) {
            // Find tasks created by this user, OR branches where parent assignment was by this user
            $branchesQuery->where(function ($q) use ($user) {
                // Task created by user
                $q->whereHas('task', function ($tq) use ($user) {
                    $tq->where('creator_id', $user->id);
                })
                // Or user is the senior delegator (assigned the parent branch)
                ->orWhereHas('parentAssignment', function ($paq) use ($user) {
                    $paq->where('assigned_to_id', $user->id)->orWhere('assigned_by_id', $user->id);
                });
            });
        }

        $branches = $branchesQuery->get();
        $threads = [];
        $seenKeys = [];

        foreach ($branches as $branch) {
            $task = $branch->task;
            if (!$task) continue;

            $currentAssignment = $branch->assignments->firstWhere('is_current', true)
                ?: $branch->assignments->sortByDesc('id')->first();

            $assigner = $currentAssignment?->assignedBy ?: $task->creator;
            $assignee = $currentAssignment?->assignedTo ?: $branch->owner;

            if (!$assigner || !$assignee) continue;

            // In "Other Communications", we exclude conversations where current user is the direct assignee
            // because those belong in "My Chats".
            // If user is Admin, they can see all. If user is senior manager, they see subordinate discussions.
            if (!$isAdminOrSubAdmin && ($user->id === $assignee->id)) {
                continue;
            }

            $threadKey = "sub_{$branch->id}_{$assigner->id}_{$assignee->id}";
            if (isset($seenKeys[$threadKey])) continue;
            $seenKeys[$threadKey] = true;

            // Fetch latest message between the two parties
            $latestMessage = TaskMessage::where('task_branch_id', $branch->id)
                ->where(function ($q) use ($assigner, $assignee) {
                    $q->where(function ($sub) use ($assigner, $assignee) {
                        $sub->where('sender_id', $assigner->id)->where('recipient_id', $assignee->id);
                    })->orWhere(function ($sub) use ($assigner, $assignee) {
                        $sub->where('sender_id', $assignee->id)->where('recipient_id', $assigner->id);
                    });
                })
                ->latest()
                ->first();

            $lastTimestamp = $latestMessage ? $latestMessage->created_at : $branch->created_at;

            $threads[] = [
                'id' => $threadKey,
                'task_id' => $task->id,
                'task_code' => 'T-' . str_pad($task->id, 3, '0', STR_PAD_LEFT),
                'task_title' => $task->title,
                'task_status' => $task->status,
                'task_priority' => $task->priority,
                'task_handling_method' => $task->handling_method,
                'branch_id' => $branch->id,
                'branch_title' => $branch->title,
                'branch_status' => $branch->status,
                'branch_due_date' => $branch->due_date?->toIso8601String(),
                'assigner' => [
                    'id' => $assigner->id,
                    'name' => $assigner->name,
                    'role' => $assigner->role,
                    'department' => $assigner->department?->name ?? 'General',
                    'avatar_url' => $assigner->avatar_url,
                    'gender' => $assigner->gender ?? 'female',
                ],
                'assignee' => [
                    'id' => $assignee->id,
                    'name' => $assignee->name,
                    'role' => $assignee->role,
                    'department' => $assignee->department?->name ?? 'General',
                    'avatar_url' => $assignee->avatar_url,
                    'gender' => $assignee->gender ?? 'female',
                ],
                'partner' => [
                    'id' => $assignee->id,
                    'name' => "{$assigner->name} ↔ {$assignee->name}",
                    'role' => "Delegated Branch Conversation",
                    'department' => $assignee->department?->name ?? 'General',
                    'avatar_url' => $assignee->avatar_url,
                    'gender' => $assignee->gender ?? 'female',
                ],
                'my_role' => 'overseer',
                'last_message' => $latestMessage ? $latestMessage->message : "Subordinate thread initialized...",
                'last_message_type' => $latestMessage ? $latestMessage->message_type : 'text',
                'last_message_at' => $lastTimestamp->toIso8601String(),
                'last_message_time_ago' => $latestMessage ? $latestMessage->created_at->diffForHumans() : $branch->created_at->diffForHumans(),
                'unread_count' => 0,
                'has_attachment' => (bool) ($latestMessage?->attachment_id),
                'is_overseer' => true,
            ];
        }

        usort($threads, function ($a, $b) {
            return strcmp($b['last_message_at'], $a['last_message_at']);
        });

        return response()->json([
            'tab' => 'other',
            'threads' => $threads,
            'total_unread' => 0,
        ]);
    }

    /**
     * Get message history for a specific branch conversation thread
     */
    public function getThreadMessages(Request $request, $branchId): JsonResponse
    {
        $user = $request->user();
        $partnerId = (int) $request->query('partner_id');
        $isOverseer = filter_var($request->query('is_overseer', false), FILTER_VALIDATE_BOOLEAN);

        $branch = TaskBranch::with([
            'task.creator.department',
            'owner.department',
            'assignments.assignedTo.department',
            'assignments.assignedBy.department',
            'attachments.user',
        ])->findOrFail($branchId);

        $task = $branch->task;
        $isAdminOrSubAdmin = in_array($user->role, ['admin', 'sub_admin']);

        // Determine assigner and assignee
        $currentAssignment = $branch->assignments->firstWhere('is_current', true)
            ?: $branch->assignments->sortByDesc('id')->first();

        $assigner = $currentAssignment?->assignedBy ?: $task->creator;
        $assignee = $currentAssignment?->assignedTo ?: $branch->owner;

        // Security / Peer-isolation verification:
        // A peer assignee must NEVER access another peer's branch conversation!
        $isDirectParty = ($user->id === $assigner->id || $user->id === $assignee->id);
        $isSeniorOverseer = ($isAdminOrSubAdmin || $user->id === $task->creator_id);

        if (!$isDirectParty && !$isSeniorOverseer && !$isOverseer) {
            return response()->json([
                'message' => 'Access Denied: Same-level assignees cannot view other branch conversations.',
            ], 403);
        }

        // Determine partner
        if (!$partnerId) {
            $partnerId = ($user->id === $assigner->id) ? $assignee->id : $assigner->id;
        }
        $partner = User::with('department')->find($partnerId) ?: $assignee;

        // Auto mark incoming messages as read
        TaskMessage::where('task_branch_id', $branch->id)
            ->where('recipient_id', $user->id)
            ->where('sender_id', $partnerId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        // Build messages query
        $messagesQuery = TaskMessage::with([
            'sender.department',
            'recipient.department',
            'attachment',
        ])
        ->where('task_branch_id', $branch->id);

        if ($isDirectParty) {
            // Strictly between the user and the partner
            $messagesQuery->where(function ($q) use ($user, $partnerId) {
                $q->where(function ($sub) use ($user, $partnerId) {
                    $sub->where('sender_id', $user->id)->where('recipient_id', $partnerId);
                })->orWhere(function ($sub) use ($user, $partnerId) {
                    $sub->where('sender_id', $partnerId)->where('recipient_id', $user->id);
                });
            });
        } elseif ($isOverseer || $isSeniorOverseer) {
            // Overseer inspecting subordinate conversation
            if ($partnerId && $partnerId !== $assigner->id && $partnerId !== $assignee->id) {
                $messagesQuery->where(function ($q) use ($partnerId) {
                    $q->where('sender_id', $partnerId)->orWhere('recipient_id', $partnerId);
                });
            } else {
                $messagesQuery->where(function ($q) use ($assigner, $assignee) {
                    $q->where(function ($sub) use ($assigner, $assignee) {
                        $sub->where('sender_id', $assigner->id)->where('recipient_id', $assignee->id);
                    })->orWhere(function ($sub) use ($assigner, $assignee) {
                        $sub->where('sender_id', $assignee->id)->where('recipient_id', $assigner->id);
                    });
                });
            }
        }

        $rawMessages = $messagesQuery->orderBy('created_at', 'asc')->get();

        $messages = $rawMessages->map(function ($m) use ($user) {
            return [
                'id' => $m->id,
                'task_id' => $m->task_id,
                'task_branch_id' => $m->task_branch_id,
                'sender_id' => $m->sender_id,
                'recipient_id' => $m->recipient_id,
                'is_me' => ($m->sender_id === $user->id),
                'sender_name' => $m->sender?->name ?? 'User',
                'sender_avatar' => $m->sender?->avatar_url,
                'sender_role' => $m->sender?->role,
                'message' => $m->message,
                'message_type' => $m->message_type,
                'is_read' => $m->is_read,
                'read_at' => $m->read_at?->toIso8601String(),
                'created_at' => $m->created_at->toIso8601String(),
                'time_formatted' => $m->created_at->format('g:i A'),
                'date_formatted' => $m->created_at->format('M d, Y'),
                'attachment' => $m->attachment ? [
                    'id' => $m->attachment->id,
                    'file_name' => $m->attachment->file_name,
                    'file_size' => $m->attachment->file_size_formatted ?? ($m->attachment->file_size ? round($m->attachment->file_size / 1024, 1) . ' KB' : 'Document'),
                    'file_type' => $m->attachment->file_type,
                    'download_url' => url("/api/v1/attachments/{$m->attachment->id}/download"),
                ] : null,
            ];
        });

        // Determine my role in this thread
        $myRole = 'overseer';
        if ($user->id === $assigner->id) {
            $myRole = 'assigner';
        } elseif ($user->id === $assignee->id) {
            $myRole = 'assignee';
        }

        return response()->json([
            'messages' => $messages,
            'task' => [
                'id' => $task->id,
                'task_code' => 'T-' . str_pad($task->id, 3, '0', STR_PAD_LEFT),
                'title' => $task->title,
                'status' => $task->status,
                'priority' => $task->priority,
                'handling_method' => $task->handling_method,
                'acceptance_criteria' => $task->acceptance_criteria,
                'expected_result' => $task->expected_result,
                'start_date' => $task->start_date?->format('M d, Y'),
                'due_date' => $task->due_date?->format('M d, Y'),
            ],
            'branch' => [
                'id' => $branch->id,
                'title' => $branch->title,
                'status' => $branch->status,
                'due_date' => $branch->due_date?->format('M d, Y'),
            ],
            'partner' => [
                'id' => $partner->id,
                'name' => $partner->name,
                'email' => $partner->email,
                'role' => $partner->role,
                'department' => $partner->department?->name ?? 'General',
                'avatar_url' => $partner->avatar_url,
                'gender' => $partner->gender ?? 'female',
            ],
            'assigner' => [
                'id' => $assigner->id,
                'name' => $assigner->name,
                'role' => $assigner->role,
                'avatar_url' => $assigner->avatar_url,
            ],
            'assignee' => [
                'id' => $assignee->id,
                'name' => $assignee->name,
                'role' => $assignee->role,
                'avatar_url' => $assignee->avatar_url,
            ],
            'my_role' => $myRole,
            'is_overseer' => (!$isDirectParty && $isSeniorOverseer),
        ]);
    }

    /**
     * Send a work message in branch thread
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'task_branch_id' => 'required|exists:task_branches,id',
            'recipient_id' => 'required|exists:users,id',
            'message' => 'required|string|max:5000',
            'message_type' => 'nullable|string|in:text,missing_details_request,details_provided,review_feedback,deliverable_update',
            'attachment_id' => 'nullable|exists:task_attachments,id',
        ]);

        $task = Task::findOrFail($validated['task_id']);
        $branch = TaskBranch::findOrFail($validated['task_branch_id']);
        $recipient = User::findOrFail($validated['recipient_id']);

        // Create the message
        $message = TaskMessage::create([
            'task_id' => $task->id,
            'task_branch_id' => $branch->id,
            'sender_id' => $user->id,
            'recipient_id' => $recipient->id,
            'message' => $validated['message'],
            'message_type' => $validated['message_type'] ?? 'text',
            'attachment_id' => $validated['attachment_id'] ?? null,
            'is_read' => false,
        ]);

        // Send a system notification to the recipient
        $msgTypeLabel = match ($message->message_type) {
            'missing_details_request' => '⚠️ Missing Details Requested',
            'details_provided' => '✅ Details / Docs Provided',
            'review_feedback' => '📋 Review Evaluation Feedback',
            'deliverable_update' => '📎 Deliverable Uploaded',
            default => 'Work Message',
        };

        SystemNotification::create([
            'user_id' => $recipient->id,
            'type' => 'task_message',
            'title' => "{$msgTypeLabel} on T-" . str_pad($task->id, 3, '0', STR_PAD_LEFT),
            'message' => "{$user->name}: " . Str::limit($message->message, 90),
            'task_id' => $task->id,
            'is_read' => false,
            'created_at' => now(),
        ]);

        $message->load(['sender.department', 'recipient.department', 'attachment']);

        return response()->json([
            'status' => 'success',
            'message' => [
                'id' => $message->id,
                'task_id' => $message->task_id,
                'task_branch_id' => $message->task_branch_id,
                'sender_id' => $message->sender_id,
                'recipient_id' => $message->recipient_id,
                'is_me' => true,
                'sender_name' => $user->name,
                'sender_avatar' => $user->avatar_url,
                'sender_role' => $user->role,
                'message' => $message->message,
                'message_type' => $message->message_type,
                'is_read' => false,
                'read_at' => null,
                'created_at' => $message->created_at->toIso8601String(),
                'time_formatted' => $message->created_at->format('g:i A'),
                'date_formatted' => $message->created_at->format('M d, Y'),
                'attachment' => $message->attachment ? [
                    'id' => $message->attachment->id,
                    'file_name' => $message->attachment->file_name,
                    'file_size' => $message->attachment->file_size_formatted ?? ($message->attachment->file_size ? round($message->attachment->file_size / 1024, 1) . ' KB' : 'Document'),
                    'file_type' => $message->attachment->file_type,
                    'download_url' => url("/api/v1/attachments/{$message->attachment->id}/download"),
                ] : null,
            ],
        ], 201);
    }

    /**
     * Upload an attachment/document directly from the message composer
     */
    public function uploadAttachment(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'file' => 'required|file|max:20480', // Max 20MB
            'task_id' => 'required|exists:tasks,id',
            'task_branch_id' => 'nullable|exists:task_branches,id',
        ]);

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $fileSize = $file->getSize();
        $fileType = $file->getClientMimeType();

        $path = $file->store('attachments', 'public');

        $attachment = TaskAttachment::create([
            'task_id' => $request->task_id,
            'task_branch_id' => $request->task_branch_id,
            'user_id' => $user->id,
            'file_name' => $fileName,
            'file_path' => $path,
            'file_type' => $fileType,
            'file_size' => $fileSize,
        ]);

        return response()->json([
            'status' => 'success',
            'attachment' => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_size' => round($fileSize / 1024, 1) . ' KB',
                'file_type' => $fileType,
                'download_url' => url("/api/v1/attachments/{$attachment->id}/download"),
            ],
        ]);
    }

    /**
     * Get total unread count for current user
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = TaskMessage::where('recipient_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }
}
