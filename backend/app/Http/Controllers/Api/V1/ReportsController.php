<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\Department;
use App\Models\User;
use App\Models\ActivityLog;
use App\Models\SystemNotification;
use App\Http\Resources\V1\TaskResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class ReportsController extends Controller
{
    public function adminDashboard(Request $request): JsonResponse
    {
        $data = Cache::remember('admin_dashboard_metrics', 25, function () {
            $counts = Task::selectRaw("
                count(*) as total_tasks,
                count(case when status = 'pending' then 1 end) as open_tasks,
                count(case when status = 'in_progress' then 1 end) as in_progress,
                count(case when status = 'review' then 1 end) as pending_review,
                count(case when status = 'on_hold' then 1 end) as on_hold,
                count(case when status = 'completed' then 1 end) as completed,
                count(case when status in ('cancelled', 'rejected') then 1 end) as cancelled,
                count(case when status = 'post_comment' then 1 end) as clarification,
                count(case when due_date < ? and status not in ('completed', 'cancelled', 'rejected', 'on_hold') then 1 end) as overdue
            ", [now()])->first();

            $totalTasks = (int) ($counts->total_tasks ?? 0);
            $pending = (int) ($counts->open_tasks ?? 0);
            $inProgress = (int) ($counts->in_progress ?? 0);
            $pendingReview = (int) ($counts->pending_review ?? 0);
            $onHold = (int) ($counts->on_hold ?? 0);
            $completed = (int) ($counts->completed ?? 0);
            $cancelled = (int) ($counts->cancelled ?? 0);
            $clarification = (int) ($counts->clarification ?? 0);
            $overdue = (int) ($counts->overdue ?? 0);

            // Tasks by Status for Donut Chart (Mutually exclusive & exhaustive, sum == $totalTasks)
            $tasksByStatus = [
                ['name' => 'Open', 'value' => $pending, 'color' => '#f97316'],
                ['name' => 'In Progress', 'value' => $inProgress + $clarification, 'color' => '#3b82f6'],
                ['name' => 'Pending Review', 'value' => $pendingReview, 'color' => '#eab308'],
                ['name' => 'Completed', 'value' => $completed, 'color' => '#22c55e'],
                ['name' => 'On Hold', 'value' => $onHold, 'color' => '#ef4444'],
                ['name' => 'Cancelled', 'value' => $cancelled, 'color' => '#94a3b8'],
            ];

            // Tasks by Department for Bar Chart
            $departments = Department::withCount('tasks')->get(['id', 'name']);
            $tasksByDepartment = $departments->map(fn($d) => [
                'name' => $d->name,
                'count' => $d->tasks_count,
            ])->values()->all();

            // Recent Activity
            $recentActivity = ActivityLog::with('actor:id,name,role')
                ->select('id', 'action', 'description', 'actor_id', 'created_at')
                ->latest('created_at')
                ->take(10)
                ->get()
                ->map(fn($log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $log->description,
                    'created_at' => $log->created_at->toISOString(),
                    'time_ago' => $log->created_at->diffForHumans(),
                    'actor' => $log->actor ? [
                        'id' => $log->actor->id,
                        'name' => $log->actor->name,
                        'role' => $log->actor->role,
                    ] : null,
                ])->values()->all();

            // Upcoming Deadlines
            $upcomingDeadlines = Task::select('id', 'title', 'due_date', 'priority', 'status')
                ->whereNotNull('due_date')
                ->whereNotIn('status', ['completed', 'cancelled', 'rejected'])
                ->orderBy('due_date', 'asc')
                ->take(6)
                ->get()
                ->map(fn($t) => [
                    'id' => $t->id,
                    'task_code' => sprintf('T-%03d', $t->id),
                    'title' => $t->title,
                    'due_date' => $t->due_date->format('d M Y'),
                    'is_overdue' => $t->due_date->isPast(),
                    'priority' => $t->priority,
                    'status' => $t->status,
                ])->values()->all();

            // Employee Workload Summary (eager loaded department to eliminate N+1 queries)
            $employeeWorkload = User::with('department:id,name')->withCount([
                'ownedBranches as active_count' => fn($q) => $q->whereHas('task')->whereNotIn('status', ['completed', 'cancelled']),
                'ownedBranches as completed_count' => fn($q) => $q->whereHas('task')->where('status', 'completed'),
            ])
            ->where('is_active', true)
            ->take(6)
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'role' => $u->role,
                'department' => $u->department?->name ?? 'General',
                'active_tasks' => $u->active_count,
                'completed_tasks' => $u->completed_count,
            ])->values()->all();

            return [
                'total_tasks' => $totalTasks,
                'open_tasks' => $pending,
                'in_progress' => $inProgress,
                'pending_review' => $pendingReview,
                'on_hold' => $onHold,
                'cancelled' => $cancelled,
                'overdue' => $overdue,
                'returned' => $clarification,
                'completed' => $completed,
                'tasks_by_status' => $tasksByStatus,
                'tasks_by_department' => $tasksByDepartment,
                'employee_workload' => $employeeWorkload,
                'recent_activity' => $recentActivity,
                'upcoming_deadlines' => $upcomingDeadlines,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function employeeDashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = Cache::remember("employee_dashboard_{$user->id}", 15, function () use ($user) {
            // 1. My Action count (Active deliverables requiring user's input)
            $myActionCount = Task::whereNotIn('status', ['completed', 'cancelled'])
                ->where(function ($q) use ($user) {
                    $q->where(function ($w) use ($user) {
                        $w->where('handling_method', 'work_alone')
                          ->where('creator_id', $user->id)
                          ->whereIn('status', ['pending', 'in_progress', 'post_comment']);
                    })
                    ->orWhere(function ($cf) use ($user) {
                        $cf->where('creator_id', $user->id)
                           ->whereIn('status', ['pending', 'in_progress', 'review'])
                           ->whereDoesntHave('branches', function ($b) {
                               $b->whereIn('status', ['pending', 'in_progress', 'review', 'post_comment']);
                           });
                    })
                    ->orWhereHas('branches', function ($b) use ($user) {
                        $b->where(function ($bo) use ($user) {
                            $bo->where('owner_id', $user->id)
                               ->orWhereHas('assignments', fn($a) => $a->where('assigned_to_id', $user->id)->where('is_current', true));
                        })
                        ->whereIn('status', ['pending', 'in_progress', 'post_comment']);
                    })
                    ->orWhere(function ($r) use ($user) {
                        $r->where('status', 'review')
                          ->where(function ($revQ) use ($user) {
                              $revQ->where('creator_id', $user->id)
                                   ->orWhereHas('branches.assignments', fn($a) => $a->where('assigned_by_id', $user->id)->where('assigned_to_id', '!=', $user->id)->where('is_current', true));
                          });
                    });
                })->count();

            // 2. Assigned to Me count
            $assignedToMeCount = TaskBranch::where(function ($b) use ($user) {
                $b->where('owner_id', $user->id)
                  ->orWhereHas('assignments', fn($a) => $a->where('assigned_to_id', $user->id)->where('is_current', true));
            })
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

            // 3. My In Progress count
            $myInProgressCount = TaskBranch::where(function ($b) use ($user) {
                $b->where('owner_id', $user->id)
                  ->orWhereHas('assignments', fn($a) => $a->where('assigned_to_id', $user->id)->where('is_current', true));
            })
            ->whereIn('status', ['pending', 'in_progress'])
            ->count();

            // 4. My Created count
            $myCreatedCount = Task::where('creator_id', $user->id)->count();

            // 5. My Collaborations count
            $myCollaborationsCount = Task::where('handling_method', 'collaborate')
                ->where(function ($c) use ($user) {
                    $c->whereHas('branches.collaborators', fn($col) => $col->where('user_id', $user->id))
                      ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
                })->count();

            // 6. Awaiting Review count
            $awaitingReviewCount = Task::where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
            })->where('status', 'review')->count();

            // 7. Returned Tasks count
            $returnedCount = Task::where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
            })->where('status', 'post_comment')->count();

            // 8. Completed count
            $myCompletedCount = TaskBranch::whereHas('task')->where(function ($b) use ($user) {
                $b->where('owner_id', $user->id)
                  ->orWhereHas('assignments', fn($a) => $a->where('assigned_to_id', $user->id)->where('is_current', true));
            })->where('status', 'completed')->count();

            // My Upcoming Tasks
            $upcomingTasks = Task::select('id', 'title', 'status', 'priority', 'due_date')
                ->where(function ($q) use ($user) {
                    $q->where('creator_id', $user->id)
                      ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id))
                      ->orWhereHas('branches.assignments', fn($a) => $a->where('assigned_to_id', $user->id)->where('is_current', true));
                })
                ->whereNotIn('status', ['cancelled'])
                ->orderBy('due_date', 'asc')
                ->take(6)
                ->get()
                ->map(fn($t) => [
                    'id' => $t->id,
                    'task_code' => sprintf('T-%03d', $t->id),
                    'title' => $t->title,
                    'status' => $t->status,
                    'priority' => $t->priority,
                    'due_date' => $t->due_date ? $t->due_date->format('d M Y') : 'No Date',
                    'is_overdue' => $t->due_date ? $t->due_date->isPast() && $t->status !== 'completed' : false,
                ])->values()->all();

            // Status Breakdown for Employee (lightweight column selection)
            $userTasks = Task::select('id', 'status')->where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id))
                  ->orWhereHas('branches.assignments', fn($a) => $a->where('assigned_to_id', $user->id)->where('is_current', true));
            })->get();

            $tasksByStatus = [
                ['name' => 'Open', 'value' => $userTasks->where('status', 'pending')->count(), 'color' => '#f97316'],
                ['name' => 'In Progress', 'value' => $userTasks->whereIn('status', ['in_progress', 'post_comment'])->count(), 'color' => '#3b82f6'],
                ['name' => 'Pending Review', 'value' => $userTasks->where('status', 'review')->count(), 'color' => '#eab308'],
                ['name' => 'Completed', 'value' => $userTasks->where('status', 'completed')->count(), 'color' => '#22c55e'],
                ['name' => 'On Hold', 'value' => $userTasks->where('status', 'on_hold')->count(), 'color' => '#ef4444'],
                ['name' => 'Cancelled', 'value' => $userTasks->whereIn('status', ['cancelled', 'rejected'])->count(), 'color' => '#94a3b8'],
            ];

            // Recent Notifications
            $recentNotifications = SystemNotification::select('id', 'type', 'title', 'message', 'is_read', 'created_at', 'task_id')
                ->where('user_id', $user->id)
                ->latest('created_at')
                ->take(6)
                ->get()
                ->map(fn($n) => [
                    'id' => $n->id,
                    'type' => $n->type,
                    'title' => $n->title,
                    'message' => $n->message,
                    'is_read' => (bool) $n->is_read,
                    'task_id' => $n->task_id,
                    'created_at' => $n->created_at->toISOString(),
                    'time_ago' => $n->created_at->diffForHumans(),
                ])->values()->all();

            return [
                'my_action' => $myActionCount,
                'assigned_to_me' => $assignedToMeCount,
                'my_in_progress' => $myInProgressCount,
                'my_pending_review' => $awaitingReviewCount,
                'completed' => $myCompletedCount,
                'my_created' => $myCreatedCount,
                'my_collaborations' => $myCollaborationsCount,
                'awaiting_review' => $awaitingReviewCount,
                'returned_tasks' => $returnedCount,
                'upcoming_tasks' => $upcomingTasks,
                'tasks_by_status' => $tasksByStatus,
                'recent_notifications' => $recentNotifications,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function reports(Request $request): JsonResponse
    {
        $range = $request->input('range', 'last_30_days');
        $startDate = match ($range) {
            'last_7_days' => now()->subDays(7),
            'this_month' => now()->startOfMonth(),
            'this_quarter' => now()->startOfQuarter(),
            'last_year' => now()->subYear(),
            default => now()->subDays(30),
        };

        $totalTasks = Task::where('created_at', '>=', $startDate)->count();
        $openTasks = Task::where('created_at', '>=', $startDate)->where('status', 'pending')->count();
        $inProgressTasks = Task::where('created_at', '>=', $startDate)->whereIn('status', ['in_progress', 'post_comment'])->count();
        $reviewTasks = Task::where('created_at', '>=', $startDate)->where('status', 'review')->count();
        $completedTasks = Task::where('created_at', '>=', $startDate)->where('status', 'completed')->count();
        $onHoldTasks = Task::where('created_at', '>=', $startDate)->where('status', 'on_hold')->count();
        $cancelledTasks = Task::where('created_at', '>=', $startDate)->whereIn('status', ['cancelled', 'rejected'])->count();
        $overdueTasks = Task::where('due_date', '<', now())
            ->whereNotIn('status', ['completed', 'cancelled', 'rejected', 'on_hold'])
            ->count();

        $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

        // Tasks by Status (Mutually exclusive & exhaustive, sum == $totalTasks)
        $tasksByStatus = [
            ['status' => 'Open', 'count' => $openTasks, 'color' => '#f97316'],
            ['status' => 'In Progress', 'count' => $inProgressTasks, 'color' => '#3b82f6'],
            ['status' => 'Review', 'count' => $reviewTasks, 'color' => '#eab308'],
            ['status' => 'Completed', 'count' => $completedTasks, 'color' => '#22c55e'],
            ['status' => 'On Hold', 'count' => $onHoldTasks, 'color' => '#ef4444'],
            ['status' => 'Cancelled', 'count' => $cancelledTasks, 'color' => '#94a3b8'],
        ];

        // Tasks by Department
        $tasksByDepartment = Department::withCount(['tasks' => function ($q) use ($startDate) {
            $q->where('created_at', '>=', $startDate);
        }])->get()->map(fn($d) => [
            'department' => $d->name,
            'count' => $d->tasks_count,
        ])->values()->all();

        // Employee Workload Table (eager loaded department to eliminate N+1 queries)
        $employees = User::with('department')->withCount([
            'ownedBranches as assigned_count' => fn($q) => $q->whereHas('task')->whereNotIn('status', ['cancelled']),
            'ownedBranches as completed_count' => fn($q) => $q->whereHas('task')->where('status', 'completed'),
            'ownedBranches as pending_count' => fn($q) => $q->whereHas('task')->whereIn('status', ['pending', 'in_progress']),
        ])->get()->map(function ($u) {
            $overdueCount = TaskBranch::where('owner_id', $u->id)
                ->whereHas('task')
                ->where('due_date', '<', now())
                ->whereNotIn('status', ['completed', 'cancelled', 'on_hold'])
                ->count();

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'department' => $u->department?->name ?? 'Unassigned',
                'assigned' => $u->assigned_count,
                'completed' => $u->completed_count,
                'pending' => $u->pending_count,
                'overdue' => $overdueCount,
            ];
        })->values()->all();

        return response()->json([
            'data' => [
                'total_tasks' => $totalTasks,
                'completion_rate' => $completionRate,
                'overdue_count' => $overdueTasks,
                'completed_count' => $completedTasks,
                'tasks_by_status' => $tasksByStatus,
                'tasks_by_department' => $tasksByDepartment,
                'employee_workload' => $employees,
            ],
        ]);
    }

    public function exportCsv(Request $request)
    {
        $employees = User::with('department')->withCount([
            'ownedBranches as assigned_count' => fn($q) => $q->whereHas('task')->whereNotIn('status', ['cancelled']),
            'ownedBranches as completed_count' => fn($q) => $q->whereHas('task')->where('status', 'completed'),
            'ownedBranches as pending_count' => fn($q) => $q->whereHas('task')->whereIn('status', ['pending', 'in_progress']),
        ])->get();

        $csvHeader = ['User ID', 'Name', 'Email', 'Role', 'Department', 'Assigned Subtasks', 'Completed Subtasks', 'Active/Pending', 'Overdue Subtasks', 'Completion Rate (%)'];

        $callback = function () use ($employees, $csvHeader) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $csvHeader);

            foreach ($employees as $u) {
                $overdueCount = TaskBranch::where('owner_id', $u->id)
                    ->whereHas('task')
                    ->where('due_date', '<', now())
                    ->whereNotIn('status', ['completed', 'cancelled', 'on_hold'])
                    ->count();

                $assigned = (int) $u->assigned_count;
                $completed = (int) $u->completed_count;
                $rate = $assigned > 0 ? round(($completed / $assigned) * 100, 1) : 0;

                fputcsv($file, [
                    $u->id,
                    $u->name,
                    $u->email,
                    $u->role,
                    $u->department?->name ?? 'Unassigned',
                    $assigned,
                    $completed,
                    $u->pending_count,
                    $overdueCount,
                    $rate . '%',
                ]);
            }
            fclose($file);
        };

        $fileName = 'Employee_Workload_Report_' . date('Y-m-d') . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }
}
