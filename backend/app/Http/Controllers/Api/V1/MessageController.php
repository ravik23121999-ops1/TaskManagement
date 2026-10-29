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
            return $this->getOtherCommunicationsThreads($user, $request);
        }

        return $this->getMyChatsThreads($user, $request);
    }

    /**
     * Resolve user client timezone safely (defaults to app timezone / UTC)
     */
    private function resolveTimezone(Request $request): string
    {
        $tz = $request->header('X-Timezone') ?: $request->query('timezone');
        if ($tz && in_array($tz, timezone_identifiers_list())) {
            return $tz;
        }
        return config('app.timezone', 'UTC');
    }

    /**
     * Tab 1: My Chats (Direct Branch Conversations with Assignees and Collaborators)
     */
    protected function getMyChatsThreads(User $user, ?Request $request = null): JsonResponse
    {
        // Find all branches where current user is directly involved:
        // - As Assignee (owner_id or current assignment assigned_to_id)
        // - As Assigner (current assignment assigned_by_id or task creator)
        // - As Collaborator (active in task_collaborators)
        // - Or has participated in message history
        $branches = TaskBranch::with([
            'task.creator.department',
            'owner.department',
            'assignments.assignedTo.department',
            'assignments.assignedBy.department',
            'collaborators.user.department',
            'latestMessage.sender',
        ])
        ->whereHas('task')
        ->where(function ($q) use ($user) {
            $q->where('owner_id', $user->id)
              ->orWhereHas('task', fn($tq) => $tq->where('creator_id', $user->id))
              ->orWhereHas('assignments', fn($aq) => $aq->where('assigned_to_id', $user->id)->orWhere('assigned_by_id', $user->id))
              ->orWhereHas('collaborators', fn($cq) => $cq->where('user_id', $user->id)->whereNull('removed_at'))
              ->orWhereHas('messages', fn($mq) => $mq->where('sender_id', $user->id)->orWhere('recipient_id', $user->id));
        })
        ->get();

        // High-scale batch aggregation: Pre-fetch unread counts for all branches in a single query
        $branchIds = $branches->pluck('id')->all();
        $unreadCountsByBranch = !empty($branchIds)
            ? TaskMessage::whereIn('task_branch_id', $branchIds)
                ->where('sender_id', '!=', $user->id)
                ->where('is_read', false)
                ->where(function ($q) use ($user) {
                    $q->where('recipient_id', $user->id)
                      ->orWhereNull('recipient_id');
                })
                ->select('task_branch_id', DB::raw('count(*) as aggregate'))
                ->groupBy('task_branch_id')
                ->pluck('aggregate', 'task_branch_id')
                ->all()
            : [];

        $threads = [];
        $seenThreadKeys = [];

        foreach ($branches as $branch) {
            $task = $branch->task;
            if (!$task) continue;

            $activeCollaborators = $branch->collaborators->filter(function ($c) {
                return $c->isActive() && $c->user;
            });

            // Exclude work_alone tasks if there are no other collaborators (no chatting with self)
            if ($task->handling_method === 'work_alone' && $activeCollaborators->isEmpty()) {
                continue;
            }

            $currentAssignment = $branch->assignments->firstWhere('is_current', true)
                ?: $branch->assignments->sortByDesc('id')->first();

            $assigner = $currentAssignment?->assignedBy ?: $task->creator;
            $assignee = $currentAssignment?->assignedTo ?: $branch->owner;

            if (!$assigner || !$assignee) continue;

            // If assigner and assignee are the same user and there are no other collaborators, skip self-chat
            if ($assigner->id === $assignee->id && $activeCollaborators->where('user_id', '!=', $user->id)->isEmpty()) {
                continue;
            }

            $isAssigner = ($user->id === $assigner->id);
            $isAssignee = ($user->id === $assignee->id);
            $isCollaborator = $activeCollaborators->contains('user_id', $user->id);

            $hasUserMessages = TaskMessage::where('task_branch_id', $branch->id)
                ->where(function ($q) use ($user) {
                    $q->where('sender_id', $user->id)->orWhere('recipient_id', $user->id);
                })
                ->exists();

            // In "My Chats", user MUST be directly involved on this branch or have participated in its chat history
            if (!$isAssigner && !$isAssignee && !$isCollaborator && !$hasUserMessages) {
                continue;
            }

            // Determine all direct counterparts this user can chat with on this branch
            $counterparts = [];

            if ($isAssigner) {
                // If user is Assigner, counterpart 1 is Assignee (if not self)
                if ($assignee->id !== $user->id) {
                    $counterparts[] = [
                        'user' => $assignee,
                        'thread_role' => 'Assignee',
                        'my_role' => 'assigner',
                    ];
                }
                // Also can chat directly with each active Collaborator
                foreach ($activeCollaborators as $collab) {
                    if ($collab->user && $collab->user->id !== $user->id && $collab->user->id !== $assignee->id) {
                        $counterparts[] = [
                            'user' => $collab->user,
                            'thread_role' => 'Collaborator',
                            'my_role' => 'assigner',
                        ];
                    }
                }
            } elseif ($isAssignee) {
                // If user is Assignee, counterpart 1 is Assigner (if not self)
                if ($assigner->id !== $user->id) {
                    $counterparts[] = [
                        'user' => $assigner,
                        'thread_role' => 'Assigner',
                        'my_role' => 'assignee',
                    ];
                }
                // Also can chat with Collaborators on their branch
                foreach ($activeCollaborators as $collab) {
                    if ($collab->user && $collab->user->id !== $user->id && $collab->user->id !== $assigner->id) {
                        $counterparts[] = [
                            'user' => $collab->user,
                            'thread_role' => 'Collaborator',
                            'my_role' => 'assignee',
                        ];
                    }
                }
            } elseif ($isCollaborator) {
                // If user is Collaborator, can chat with Assigner and Assignee
                if ($assigner->id !== $user->id) {
                    $counterparts[] = [
                        'user' => $assigner,
                        'thread_role' => 'Assigner',
                        'my_role' => 'collaborator',
                    ];
                }
                if ($assignee->id !== $user->id && $assignee->id !== $assigner->id) {
                    $counterparts[] = [
                        'user' => $assignee,
                        'thread_role' => 'Assignee',
                        'my_role' => 'collaborator',
                    ];
                }
            }

            // Permanently retain chat history: include any users the current user exchanged messages with on this branch
            if ($hasUserMessages) {
                $pastMessagePartners = TaskMessage::where('task_branch_id', $branch->id)
                    ->where(function ($q) use ($user) {
                        $q->where('sender_id', $user->id)->orWhere('recipient_id', $user->id);
                    })
                    ->with(['sender.department', 'recipient.department'])
                    ->get();

                foreach ($pastMessagePartners as $pMsg) {
                    $otherUser = ($pMsg->sender_id === $user->id) ? $pMsg->recipient : $pMsg->sender;
                    if ($otherUser && $otherUser->id !== $user->id) {
                        $alreadyExists = collect($counterparts)->contains(fn($c) => $c['user']->id === $otherUser->id);
                        if (!$alreadyExists) {
                            $roleLabel = 'Chat Partner';
                            if ($otherUser->id === $assigner->id) $roleLabel = 'Assigner';
                            elseif ($otherUser->id === $assignee->id) $roleLabel = 'Assignee';
                            elseif ($otherUser->id === $task->creator_id) $roleLabel = 'Task Creator';
                            elseif (in_array($otherUser->role, ['admin', 'sub_admin'])) $roleLabel = 'Executive Reviewer';

                            $counterparts[] = [
                                'user' => $otherUser,
                                'thread_role' => $roleLabel,
                                'my_role' => $isAssigner ? 'assigner' : ($isAssignee ? 'assignee' : 'collaborator'),
                            ];
                        }
                    }
                }
            }

            // High-scale: Pre-resolved branch latest message and unread count from batch eager load
            $latestMessage = $branch->latestMessage;
            $unreadCount = $unreadCountsByBranch[$branch->id] ?? 0;
            $lastTimestamp = $latestMessage ? $latestMessage->created_at : $branch->created_at;

            // For each counterpart, create a distinct chat thread
            foreach ($counterparts as $cp) {
                $partner = $cp['user'];
                $threadRole = $cp['thread_role'];
                $myRole = $cp['my_role'];

                $key = "b_{$branch->id}_p_{$partner->id}";
                if (isset($seenThreadKeys[$key])) continue;
                $seenThreadKeys[$key] = true;

                $threads[] = [
                    'id' => "branch_{$branch->id}_p_{$partner->id}",
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
                        'thread_role' => $threadRole,
                        'department' => $partner->department?->name ?? 'General',
                        'avatar_url' => $partner->avatar_url,
                        'gender' => $partner->gender ?? 'female',
                    ],
                    'thread_role' => $threadRole,
                    'assigner' => [
                        'id' => $assigner->id,
                        'name' => $assigner->name,
                        'role' => $assigner->role,
                    ],
                    'assignee' => [
                        'id' => $assignee->id,
                        'name' => $assignee->name,
                        'role' => $assignee->role,
                    ],
                    'my_role' => $myRole,
                    'last_message' => $latestMessage ? $latestMessage->message : "Branch chat initialized...",
                    'last_message_sender' => $latestMessage?->sender?->name ?? '',
                    'last_message_type' => $latestMessage ? $latestMessage->message_type : 'text',
                    'last_message_at' => $lastTimestamp->toIso8601String(),
                    'last_message_time_ago' => $latestMessage ? $latestMessage->created_at->diffForHumans() : $branch->created_at->diffForHumans(),
                    'unread_count' => $unreadCount,
                    'has_attachment' => (bool) ($latestMessage?->attachment_id),
                    'is_overseer' => false,
                ];
            }
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
     * Senior managers, task creators, and admins can review and chat in all below branches
     */
    protected function getOtherCommunicationsThreads(User $user, ?Request $request = null): JsonResponse
    {
        $isAdminOrSubAdmin = in_array($user->role, ['admin', 'sub_admin']);

        $branchesQuery = TaskBranch::with([
            'task.creator.department',
            'owner.department',
            'assignments.assignedTo.department',
            'assignments.assignedBy.department',
            'collaborators.user.department',
        ])
        ->whereHas('task', function ($q) {
            $q->where('handling_method', '!=', 'work_alone'); // Skip work_alone tasks in hierarchy oversight
        });

        if (!$isAdminOrSubAdmin) {
            // Find subordinate branches:
            // 1. Branches under tasks created by this user
            // 2. Branches sub-delegated down from parent assignments by this user
            $branchesQuery->where(function ($q) use ($user) {
                $q->whereHas('task', function ($tq) use ($user) {
                    $tq->where('creator_id', $user->id);
                })
                ->orWhereHas('parentAssignment', function ($paq) use ($user) {
                    $paq->where('assigned_to_id', $user->id)->orWhere('assigned_by_id', $user->id);
                });
            });
        }

        $branches = $branchesQuery->get();
        $threads = [];
        $seenBranchIds = [];

        foreach ($branches as $branch) {
            $task = $branch->task;
            if (!$task || $task->handling_method === 'work_alone') continue;

            $currentAssignment = $branch->assignments->firstWhere('is_current', true)
                ?: $branch->assignments->sortByDesc('id')->first();

            $assigner = $currentAssignment?->assignedBy ?: $task->creator;
            $assignee = $currentAssignment?->assignedTo ?: $branch->owner;

            if (!$assigner || !$assignee) continue;
            if ($assigner->id === $assignee->id) continue;

            // In "Other Communications", exclude branches where the user is the direct assigner or assignee,
            // because those direct conversations belong in "My Chats"
            if ($user->id === $assignee->id || $user->id === $assigner->id) {
                continue;
            }

            if (isset($seenBranchIds[$branch->id])) continue;
            $seenBranchIds[$branch->id] = true;

            $latestMessage = TaskMessage::with('sender')
                ->where('task_branch_id', $branch->id)
                ->latest()
                ->first();

            $lastTimestamp = $latestMessage ? $latestMessage->created_at : $branch->created_at;

            $threads[] = [
                'id' => "sub_{$branch->id}",
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
                'thread_role' => 'Delegated Branch',
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
                // For direct chatting in this below branch, partner defaults to the branch assignee
                'partner' => [
                    'id' => $assignee->id,
                    'name' => "{$assigner->name} ➔ {$assignee->name}",
                    'role' => $assignee->role,
                    'thread_role' => 'Delegated Branch',
                    'department' => $assignee->department?->name ?? 'General',
                    'avatar_url' => $assignee->avatar_url,
                    'gender' => $assignee->gender ?? 'female',
                ],
                'my_role' => 'overseer',
                'last_message' => $latestMessage ? $latestMessage->message : "Subordinate thread active...",
                'last_message_sender' => $latestMessage?->sender?->name ?? '',
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
        $isOverseer = filter_var($request->query('is_overseer', false), FILTER_VALIDATE_BOOLEAN);
        $requestedPartnerId = $request->query('partner_id') ? (int) $request->query('partner_id') : null;

        $branch = TaskBranch::with([
            'task.creator.department',
            'owner.department',
            'assignments.assignedTo.department',
            'assignments.assignedBy.department',
            'collaborators.user.department',
            'attachments.uploadedBy',
        ])->findOrFail($branchId);

        $task = $branch->task;
        $isAdminOrSubAdmin = in_array($user->role, ['admin', 'sub_admin']);

        // Determine branch assigner and assignee
        $currentAssignment = $branch->assignments->firstWhere('is_current', true)
            ?: $branch->assignments->sortByDesc('id')->first();

        $assigner = $currentAssignment?->assignedBy ?: $task->creator;
        $assignee = $currentAssignment?->assignedTo ?: $branch->owner;

        // Security / Peer-isolation verification:
        // A peer assignee must NEVER access another peer's branch conversation!
        $isDirectParty = (
            $user->id === $assigner->id ||
            $user->id === $assignee->id ||
            $branch->collaborators->contains('user_id', $user->id) ||
            $branch->messages()->where(fn($mq) => $mq->where('sender_id', $user->id)->orWhere('recipient_id', $user->id))->exists()
        );

        $isSeniorOverseer = (
            $isAdminOrSubAdmin ||
            $user->id === $task->creator_id ||
            $branch->parentAssignment?->assigned_to_id === $user->id ||
            $branch->parentAssignment?->assigned_by_id === $user->id
        );

        if (!$isDirectParty && !$isSeniorOverseer && !$isOverseer) {
            return response()->json([
                'message' => 'Access Denied: Same-level assignees cannot view other branch conversations.',
            ], 403);
        }

        // Determine partner and partner's role label
        $partner = null;
        $threadRole = 'Assignee';

        if ($requestedPartnerId && $requestedPartnerId !== $user->id) {
            if ($requestedPartnerId === $assigner->id) {
                $partner = $assigner;
                $threadRole = 'Assigner';
            } elseif ($requestedPartnerId === $assignee->id) {
                $partner = $assignee;
                $threadRole = 'Assignee';
            } else {
                $collab = $branch->collaborators->firstWhere('user_id', $requestedPartnerId);
                if ($collab && $collab->user) {
                    $partner = $collab->user;
                    $threadRole = 'Collaborator';
                }
            }
        }

        // Fallback partner resolution if partner not matched by requestedPartnerId
        if (!$partner) {
            if ($user->id === $assigner->id) {
                $partner = ($assignee->id !== $user->id) ? $assignee : null;
                $threadRole = 'Assignee';
            } elseif ($user->id === $assignee->id) {
                $partner = ($assigner->id !== $user->id) ? $assigner : null;
                $threadRole = 'Assigner';
            } elseif ($branch->collaborators->contains('user_id', $user->id)) {
                $partner = ($assigner->id !== $user->id) ? $assigner : $assignee;
                $threadRole = 'Assigner';
            }
        }

        // Overseer or last resort fallback
        if (!$partner) {
            $partner = ($user->id === $assignee->id) ? $assigner : $assignee;
            $threadRole = ($user->id === $assignee->id) ? 'Assigner' : 'Assignee';
        }

        // Auto mark incoming messages from this partner on this branch as read
        TaskMessage::where('task_branch_id', $branch->id)
            ->where('sender_id', $partner->id)
            ->where('recipient_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        // Auto mark general messages where current user is recipient on this branch as read
        TaskMessage::where('task_branch_id', $branch->id)
            ->where('recipient_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        // Fetch messages for this branch conversation
        $messagesQuery = TaskMessage::with([
            'sender.department',
            'recipient.department',
            'attachment',
        ])
        ->where('task_branch_id', $branch->id);

        $rawMessages = $messagesQuery->orderBy('created_at', 'asc')->get();

        $tz = $this->resolveTimezone($request);

        $messages = $rawMessages->map(function ($m) use ($user, $assigner, $assignee, $task, $tz) {
            // Determine badge label for sender
            $senderBadge = 'Member';
            if ($m->sender_id === $assigner->id) {
                $senderBadge = 'Branch Assigner';
            } elseif ($m->sender_id === $assignee->id) {
                $senderBadge = 'Branch Assignee';
            } elseif ($m->sender_id === $task->creator_id) {
                $senderBadge = 'Task Creator / Reviewer';
            } elseif (in_array($m->sender?->role, ['admin', 'sub_admin'])) {
                $senderBadge = 'Executive Reviewer';
            }

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
                'sender_badge' => $senderBadge,
                'message' => $m->message,
                'message_type' => $m->message_type,
                'is_read' => $m->is_read,
                'read_at' => $m->read_at?->toIso8601String(),
                'created_at' => $m->created_at->toIso8601String(),
                'time_formatted' => $m->created_at->copy()->setTimezone($tz)->format('g:i A'),
                'date_formatted' => $m->created_at->copy()->setTimezone($tz)->format('M d, Y'),
                'attachment' => $m->attachment ? [
                    'id' => $m->attachment->id,
                    'file_name' => $m->attachment->file_name,
                    'file_size' => $m->attachment->file_size_formatted ?? ($m->attachment->file_size ? round($m->attachment->file_size / 1024, 1) . ' KB' : 'Document'),
                    'file_type' => $m->attachment->file_type,
                    'download_url' => url("/api/v1/attachments/{$m->attachment->id}/download"),
                ] : null,
            ];
        });

        // Determine my role in this branch
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
                'thread_role' => $threadRole,
                'department' => $partner->department?->name ?? 'General',
                'avatar_url' => $partner->avatar_url,
                'gender' => $partner->gender ?? 'female',
            ],
            'thread_role' => $threadRole,
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
            'can_chat' => true, // Overseers and direct parties can both send messages and review
        ]);
    }

    /**
     * Send a work message in branch thread
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'task_branch_id' => 'required|exists:task_branches,id',
            'task_id' => 'nullable',
            'recipient_id' => 'nullable',
            'message' => 'required|string|max:5000',
            'message_type' => 'nullable|string|in:text,missing_details_request,details_provided,review_feedback,deliverable_update',
            'attachment_id' => 'nullable|exists:task_attachments,id',
        ]);

        $branch = TaskBranch::with(['assignments', 'collaborators', 'owner'])->findOrFail($validated['task_branch_id']);
        $task = Task::withTrashed()->find($branch->task_id);
        if (!$task && !empty($validated['task_id'])) {
            $task = Task::withTrashed()->find($validated['task_id']);
        }

        if (!$task) {
            return response()->json([
                'message' => 'The task associated with this branch conversation could not be found.',
            ], 422);
        }

        // Determine recipient if not provided
        $currentAssignment = $branch->assignments->firstWhere('is_current', true)
            ?: $branch->assignments->sortByDesc('id')->first();

        $assigner = $currentAssignment?->assignedBy ?: $task->creator;
        $assignee = $currentAssignment?->assignedTo ?: $branch->owner;

        $recipientId = $validated['recipient_id'] ?? null;
        if (!$recipientId) {
            // Default recipient: if current user is assigner, send to assignee; else send to assigner
            $recipientId = ($user->id === $assigner->id) ? $assignee->id : $assigner->id;
            if ($user->id === $recipientId) {
                $recipientId = ($assignee->id !== $user->id) ? $assignee->id : $assigner->id;
            }
        }

        // Prevent self-messaging
        if ((int)$recipientId === (int)$user->id) {
            return response()->json([
                'message' => 'Cannot send a message to yourself. Please select an assignee or collaborator to converse with.',
            ], 422);
        }

        $recipient = User::findOrFail($recipientId);

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

        // Send a system notification to the recipient (and branch assignee if overseer is sending)
        $msgTypeLabel = match ($message->message_type) {
            'missing_details_request' => '⚠️ Missing Details Requested',
            'details_provided' => '✅ Details / Docs Provided',
            'review_feedback' => '📋 Review Evaluation Feedback',
            'deliverable_update' => '📎 Deliverable Uploaded',
            default => 'Work Message',
        };

        $notifRecipients = [$recipient->id];
        // If an overseer/manager is reviewing and messaging in below branch, notify both assigner & assignee
        if ($user->id !== $assigner->id && $user->id !== $assignee->id) {
            $notifRecipients = array_unique([$assigner->id, $assignee->id]);
        } else {
            // If assignee or assigner is communicating on a branch created by a senior manager/creator,
            // also notify the creator so they stay updated on the branch progress
            if ($task->creator_id && $task->creator_id !== $user->id) {
                $notifRecipients[] = $task->creator_id;
            }
            $notifRecipients = array_unique($notifRecipients);
        }

        foreach ($notifRecipients as $notifUser) {
            if ($notifUser === $user->id) continue;
            SystemNotification::create([
                'user_id' => $notifUser,
                'type' => 'task_message',
                'title' => "{$msgTypeLabel} on T-" . str_pad($task->id, 3, '0', STR_PAD_LEFT),
                'message' => "{$user->name}: " . Str::limit($message->message, 90),
                'task_id' => $task->id,
                'is_read' => false,
                'created_at' => now(),
            ]);
        }

        $message->load(['sender.department', 'recipient.department', 'attachment']);

        // Determine sender badge
        $senderBadge = 'Member';
        if ($user->id === $assigner->id) {
            $senderBadge = 'Branch Assigner';
        } elseif ($user->id === $assignee->id) {
            $senderBadge = 'Branch Assignee';
        } elseif ($user->id === $task->creator_id) {
            $senderBadge = 'Task Creator / Reviewer';
        } elseif (in_array($user->role, ['admin', 'sub_admin'])) {
            $senderBadge = 'Executive Reviewer';
        }

        $tz = $this->resolveTimezone($request);

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
                'sender_badge' => $senderBadge,
                'message' => $message->message,
                'message_type' => $message->message_type,
                'is_read' => false,
                'read_at' => null,
                'created_at' => $message->created_at->toIso8601String(),
                'time_formatted' => $message->created_at->copy()->setTimezone($tz)->format('g:i A'),
                'date_formatted' => $message->created_at->copy()->setTimezone($tz)->format('M d, Y'),
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
            'task_branch_id' => 'required',
            'task_id' => 'nullable',
        ]);

        $branch = TaskBranch::find($request->task_branch_id);
        $taskId = $branch?->task_id ?? $request->task_id;

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $fileSize = $file->getSize();
        $fileType = $file->getClientMimeType();

        $path = $file->store('attachments', 'public');

        $attachment = TaskAttachment::create([
            'task_id' => $taskId,
            'task_branch_id' => $request->task_branch_id,
            'uploaded_by_id' => $user->id,
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
