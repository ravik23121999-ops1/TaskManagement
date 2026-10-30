<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTaskRequest;
use App\Http\Requests\Api\V1\UpdateTaskRequest;
use App\Http\Resources\V1\TaskCollection;
use App\Http\Resources\V1\TaskResource;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskAssignment;
use App\Models\TaskCollaborator;
use App\Models\TaskAttachment;
use App\Models\TaskHoldRecord;
use App\Models\TaskStatusHistory;
use App\Services\ActivityLogger;
use App\Jobs\SendTaskNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function index(Request $request): TaskCollection
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        $query = Task::query();

        // Role-based visibility base constraint
        if (!$isAdmin) {
            $query->where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('branches', function ($b) use ($user) {
                      $b->where('owner_id', $user->id);
                  })
                  ->orWhereHas('branches.collaborators', function ($c) use ($user) {
                      $c->where('user_id', $user->id);
                  })
                  ->orWhereHas('submissions.reviews', function ($r) use ($user) {
                      $r->where('reviewer_id', $user->id);
                  });
            });
        }

        // View filter
        if ($request->has('view') && $request->view) {
            $view = $request->view;

            if ($view === 'my_action') {
                $query->whereNotIn('status', ['completed', 'cancelled']);
                $query->where(function ($q) use ($user) {
                    // 1. Work alone creator where still in progress
                    $q->where(function ($w) use ($user) {
                        $w->where('handling_method', 'work_alone')
                          ->where('creator_id', $user->id)
                          ->whereIn('status', ['pending', 'in_progress', 'post_comment']);
                    })
                    // 2. Creator where all downstream branches are completed, waiting for creator final check & completion
                    ->orWhere(function ($cf) use ($user) {
                        $cf->where('creator_id', $user->id)
                           ->whereIn('status', ['pending', 'in_progress', 'review'])
                           ->whereDoesntHave('branches', function ($b) {
                               $b->whereIn('status', ['pending', 'in_progress', 'review', 'post_comment']);
                           });
                    })
                    // 3. User owns a branch that needs action (in_progress, pending, or returned for correction)
                    ->orWhereHas('branches', function ($b) use ($user) {
                        $b->where('owner_id', $user->id)
                          ->where(function ($bs) use ($user) {
                              $bs->whereIn('status', ['pending', 'in_progress'])
                                 ->orWhere(function ($pc) use ($user) {
                                     // For post_comment, include if NOT waiting on clarification requested by user themselves
                                     $pc->where('status', 'post_comment')
                                        ->whereRaw('(SELECT changed_by_id FROM task_status_history WHERE task_id = tasks.id AND to_status = "post_comment" ORDER BY id DESC LIMIT 1) != ?', [$user->id]);
                                 });
                          });
                    })
                    // 4. Assigner / Creator who received a clarification request (missing details requested by assignee)
                    ->orWhere(function ($cr) use ($user) {
                        $cr->where('status', 'post_comment')
                           ->where(function ($sub) use ($user) {
                               $sub->where('creator_id', $user->id)
                                   ->orWhereHas('branches.assignments', function ($a) use ($user) {
                                       $a->where('is_current', true)
                                         ->where('assigned_by_id', $user->id)
                                         ->where('assigned_to_id', '!=', $user->id);
                                   });
                           })
                           ->whereRaw('(SELECT changed_by_id FROM task_status_history WHERE task_id = tasks.id AND to_status = "post_comment" ORDER BY id DESC LIMIT 1) != ?', [$user->id]);
                    })
                    // 5. User is reviewer of a pending submission awaiting review
                    ->orWhere(function ($r) use ($user) {
                        $r->where('status', 'review')
                          ->whereHas('branches', function ($b) use ($user) {
                              $b->where(function ($assignerQ) use ($user) {
                                  $assignerQ->whereHas('assignments', function ($a) use ($user) {
                                      $a->where('is_current', true)
                                        ->where('assigned_by_id', $user->id)
                                        ->where('assigned_to_id', '!=', $user->id);
                                  })
                                  ->orWhereHas('collaborators', function ($c) use ($user) {
                                      $c->where('invited_by_id', $user->id)
                                        ->where('user_id', '!=', $user->id);
                                  });
                              })
                              ->whereHas('submissions', function ($s) use ($user) {
                                  $s->where('submitted_by_id', '!=', $user->id)
                                    ->whereDoesntHave('reviews');
                              });
                          });
                    })
                    // 6. On hold owned by user
                    ->orWhere(function ($h) use ($user) {
                        $h->where('status', 'on_hold')
                          ->where(function ($oh) use ($user) {
                              $oh->where('creator_id', $user->id)
                                 ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
                          });
                    });
                });
            } elseif ($view === 'pending_with_others') {
                $query->whereNotIn('status', ['completed', 'cancelled']);

                if (!$isAdmin) {
                    $query->where(function ($q) use ($user) {
                        $q->where('creator_id', $user->id)
                          ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id))
                          ->orWhereHas('branches.assignments', fn($a) => $a->where('assigned_by_id', $user->id));
                    });
                }

                // Exclude tasks where current user must act:
                // Exclude work alone tasks created by user
                $query->where(function ($q) use ($user) {
                    $q->where('creator_id', '!=', $user->id)
                      ->orWhere('handling_method', '!=', 'work_alone');
                });

                // Exclude creator ready for final completion
                $query->whereNot(function ($cf) use ($user) {
                    $cf->where('creator_id', $user->id)
                       ->whereIn('status', ['pending', 'in_progress', 'review'])
                       ->whereDoesntHave('branches', function ($b) {
                           $b->whereIn('status', ['pending', 'in_progress', 'review', 'post_comment']);
                       });
                });

                // Exclude user active assignee on a branch pending/in_progress
                $query->whereDoesntHave('branches', function ($b) use ($user) {
                    $b->where('owner_id', $user->id)
                      ->whereIn('status', ['pending', 'in_progress']);
                });

                // Exclude assigner who needs to answer a clarification request
                $query->whereNot(function ($cr) use ($user) {
                    $cr->where('status', 'post_comment')
                       ->where(function ($sub) use ($user) {
                           $sub->where('creator_id', $user->id)
                               ->orWhereHas('branches.assignments', function ($a) use ($user) {
                                   $a->where('is_current', true)
                                     ->where('assigned_by_id', $user->id)
                                     ->where('assigned_to_id', '!=', $user->id);
                               });
                       });
                });

                // Exclude tasks where user is the reviewer of a pending submission
                $query->whereDoesntHave('submissions', function ($s) use ($user) {
                    $s->where('is_final', false)
                      ->where('submitted_by_id', '!=', $user->id)
                      ->whereDoesntHave('reviews')
                      ->where(function ($revQ) use ($user) {
                          $revQ->whereHas('branch.assignments', function ($a) use ($user) {
                              $a->where('is_current', true)
                                ->where('assigned_by_id', $user->id)
                                ->where('assigned_to_id', '!=', $user->id);
                          })
                          ->orWhereHas('branch.collaborators', function ($c) use ($user) {
                              $c->where('invited_by_id', $user->id)
                                ->where('user_id', '!=', $user->id);
                          });
                      });
                });
            } elseif ($view === 'collaborations') {
                $query->where(function ($q) use ($user) {
                    $q->where('handling_method', 'collaborate')
                      ->where(function ($c) use ($user) {
                          $c->whereHas('branches.collaborators', fn($col) => $col->where('user_id', $user->id))
                            ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
                      });
                });
            } elseif ($view === 'review') {
                $query->whereNotIn('status', ['completed', 'cancelled']);
                // MUST have at least one unreviewed submission that is not a final sign-off!
                $query->whereHas('submissions', function ($s) {
                    $s->where('is_final', false)
                      ->whereDoesntHave('reviews');
                });

                if (!$isAdmin) {
                    // Non-admin can ONLY review if they are:
                    // 1. Assigner/delegator of the branch in review ("upper branch" who assigned further)
                    // 2. Collaborator who invited the submitter
                    // And STRICTLY EXCLUDE if the user is only the submitter of their own work
                    $query->whereHas('branches', function ($b) use ($user) {
                        $b->where(function ($assignerQ) use ($user) {
                            $assignerQ->whereHas('assignments', function ($a) use ($user) {
                                $a->where('is_current', true)
                                  ->where('assigned_by_id', $user->id)
                                  ->where('assigned_to_id', '!=', $user->id);
                            })
                            ->orWhereHas('collaborators', function ($c) use ($user) {
                                $c->where('invited_by_id', $user->id)
                                  ->where('user_id', '!=', $user->id);
                            });
                        })
                        ->whereHas('submissions', function ($s) use ($user) {
                            $s->where('submitted_by_id', '!=', $user->id)
                              ->whereDoesntHave('reviews');
                        });
                    });
                }
            } elseif ($view === 'completed') {
                $query->where('status', 'completed');
            } elseif ($view === 'on_hold') {
                $query->where('status', 'on_hold');
            } elseif ($view === 'all_open' || $view === 'open') {
                $query->whereNotIn('status', ['completed', 'cancelled']);
            }
        }

        // Status filter
        if ($request->has('status') && $request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        } elseif (!$request->has('view') || in_array($request->view, ['all', 'all_open', 'open'])) {
            // In All Tasks, only show active/open tasks; completed and cancelled tasks move to Completed phase
            $query->whereNotIn('status', ['completed', 'cancelled']);
        }

        // Priority filter
        if ($request->has('priority') && $request->priority && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        // Department filter
        if ($request->has('department_id') && $request->department_id && $request->department_id !== 'all') {
            $query->where('department_id', $request->department_id);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = trim($request->search);
            $numericId = preg_replace('/[^0-9]/', '', $search);
            $query->where(function ($q) use ($search, $numericId) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
                if ($numericId !== '') {
                    $q->orWhere('id', (int) $numericId);
                }
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = (int) $request->input('per_page', 15);
        $tasks = $query->with([
            'creator',
            'cancelledBy',
            'department',
            'branches.owner',
            'branches.assignments.assignedBy',
            'branches.collaborators.user',
            'branches.collaborators.invitedBy',
            'comments.user',
            'attachments.uploadedBy',
            'statusHistory.changedBy',
            'submissions.submittedBy',
            'submissions.reviews.reviewer',
            'holdRecords.putOnHoldBy'
        ])->paginate($perPage);

        return new TaskCollection($tasks);
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $user = $request->user();

        return DB::transaction(function () use ($request, $user) {
            $task = Task::create([
                'title' => $request->title,
                'description' => $request->description,
                'expected_result' => $request->expected_result,
                'acceptance_criteria' => $request->acceptance_criteria,
                'handling_method' => $request->handling_method,
                'priority' => $request->priority ?? 'medium',
                'status' => 'in_progress',
                'start_date' => $request->start_date ? now()->parse($request->start_date) : now(),
                'due_date' => $request->due_date ? now()->parse($request->due_date) : null,
                'department_id' => $request->department_id,
                'creator_id' => $user->id,
            ]);

            // 1. Process Shared File Attachments (uploaded in Step 1)
            $createdSharedAttachments = [];
            $sharedFiles = $request->file('shared_files') ?? $request->file('files') ?? [];
            if (!empty($sharedFiles)) {
                foreach ((array)$sharedFiles as $sFile) {
                    if ($sFile instanceof \Illuminate\Http\UploadedFile && $sFile->isValid()) {
                        $sPath = $sFile->store('attachments', 'public');
                        $createdSharedAttachments[] = TaskAttachment::create([
                            'task_id' => $task->id,
                            'task_branch_id' => null, // null marks SHARED attachment accessible to all task assignees
                            'uploaded_by_id' => $user->id,
                            'file_name' => $sFile->getClientOriginalName(),
                            'file_path' => $sPath,
                            'file_size' => $sFile->getSize(),
                            'file_type' => $sFile->getMimeType(),
                        ]);
                    }
                }
            }

            // Handle assignees / branches
            if ($task->handling_method === 'work_alone') {
                // Default branch for creator
                $branch = $task->branches()->create([
                    'title' => $task->title,
                    'description' => $task->description,
                    'owner_id' => $user->id,
                    'status' => 'in_progress',
                    'due_date' => $task->due_date,
                ]);

                $branch->assignments()->create([
                    'assigned_to_id' => $user->id,
                    'assigned_by_id' => $user->id,
                    'is_current' => true,
                    'assigned_at' => now(),
                ]);
            } elseif ($task->handling_method === 'assign') {
                $branchesData = (array) $request->input('branches', []);
                $assignees = (array) $request->input('assignees', []);

                // If structured branch specifications were provided per assignee
                if (!empty($branchesData)) {
                    // Filter out creator - assign is strictly for delegating to other employees
                    $validBranches = array_values(array_filter($branchesData, function ($b) use ($user) {
                        return !empty($b['owner_id']) && (int)$b['owner_id'] !== (int)$user->id;
                    }));

                    if (empty($validBranches)) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'assignees' => ['Please select at least one assignee other than yourself. Use "Work Alone" if you want to execute this task yourself.'],
                        ]);
                    }

                    foreach ($validBranches as $bIndex => $bData) {
                        $assigneeId = (int)$bData['owner_id'];
                        $branchTitle = !empty($bData['title']) ? trim($bData['title']) : $task->title;
                        $branchDesc = !empty($bData['description']) ? trim($bData['description']) : $task->description;
                        $branchExpected = !empty($bData['expected_result']) ? trim($bData['expected_result']) : $task->expected_result;
                        $branchCriteria = !empty($bData['acceptance_criteria']) ? trim($bData['acceptance_criteria']) : $task->acceptance_criteria;
                        $branchStart = !empty($bData['start_date']) ? now()->parse($bData['start_date']) : $task->start_date;
                        $branchDue = !empty($bData['due_date']) ? now()->parse($bData['due_date']) : $task->due_date;

                        $branch = $task->branches()->create([
                            'title' => $branchTitle,
                            'description' => $branchDesc,
                            'expected_result' => $branchExpected,
                            'acceptance_criteria' => $branchCriteria,
                            'owner_id' => $assigneeId,
                            'start_date' => $branchStart,
                            'status' => 'pending',
                            'due_date' => $branchDue,
                        ]);

                        $branch->assignments()->create([
                            'assigned_to_id' => $assigneeId,
                            'assigned_by_id' => $user->id,
                            'is_current' => true,
                            'assigned_at' => now(),
                        ]);

                        // Handle individual files attached to this specific branch/subtask
                        $branchFiles = $request->file("branches.{$bIndex}.files")
                            ?? $request->file("branch_files.{$assigneeId}")
                            ?? [];

                        if (!empty($branchFiles)) {
                            foreach ((array)$branchFiles as $bFile) {
                                if ($bFile instanceof \Illuminate\Http\UploadedFile && $bFile->isValid()) {
                                    $bPath = $bFile->store('attachments', 'public');
                                    TaskAttachment::create([
                                        'task_id' => $task->id,
                                        'task_branch_id' => $branch->id,
                                        'uploaded_by_id' => $user->id,
                                        'file_name' => $bFile->getClientOriginalName(),
                                        'file_path' => $bPath,
                                        'file_size' => $bFile->getSize(),
                                        'file_type' => $bFile->getMimeType(),
                                    ]);
                                }
                            }
                        }

                        // Explicitly copy shared attachment references into this employee's branch if requested
                        if (!empty($bData['copy_shared_attachments']) && !empty($createdSharedAttachments)) {
                            foreach ($createdSharedAttachments as $sAtt) {
                                TaskAttachment::create([
                                    'task_id' => $task->id,
                                    'task_branch_id' => $branch->id,
                                    'uploaded_by_id' => $user->id,
                                    'file_name' => $sAtt->file_name,
                                    'file_path' => $sAtt->file_path,
                                    'file_size' => $sAtt->file_size,
                                    'file_type' => $sAtt->file_type,
                                ]);
                            }
                        }

                        if ($assigneeId !== $user->id) {
                            SendTaskNotification::dispatch(
                                $assigneeId,
                                'task_assigned',
                                "Task assigned to you — {$branchTitle}",
                                $task->id,
                                'Task Assigned',
                                $branch->id
                            );
                        }
                    }
                } else {
                    // Exclude creator - assign is strictly for delegating to other employees
                    $assignees = array_values(array_filter($assignees, fn($id) => (int)$id !== (int)$user->id));

                    if (empty($assignees)) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'assignees' => ['Please select at least one assignee other than yourself. Use "Work Alone" if you want to execute this task yourself.'],
                        ]);
                    }

                    foreach ($assignees as $assigneeId) {
                        $branch = $task->branches()->create([
                            'title' => $task->title,
                            'description' => $task->description,
                            'owner_id' => $assigneeId,
                            'status' => 'pending',
                            'due_date' => $task->due_date,
                        ]);

                        $branch->assignments()->create([
                            'assigned_to_id' => $assigneeId,
                            'assigned_by_id' => $user->id,
                            'is_current' => true,
                            'assigned_at' => now(),
                        ]);

                        if ($assigneeId !== $user->id) {
                            SendTaskNotification::dispatch(
                                $assigneeId,
                                'task_assigned',
                                "Task assigned to you — {$task->title}",
                                $task->id,
                                'Task Assigned',
                                $branch->id
                            );
                        }
                    }
                }
            } elseif ($task->handling_method === 'collaborate') {
                $branchesData = (array) $request->input('branches', []);
                $collaborators = (array) $request->input('collaborators', []);
                $assignees = (array) $request->input('assignees', []);

                if (!empty($branchesData)) {
                    foreach ($branchesData as $bIndex => $bData) {
                        $collabOwnerId = (int)$bData['owner_id'];
                        $branchTitle = !empty($bData['title']) ? trim($bData['title']) : $task->title;
                        $branchDesc = !empty($bData['description']) ? trim($bData['description']) : $task->description;
                        $branchExpected = !empty($bData['expected_result']) ? trim($bData['expected_result']) : $task->expected_result;
                        $branchCriteria = !empty($bData['acceptance_criteria']) ? trim($bData['acceptance_criteria']) : $task->acceptance_criteria;
                        $branchStart = !empty($bData['start_date']) ? now()->parse($bData['start_date']) : $task->start_date;
                        $branchDue = !empty($bData['due_date']) ? now()->parse($bData['due_date']) : $task->due_date;

                        $branch = $task->branches()->create([
                            'title' => $branchTitle,
                            'description' => $branchDesc,
                            'expected_result' => $branchExpected,
                            'acceptance_criteria' => $branchCriteria,
                            'owner_id' => $collabOwnerId,
                            'start_date' => $branchStart,
                            'status' => 'pending',
                            'due_date' => $branchDue,
                        ]);

                        $branch->assignments()->create([
                            'assigned_to_id' => $collabOwnerId,
                            'assigned_by_id' => $user->id,
                            'is_current' => true,
                            'assigned_at' => now(),
                        ]);

                        // Register as collaborator on their branch
                        $branch->collaborators()->create([
                            'user_id' => $collabOwnerId,
                            'invited_by_id' => $user->id,
                            'can_assign' => true,
                            'can_collaborate' => true,
                            'invited_at' => now(),
                        ]);

                        // Handle individual files attached to this specific collaboration branch
                        $branchFiles = $request->file("branches.{$bIndex}.files")
                            ?? $request->file("branch_files.{$collabOwnerId}")
                            ?? [];

                        if (!empty($branchFiles)) {
                            foreach ((array)$branchFiles as $bFile) {
                                if ($bFile instanceof \Illuminate\Http\UploadedFile && $bFile->isValid()) {
                                    $bPath = $bFile->store('attachments', 'public');
                                    TaskAttachment::create([
                                        'task_id' => $task->id,
                                        'task_branch_id' => $branch->id,
                                        'uploaded_by_id' => $user->id,
                                        'file_name' => $bFile->getClientOriginalName(),
                                        'file_path' => $bPath,
                                        'file_size' => $bFile->getSize(),
                                        'file_type' => $bFile->getMimeType(),
                                    ]);
                                }
                            }
                        }

                        // Copy shared attachment references into this collaborator's branch if requested
                        if (!empty($bData['copy_shared_attachments']) && !empty($createdSharedAttachments)) {
                            foreach ($createdSharedAttachments as $sAtt) {
                                TaskAttachment::create([
                                    'task_id' => $task->id,
                                    'task_branch_id' => $branch->id,
                                    'uploaded_by_id' => $user->id,
                                    'file_name' => $sAtt->file_name,
                                    'file_path' => $sAtt->file_path,
                                    'file_size' => $sAtt->file_size,
                                    'file_type' => $sAtt->file_type,
                                ]);
                            }
                        }

                        if ($collabOwnerId !== $user->id) {
                            SendTaskNotification::dispatch(
                                $collabOwnerId,
                                'collaboration_invite',
                                "You were invited to collaborate on milestone — {$branchTitle}",
                                $task->id,
                                'New Collaboration',
                                $branch->id
                            );
                        }
                    }
                } elseif (!empty($assignees)) {
                    foreach ($assignees as $assigneeId) {
                        $branch = $task->branches()->create([
                            'title' => $task->title,
                            'description' => $task->description,
                            'owner_id' => $assigneeId,
                            'status' => 'pending',
                            'due_date' => $task->due_date,
                        ]);

                        $branch->assignments()->create([
                            'assigned_to_id' => $assigneeId,
                            'assigned_by_id' => $user->id,
                            'is_current' => true,
                            'assigned_at' => now(),
                        ]);

                        // Attach collaborators to this branch
                        foreach ($collaborators as $extraCollabId) {
                            $branch->collaborators()->firstOrCreate([
                                'user_id' => $extraCollabId,
                            ], [
                                'invited_by_id' => $user->id,
                                'can_assign' => true,
                                'can_collaborate' => true,
                                'invited_at' => now(),
                            ]);
                        }

                        if ($assigneeId !== $user->id) {
                            SendTaskNotification::dispatch(
                                $assigneeId,
                                'collaboration_invite',
                                "You were invited to collaborate on — {$task->title}",
                                $task->id,
                                'New Collaboration',
                                $branch->id
                            );
                        }
                    }
                } elseif (!empty($collaborators)) {
                    foreach ($collaborators as $collabId) {
                        $branch = $task->branches()->create([
                            'title' => $task->title,
                            'description' => $task->description,
                            'owner_id' => $collabId,
                            'status' => 'pending',
                            'due_date' => $task->due_date,
                        ]);

                        $branch->assignments()->create([
                            'assigned_to_id' => $collabId,
                            'assigned_by_id' => $user->id,
                            'is_current' => true,
                            'assigned_at' => now(),
                        ]);

                        $branch->collaborators()->create([
                            'user_id' => $collabId,
                            'invited_by_id' => $user->id,
                            'can_assign' => true,
                            'can_collaborate' => true,
                            'invited_at' => now(),
                        ]);

                        if ($collabId !== $user->id) {
                            SendTaskNotification::dispatch(
                                $collabId,
                                'collaboration_invite',
                                "You were invited to collaborate on — {$task->title}",
                                $task->id,
                                'New Collaboration',
                                $branch->id
                            );
                        }
                    }
                } else {
                    $branch = $task->branches()->create([
                        'title' => $task->title,
                        'description' => $task->description,
                        'owner_id' => $user->id,
                        'status' => 'in_progress',
                        'due_date' => $task->due_date,
                    ]);
                }

                // Add collaborators if present
                if (!empty($collaborators)) {
                    $firstBranch = $task->branches()->first();
                    if ($firstBranch) {
                        foreach ($collaborators as $collabId) {
                            TaskCollaborator::firstOrCreate([
                                'task_branch_id' => $firstBranch->id,
                                'user_id' => $collabId,
                            ], [
                                'invited_by_id' => $user->id,
                                'can_assign' => true,
                                'can_collaborate' => true,
                                'invited_at' => now(),
                            ]);
                        }
                    }
                }
            }

            // Log status history
            TaskStatusHistory::create([
                'task_id' => $task->id,
                'from_status' => null,
                'to_status' => 'in_progress',
                'changed_by_id' => $user->id,
                'reason' => 'Task created',
                'changed_at' => now(),
            ]);

            ActivityLogger::log('task_created', "Created task: {$task->title}", $task->id);

            return response()->json([
                'message' => 'Task created successfully',
                'data' => new TaskResource($task->load([
                    'creator',
                    'department',
                    'branches.owner',
                    'branches.collaborators.user',
                    'comments.user',
                    'attachments.uploadedBy',
                    'statusHistory.changedBy',
                    'submissions.submittedBy',
                    'submissions.reviews.reviewer',
                    'holdRecords.putOnHoldBy'
                ])),
            ], 201);
        });
    }

    public function show(Task $task, Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';

        if (!$isAdmin) {
            $isParticipant = $task->creator_id === $user->id
                || $task->branches()->where('owner_id', $user->id)->exists()
                || $task->branches()->whereHas('assignments', fn($a) => $a->where('assigned_by_id', $user->id))->exists()
                || $task->branches()->whereHas('collaborators', fn($c) => $c->where('user_id', $user->id)->orWhere('invited_by_id', $user->id))->exists()
                || $task->submissions()->whereHas('reviews', fn($r) => $r->where('reviewer_id', $user->id))->exists();

            if (!$isParticipant) {
                return response()->json(['message' => 'Unauthorized to view this task'], 403);
            }
        }

        return response()->json([
            'data' => new TaskResource($task->load([
                'creator',
                'cancelledBy',
                'department',
                'branches.owner',
                'branches.assignments.assignedBy',
                'branches.collaborators.user',
                'branches.collaborators.invitedBy',
                'comments.user',
                'attachments.uploadedBy',
                'statusHistory.changedBy',
                'submissions.submittedBy',
                'submissions.reviews.reviewer',
                'holdRecords.putOnHoldBy'
            ])),
        ]);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';

        if (!$isAdmin && $task->creator_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized to update this task'], 403);
        }

        $task->update($request->validated());

        ActivityLogger::log('task_updated', "Updated task: {$task->title}", $task->id);

        return response()->json([
            'message' => 'Task updated successfully',
            'data' => new TaskResource($task->load([
                'creator',
                'department',
                'branches.owner',
                'branches.collaborators.user',
                'comments.user',
                'attachments.uploadedBy',
                'statusHistory.changedBy',
                'submissions.submittedBy',
                'submissions.reviews.reviewer',
                'holdRecords.putOnHoldBy'
            ])),
        ]);
    }

    public function hold(Request $request, Task $task): JsonResponse
    {
        $request->validate(['reason' => 'required|string|min:3']);
        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        $isOwner = $task->creator_id === $user->id || $task->branches()->where('owner_id', $user->id)->exists();

        if (!$isAdmin && !$isOwner) {
            return response()->json(['message' => 'Unauthorized to put this task on hold'], 403);
        }

        if ($task->status === 'on_hold') {
            return response()->json(['message' => 'Task is already on hold'], 422);
        }

        $oldStatus = $task->status;
        $task->update(['status' => 'on_hold']);

        TaskHoldRecord::create([
            'task_id' => $task->id,
            'put_on_hold_by_id' => $user->id,
            'reason' => $request->reason,
            'held_at' => now(),
        ]);

        TaskStatusHistory::create([
            'task_id' => $task->id,
            'from_status' => $oldStatus,
            'to_status' => 'on_hold',
            'changed_by_id' => $user->id,
            'reason' => $request->reason,
            'changed_at' => now(),
        ]);

        ActivityLogger::log('task_held', "Task put on hold: {$task->title}. Reason: {$request->reason}", $task->id);

        // Notify participants
        if ($task->creator_id !== $user->id) {
            SendTaskNotification::dispatch(
                $task->creator_id,
                'task_held',
                "Task '{$task->title}' was put on hold by {$user->name}. Reason: {$request->reason}",
                $task->id,
                'Task On Hold'
            );
        }

        return response()->json([
            'message' => 'Task put on hold successfully',
            'data' => new TaskResource($task->fresh()->load([
                'creator',
                'department',
                'branches.owner',
                'branches.collaborators.user',
                'comments.user',
                'attachments.uploadedBy',
                'statusHistory.changedBy',
                'submissions.submittedBy',
                'submissions.reviews.reviewer',
                'holdRecords.putOnHoldBy'
            ])),
        ]);
    }

    public function resume(Request $request, Task $task): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        $isOwner = $task->creator_id === $user->id || $task->branches()->where('owner_id', $user->id)->exists();

        if (!$isAdmin && !$isOwner) {
            return response()->json(['message' => 'Unauthorized to resume this task'], 403);
        }

        if ($task->status !== 'on_hold') {
            return response()->json(['message' => 'Task is not currently on hold'], 422);
        }

        $activeHold = TaskHoldRecord::where('task_id', $task->id)->whereNull('resumed_at')->latest('held_at')->first();
        if ($activeHold) {
            $activeHold->update([
                'resumed_at' => now(),
                'resumed_by_id' => $user->id,
            ]);
        }

        $task->update(['status' => 'in_progress']);

        TaskStatusHistory::create([
            'task_id' => $task->id,
            'from_status' => 'on_hold',
            'to_status' => 'in_progress',
            'changed_by_id' => $user->id,
            'reason' => 'Task resumed from hold',
            'changed_at' => now(),
        ]);

        ActivityLogger::log('task_resumed', "Task resumed from hold: {$task->title}", $task->id);

        return response()->json([
            'message' => 'Task resumed successfully',
            'data' => new TaskResource($task->fresh()->load([
                'creator',
                'department',
                'branches.owner',
                'branches.collaborators.user',
                'comments.user',
                'attachments.uploadedBy',
                'statusHistory.changedBy',
                'submissions.submittedBy',
                'submissions.reviews.reviewer',
                'holdRecords.putOnHoldBy'
            ])),
        ]);
    }

    public function cancel(Request $request, Task $task): JsonResponse
    {
        $request->validate(['reason' => 'required|string|min:3']);
        $user = $request->user();
        $isCreator = (int) $task->creator_id === (int) $user->id;
        $isAdmin = $user->role === 'admin';
        $subAdminCanCancel = $user->role === 'sub_admin' && \App\Models\SystemSetting::get('allow_subadmin_cancel_tasks', false);

        // Enforce rule: ONLY task creator, Admin, or authorized Sub-Admin can cancel
        if (!$isCreator && !$isAdmin && !$subAdminCanCancel) {
            return response()->json([
                'message' => 'Unauthorized: Only the task creator, Admin, or authorized Sub-Admin can cancel this task.'
            ], 403);
        }

        if (in_array($task->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Task cannot be cancelled in its current state'], 422);
        }

        $oldStatus = $task->status;
        $task->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $request->reason,
            'cancelled_by_id' => $user->id,
        ]);

        TaskStatusHistory::create([
            'task_id' => $task->id,
            'from_status' => $oldStatus,
            'to_status' => 'cancelled',
            'changed_by_id' => $user->id,
            'reason' => "Task cancelled: {$request->reason}",
            'changed_at' => now(),
        ]);

        ActivityLogger::log('task_cancelled', "Cancelled task: {$task->title}. Reason: {$request->reason}", $task->id, $user->id);

        return response()->json([
            'message' => 'Task cancelled successfully',
            'data' => new TaskResource($task->fresh()->load([
                'creator',
                'cancelledBy',
                'department',
                'branches.owner',
                'branches.collaborators.user',
                'comments.user',
                'attachments.uploadedBy',
                'statusHistory.changedBy',
                'submissions.submittedBy',
                'submissions.reviews.reviewer',
                'holdRecords.putOnHoldBy'
            ])),
        ]);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $user = $request->user();
        $subAdminCanDelete = $user->role === 'sub_admin' && \App\Models\SystemSetting::get('allow_subadmin_delete_records', false);

        if ($user->role !== 'admin' && !$subAdminCanDelete) {
            return response()->json([
                'message' => 'Unauthorized: Deleting tasks is restricted to Administrators (or authorized Sub-Administrators).'
            ], 403);
        }

        $taskTitle = $task->title;
        $taskId = $task->id;

        $task->delete();

        ActivityLogger::log('task_deleted', "Deleted task: {$taskTitle} (ID: {$taskId})", null, $user->id);

        return response()->json([
            'message' => 'Task deleted successfully',
        ]);
    }

    public function addAssignees(Request $request, Task $task): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        $isCreator = $task->creator_id === $user->id;
        $isBranchOwner = $task->branches()->where('owner_id', $user->id)->exists();

        if (!$isAdmin && !$isCreator && !$isBranchOwner) {
            return response()->json(['message' => 'Unauthorized to assign this task'], 403);
        }

        if (in_array($task->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Cannot add assignees to a completed or cancelled task'], 422);
        }

        $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
        ]);

        $targetUserIds = array_values(array_filter($request->user_ids, fn($id) => (int)$id !== (int)$user->id));
        if (empty($targetUserIds)) {
            return response()->json(['message' => 'You cannot assign a task to yourself. Please select another employee.'], 422);
        }

        if ($task->handling_method === 'work_alone') {
            $task->update(['handling_method' => 'assign']);
        }

        $addedCount = 0;
        $branchesData = (array) $request->input('branches', []);
        $userBranch = $task->branches()->where('owner_id', $user->id)->first();

        foreach ($targetUserIds as $idx => $assigneeId) {
            $exists = $task->branches()->where('owner_id', $assigneeId)->whereNotIn('status', ['cancelled'])->exists();
            if ($exists) {
                continue;
            }

            $bData = collect($branchesData)->firstWhere('owner_id', $assigneeId) ?: ($branchesData[$idx] ?? []);
            $mode = $bData['mode'] ?? $request->input('mode', 'new_subtask');
            $sharePrevious = filter_var($bData['share_previous_branch_details'] ?? $request->input('share_previous_branch_details', true), FILTER_VALIDATE_BOOLEAN);

            // MODE A: Forward / Reassign existing branch to the new assignee
            if ($mode === 'reassign' && $userBranch) {
                $oldOwnerId = $userBranch->owner_id;
                $userBranch->owner_id = $assigneeId;

                if (!empty($bData['title'])) {
                    $userBranch->title = trim($bData['title']);
                }

                $newNote = !empty($bData['description']) ? trim($bData['description']) : '';
                if ($sharePrevious) {
                    if ($newNote) {
                        $userBranch->description = ($userBranch->description ? $userBranch->description . "\n\n--- Delegation Note from {$user->name} ---\n" : '') . $newNote;
                    }
                } else {
                    $userBranch->description = $newNote ?: "Assigned by {$user->name}";
                }

                if (!empty($bData['due_date'])) {
                    $userBranch->due_date = now()->parse($bData['due_date']);
                }
                $userBranch->save();

                // Update assignment chain
                $userBranch->assignments()->update(['is_current' => false]);
                $userBranch->assignments()->create([
                    'assigned_to_id' => $assigneeId,
                    'assigned_by_id' => $user->id,
                    'is_current' => true,
                    'assigned_at' => now(),
                ]);

                // Attach any new files to this forwarded branch
                $newFiles = $request->file("branch_files.{$assigneeId}")
                    ?? $request->file("branches.{$idx}.files")
                    ?? ($idx === 0 ? $request->file('files') : null)
                    ?? [];
                if (is_array($newFiles)) {
                    foreach ($newFiles as $file) {
                        $path = $file->store("tasks/{$task->id}/attachments", 'public');
                        TaskAttachment::create([
                            'task_id' => $task->id,
                            'task_branch_id' => $userBranch->id,
                            'file_name' => $file->getClientOriginalName(),
                            'file_path' => $path,
                            'file_size' => $file->getSize(),
                            'file_type' => $file->getClientOriginalExtension(),
                            'uploaded_by_id' => $user->id,
                        ]);
                    }
                }

                SendTaskNotification::dispatch(
                    $assigneeId,
                    'task_assigned',
                    "Task branch delegated to you — {$userBranch->title}",
                    $task->id,
                    'Task Assigned',
                    $userBranch->id
                );
                $addedCount++;
                continue;
            }

            // MODE B: Create New Subtask Branch (Standard for Creator, Admin, and Subtask Split)
            $newNote = !empty($bData['description']) ? trim($bData['description']) : '';
            if ($sharePrevious) {
                $baseDesc = $userBranch ? $userBranch->description : $task->description;
                $branchDesc = $newNote
                    ? ($baseDesc ? ($baseDesc . "\n\n--- Subtask Note from {$user->name} ---\n" . $newNote) : $newNote)
                    : ($baseDesc ?: $task->title);
                $branchExpected = !empty($bData['expected_result']) ? trim($bData['expected_result']) : ($userBranch?->expected_result ?? $task->expected_result);
                $branchCriteria = !empty($bData['acceptance_criteria']) ? trim($bData['acceptance_criteria']) : ($userBranch?->acceptance_criteria ?? $task->acceptance_criteria);
            } else {
                $branchDesc = $newNote ?: (!empty($bData['title']) ? trim($bData['title']) : "Subtask assigned by {$user->name}");
                $branchExpected = !empty($bData['expected_result']) ? trim($bData['expected_result']) : null;
                $branchCriteria = !empty($bData['acceptance_criteria']) ? trim($bData['acceptance_criteria']) : null;
            }

            $branchTitle = !empty($bData['title'])
                ? trim($bData['title'])
                : ($userBranch ? "{$userBranch->title} - Subtask" : "{$task->title} - Subtask");
            $branchStart = !empty($bData['start_date']) ? now()->parse($bData['start_date']) : now();
            $branchDue = !empty($bData['due_date']) ? now()->parse($bData['due_date']) : ($userBranch?->due_date ?? $task->due_date);

            $parentAssignment = $userBranch?->assignments()->where('is_current', true)->first();

            $branch = $task->branches()->create([
                'title' => $branchTitle,
                'description' => $branchDesc,
                'expected_result' => $branchExpected,
                'acceptance_criteria' => $branchCriteria,
                'owner_id' => $assigneeId,
                'parent_assignment_id' => $parentAssignment?->id,
                'start_date' => $branchStart,
                'status' => 'pending',
                'due_date' => $branchDue,
            ]);

            $branch->assignments()->create([
                'assigned_to_id' => $assigneeId,
                'assigned_by_id' => $user->id,
                'is_current' => true,
                'assigned_at' => now(),
            ]);

            // If sharePrevious is ticked, link previous attachments to the new branch
            if ($sharePrevious) {
                $previousAtts = collect();
                if ($userBranch) {
                    $previousAtts = TaskAttachment::where('task_id', $task->id)
                        ->where(function ($q) use ($userBranch) {
                            $q->where('task_branch_id', $userBranch->id)
                              ->orWhereNull('task_branch_id');
                        })->get();
                } else {
                    $previousAtts = TaskAttachment::where('task_id', $task->id)->whereNull('task_branch_id')->get();
                }

                foreach ($previousAtts as $prevAtt) {
                    TaskAttachment::create([
                        'task_id' => $task->id,
                        'task_branch_id' => $branch->id,
                        'file_name' => $prevAtt->file_name,
                        'file_path' => $prevAtt->file_path,
                        'file_size' => $prevAtt->file_size,
                        'file_type' => $prevAtt->file_type,
                        'uploaded_by_id' => $user->id,
                    ]);
                }
            }

            // Upload any new individual files for this subtask branch
            $newFiles = $request->file("branch_files.{$assigneeId}")
                ?? $request->file("branches.{$idx}.files")
                ?? ($idx === 0 ? $request->file('files') : null)
                ?? [];
            if (is_array($newFiles)) {
                foreach ($newFiles as $file) {
                    $path = $file->store("tasks/{$task->id}/attachments", 'public');
                    TaskAttachment::create([
                        'task_id' => $task->id,
                        'task_branch_id' => $branch->id,
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size' => $file->getSize(),
                        'file_type' => $file->getClientOriginalExtension(),
                        'uploaded_by_id' => $user->id,
                    ]);
                }
            }

            SendTaskNotification::dispatch(
                $assigneeId,
                'task_assigned',
                "Task assigned to you — {$branchTitle}",
                $task->id,
                'Task Assigned',
                $branch->id
            );
            $addedCount++;
        }

        ActivityLogger::log('task_assigned', "Assigned task to {$addedCount} team members", $task->id);

        return response()->json([
            'message' => "Successfully assigned to {$addedCount} team member(s)",
            'data' => new TaskResource($task->fresh()->load([
                'creator',
                'department',
                'branches.owner',
                'branches.collaborators.user',
                'comments.user',
                'attachments.uploadedBy',
                'statusHistory.changedBy',
                'submissions.submittedBy',
                'submissions.reviews.reviewer',
                'holdRecords.putOnHoldBy'
            ])),
        ]);
    }

    public function addCollaborators(Request $request, Task $task): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin' || $user->role === 'sub_admin';
        $isCreator = $task->creator_id === $user->id;
        $isBranchOwner = $task->branches()->where('owner_id', $user->id)->exists();

        if (!$isAdmin && !$isCreator && !$isBranchOwner) {
            return response()->json(['message' => 'Unauthorized to invite collaborators'], 403);
        }

        if (in_array($task->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Cannot add collaborators to a completed or cancelled task'], 422);
        }

        $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
        ]);

        if ($task->handling_method === 'work_alone') {
            $task->update(['handling_method' => 'collaborate']);
        }

        $addedCount = 0;
        $firstBranch = $task->branches()->first();
        if (!$firstBranch) {
            $firstBranch = $task->branches()->create([
                'title' => $task->title,
                'description' => $task->description,
                'owner_id' => $task->creator_id,
                'status' => 'in_progress',
                'due_date' => $task->due_date,
            ]);
        }

        foreach ($request->user_ids as $collabId) {
            $collab = TaskCollaborator::firstOrCreate([
                'task_branch_id' => $firstBranch->id,
                'user_id' => $collabId,
            ], [
                'invited_by_id' => $user->id,
                'can_assign' => true,
                'can_collaborate' => true,
                'invited_at' => now(),
            ]);

            if ($collab->wasRecentlyCreated) {
                $addedCount++;
                if ($collabId !== $user->id) {
                    SendTaskNotification::dispatch(
                        $collabId,
                        'collaboration_invite',
                        "You were invited to collaborate on — {$task->title}",
                        $task->id,
                        'New Collaboration',
                        $firstBranch->id
                    );
                }
            }
        }

        ActivityLogger::log('collaborator_added', "Added {$addedCount} collaborator(s) to task", $task->id);

        return response()->json([
            'message' => "Successfully invited {$addedCount} collaborator(s)",
            'data' => new TaskResource($task->fresh()->load([
                'creator',
                'department',
                'branches.owner',
                'branches.collaborators.user',
                'comments.user',
                'attachments.uploadedBy',
                'statusHistory.changedBy',
                'submissions.submittedBy',
                'submissions.reviews.reviewer',
                'holdRecords.putOnHoldBy'
            ])),
        ]);
    }
}
