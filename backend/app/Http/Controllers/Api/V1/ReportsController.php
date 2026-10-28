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
use Carbon\Carbon;

class ReportsController extends Controller
{
    public function adminDashboard(Request $request): JsonResponse
    {
        $totalTasks = Task::count();
        $openTasks = Task::whereIn('status', ['pending', 'in_progress', 'review', 'post_comment'])->count();
        $inProgress = Task::where('status', 'in_progress')->count();
        $pendingReview = Task::where('status', 'review')->count();
        $onHold = Task::where('status', 'on_hold')->count();
        $completed = Task::where('status', 'completed')->count();
        $returned = Task::where('status', 'post_comment')->count();
        $overdue = Task::where('due_date', '<', now())
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        // Tasks by Status for Donut Chart
        $tasksByStatus = [
            ['name' => 'Open', 'value' => $openTasks, 'color' => '#f97316'],
            ['name' => 'In Progress', 'value' => $inProgress, 'color' => '#3b82f6'],
            ['name' => 'Pending Review', 'value' => $pendingReview, 'color' => '#eab308'],
            ['name' => 'Completed', 'value' => $completed, 'color' => '#22c55e'],
            ['name' => 'On Hold', 'value' => $onHold, 'color' => '#ef4444'],
        ];

        // Tasks by Department for Bar Chart
        $departments = Department::withCount('tasks')->get();
        $tasksByDepartment = $departments->map(fn($d) => [
            'name' => $d->name,
            'count' => $d->tasks_count,
        ]);

        // Recent Activity
        $recentActivity = ActivityLog::with('actor')
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
            ]);

        // Upcoming Deadlines
        $upcomingDeadlines = Task::whereNotNull('due_date')
            ->whereNotIn('status', ['completed', 'cancelled'])
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
            ]);

        // Employee Workload Summary
        $employeeWorkload = User::withCount([
            'ownedBranches as active_count' => fn($q) => $q->whereNotIn('status', ['completed', 'cancelled']),
            'ownedBranches as completed_count' => fn($q) => $q->where('status', 'completed'),
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
        ]);

        return response()->json([
            'data' => [
                'total_tasks' => $totalTasks,
                'open_tasks' => $openTasks,
                'in_progress' => $inProgress,
                'pending_review' => $pendingReview,
                'on_hold' => $onHold,
                'overdue' => $overdue,
                'returned' => $returned,
                'completed' => $completed,
                'tasks_by_status' => $tasksByStatus,
                'tasks_by_department' => $tasksByDepartment,
                'employee_workload' => $employeeWorkload,
                'recent_activity' => $recentActivity,
                'upcoming_deadlines' => $upcomingDeadlines,
            ],
        ]);
    }

    public function employeeDashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. My Action count
        $myActionCount = Task::where(function ($q) use ($user) {
            $q->where(function ($w) use ($user) {
                $w->where('handling_method', 'work_alone')
                  ->where('creator_id', $user->id)
                  ->whereIn('status', ['pending', 'in_progress', 'post_comment']);
            })
            ->orWhereHas('branches', function ($b) use ($user) {
                $b->where('owner_id', $user->id)
                  ->whereIn('status', ['pending', 'in_progress', 'post_comment']);
            })
            ->orWhere(function ($r) use ($user) {
                $r->where('status', 'review')->where('creator_id', $user->id);
            });
        })->count();

        // 2. Assigned to Me count
        $assignedToMeCount = TaskBranch::where('owner_id', $user->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        // 3. My Created count
        $myCreatedCount = Task::where('creator_id', $user->id)->count();

        // 4. My Collaborations count
        $myCollaborationsCount = Task::where('handling_method', 'collaborate')
            ->where(function ($c) use ($user) {
                $c->whereHas('branches.collaborators', fn($col) => $col->where('user_id', $user->id))
                  ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
            })->count();

        // 5. Awaiting Review count
        $awaitingReviewCount = Task::where(function ($q) use ($user) {
            $q->where('creator_id', $user->id)
              ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
        })->where('status', 'review')->count();

        // 6. Returned Tasks count
        $returnedCount = Task::where(function ($q) use ($user) {
            $q->where('creator_id', $user->id)
              ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
        })->where('status', 'post_comment')->count();

        // My Upcoming Tasks
        $upcomingTasks = Task::where(function ($q) use ($user) {
            $q->where('creator_id', $user->id)
              ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
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
        ]);

        // Status Breakdown for Employee
        $userTasks = Task::where(function ($q) use ($user) {
            $q->where('creator_id', $user->id)
              ->orWhereHas('branches', fn($b) => $b->where('owner_id', $user->id));
        })->get();

        $tasksByStatus = [
            ['name' => 'My Action', 'value' => $myActionCount, 'color' => '#3b82f6'],
            ['name' => 'In Progress', 'value' => $userTasks->where('status', 'in_progress')->count(), 'color' => '#06b6d4'],
            ['name' => 'Pending Review', 'value' => $userTasks->where('status', 'review')->count(), 'color' => '#eab308'],
            ['name' => 'Completed', 'value' => $userTasks->where('status', 'completed')->count(), 'color' => '#22c55e'],
            ['name' => 'On Hold', 'value' => $userTasks->where('status', 'on_hold')->count(), 'color' => '#ef4444'],
        ];

        // Recent Notifications
        $recentNotifications = SystemNotification::where('user_id', $user->id)
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
            ]);

        return response()->json([
            'data' => [
                'my_action' => $myActionCount,
                'assigned_to_me' => $assignedToMeCount,
                'my_created' => $myCreatedCount,
                'my_collaborations' => $myCollaborationsCount,
                'awaiting_review' => $awaitingReviewCount,
                'returned_tasks' => $returnedCount,
                'upcoming_tasks' => $upcomingTasks,
                'tasks_by_status' => $tasksByStatus,
                'recent_notifications' => $recentNotifications,
            ],
        ]);
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
        $openTasks = Task::where('created_at', '>=', $startDate)->whereIn('status', ['pending', 'in_progress'])->count();
        $reviewTasks = Task::where('created_at', '>=', $startDate)->where('status', 'review')->count();
        $completedTasks = Task::where('created_at', '>=', $startDate)->where('status', 'completed')->count();
        $onHoldTasks = Task::where('created_at', '>=', $startDate)->where('status', 'on_hold')->count();
        $overdueTasks = Task::where('due_date', '<', now())
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

        // Tasks by Status
        $tasksByStatus = [
            ['status' => 'Open', 'count' => $openTasks, 'color' => '#3b82f6'],
            ['status' => 'In Progress', 'count' => Task::where('status', 'in_progress')->count(), 'color' => '#0ea5e9'],
            ['status' => 'Review', 'count' => $reviewTasks, 'color' => '#8b5cf6'],
            ['status' => 'Completed', 'count' => $completedTasks, 'color' => '#10b981'],
            ['status' => 'On Hold', 'count' => $onHoldTasks, 'color' => '#ef4444'],
        ];

        // Tasks by Department
        $tasksByDepartment = Department::withCount(['tasks' => function ($q) use ($startDate) {
            $q->where('created_at', '>=', $startDate);
        }])->get()->map(fn($d) => [
            'department' => $d->name,
            'count' => $d->tasks_count,
        ]);

        // Employee Workload Table
        $employees = User::withCount([
            'ownedBranches as assigned_count' => fn($q) => $q->whereNotIn('status', ['cancelled']),
            'ownedBranches as completed_count' => fn($q) => $q->where('status', 'completed'),
            'ownedBranches as pending_count' => fn($q) => $q->whereIn('status', ['pending', 'in_progress']),
        ])->get()->map(function ($u) {
            $overdueCount = TaskBranch::where('owner_id', $u->id)
                ->where('due_date', '<', now())
                ->whereNotIn('status', ['completed', 'cancelled'])
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
        });

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
}
