<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskStatusHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employee;
    protected Department $department;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::firstOrCreate(
            ['name' => 'Engineering'],
            ['description' => 'Software engineering', 'is_active' => true]
        );

        $this->admin = User::firstOrCreate(
            ['email' => 'admin_worklog_test@example.com'],
            [
                'name' => 'Admin WorkLog Tester',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'department_id' => $this->department->id,
                'is_active' => true,
            ]
        );

        $this->employee = User::firstOrCreate(
            ['email' => 'employee_worklog_test@example.com'],
            [
                'name' => 'Employee WorkLog Tester',
                'password' => bcrypt('password'),
                'role' => 'employee',
                'department_id' => $this->department->id,
                'is_active' => true,
            ]
        );

        $this->task = Task::create([
            'title' => 'Test WorkLog Journey Task',
            'description' => 'Testing complete audit journey',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
            'status' => 'in_progress',
            'priority' => 'high',
            'progress' => 45,
            'start_date' => now(),
            'due_date' => now()->addDays(5),
        ]);

        TaskComment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->employee->id,
            'comment' => 'Initial communication note between team members',
        ]);

        TaskStatusHistory::create([
            'task_id' => $this->task->id,
            'from_status' => 'pending',
            'to_status' => 'in_progress',
            'changed_by_id' => $this->admin->id,
            'reason' => 'Work started by assignee',
            'changed_at' => now(),
        ]);
    }

    public function test_employee_cannot_access_work_logs(): void
    {
        Sanctum::actingAs($this->employee);

        $response = $this->getJson('/api/work-logs');
        $response->assertStatus(403);

        $statsResponse = $this->getJson('/api/work-logs/stats');
        $statsResponse->assertStatus(403);
    }

    public function test_admin_can_access_work_logs_and_stats(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/work-logs');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data',
            'meta' => ['current_page', 'per_page', 'total', 'last_page'],
        ]);

        $statsResponse = $this->getJson('/api/work-logs/stats');
        $statsResponse->assertStatus(200);
        $statsResponse->assertJsonStructure([
            'data' => [
                'total_logs',
                'total_comments',
                'total_status_changes',
                'total_attachments',
                'total_reviews',
                'total_tasks',
            ],
        ]);
    }

    public function test_admin_can_retrieve_complete_task_journey_dossier(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson("/api/work-logs/task/{$this->task->id}");
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'task' => [
                    'id',
                    'task_code',
                    'title',
                    'handling_method',
                    'status',
                    'creator',
                ],
                'timeline',
                'conversations',
                'attachments',
                'branches',
            ],
        ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data['timeline']);
        $this->assertNotEmpty($data['conversations']);
        $this->assertEquals('Initial communication note between team members', $data['conversations'][0]['comment']);
    }
}
