<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Department;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $subAdmin;
    protected User $employee1;
    protected User $employee2;
    protected Department $department;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::create([
            'name' => 'Engineering',
            'is_active' => true,
        ]);

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->subAdmin = User::create([
            'name' => 'Sub Admin User',
            'email' => 'subadmin@test.com',
            'password' => bcrypt('password'),
            'role' => 'sub_admin',
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $this->employee1 = User::create([
            'name' => 'Employee One',
            'email' => 'emp1@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $this->employee2 = User::create([
            'name' => 'Employee Two',
            'email' => 'emp2@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);
    }

    public function test_work_alone_workflow(): void
    {
        // 1. Employee creates a Work Alone task
        $response = $this->actingAs($this->employee1)->postJson('/api/tasks', [
            'title' => 'Write Documentation',
            'description' => 'Write API documentation alone',
            'handling_method' => 'work_alone',
            'priority' => 'medium',
        ]);
        $response->assertStatus(201);
        $taskId = $response->json('data.id');

        $task = Task::find($taskId);
        $this->assertEquals('in_progress', $task->status);
        $this->assertEquals('work_alone', $task->handling_method);

        // 2. Creator submits work directly for completion
        $submitResponse = $this->actingAs($this->employee1)->postJson("/api/tasks/{$taskId}/submit", [
            'description' => 'Documentation finished and published.',
        ]);
        $submitResponse->assertStatus(201);

        $task->refresh();
        $this->assertEquals('completed', $task->status);
        $this->assertNotNull($task->completed_at);
    }

    public function test_assign_workflow_with_return_and_approval(): void
    {
        // 1. Employee 1 creates and assigns task to Employee 2
        $response = $this->actingAs($this->employee1)->postJson('/api/tasks', [
            'title' => 'Implement Feature A',
            'description' => 'Please code feature A',
            'handling_method' => 'assign',
            'priority' => 'high',
            'assignees' => [$this->employee2->id],
        ]);
        $response->assertStatus(201);
        $taskId = $response->json('data.id');
        $task = Task::find($taskId);
        $branch = $task->branches()->first();

        $this->assertNotNull($branch);
        $this->assertEquals($this->employee2->id, $branch->owner_id);

        // 2. Employee 2 submits work for review
        $submitResponse = $this->actingAs($this->employee2)->postJson("/api/tasks/{$taskId}/submit", [
            'task_branch_id' => $branch->id,
            'description' => 'Feature A implemented, please review PR',
        ]);
        $submitResponse->assertStatus(201);
        $submissionId = $submitResponse->json('data.id');

        $task->refresh();
        $branch->refresh();
        $this->assertEquals('review', $task->status);
        $this->assertEquals('review', $branch->status);

        // 3. Creator (Employee 1) returns for correction with comments
        $returnResponse = $this->actingAs($this->employee1)->postJson("/api/submissions/{$submissionId}/review", [
            'decision' => 'returned',
            'comments' => 'Unit tests are missing for edge case X',
        ]);
        $returnResponse->assertStatus(201);

        $task->refresh();
        $branch->refresh();
        $this->assertEquals('post_comment', $task->status);
        $this->assertEquals('post_comment', $branch->status);

        // 4. Employee 2 corrects and resubmits
        $resubmitResponse = $this->actingAs($this->employee2)->postJson("/api/tasks/{$taskId}/submit", [
            'task_branch_id' => $branch->id,
            'description' => 'Unit tests added and passing',
        ]);
        $resubmitResponse->assertStatus(201);
        $newSubmissionId = $resubmitResponse->json('data.id');

        // 5. Creator approves the submission
        $approveResponse = $this->actingAs($this->employee1)->postJson("/api/submissions/{$newSubmissionId}/review", [
            'decision' => 'approved',
            'comments' => 'Looks great!',
        ]);
        $approveResponse->assertStatus(201);

        $branch->refresh();
        $this->assertEquals('completed', $branch->status);

        // 6. Creator performs final submission to mark entire task completed
        $finalResponse = $this->actingAs($this->employee1)->postJson("/api/tasks/{$taskId}/final-submit");
        $finalResponse->assertStatus(200);

        $task->refresh();
        $this->assertEquals('completed', $task->status);
    }

    public function test_collaborate_parent_task_completion_rule(): void
    {
        // 1. Admin creates collaborative task with two parallel branches
        $response = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Cross-functional Launch',
            'description' => 'Coordinate frontend and backend',
            'handling_method' => 'collaborate',
            'priority' => 'high',
            'branches' => [
                ['title' => 'Backend API', 'owner_id' => $this->employee1->id],
                ['title' => 'Frontend UI', 'owner_id' => $this->employee2->id],
            ],
        ]);
        $response->assertStatus(201);
        $taskId = $response->json('data.id');
        $task = Task::find($taskId);

        $this->assertEquals(2, $task->branches()->count());

        // 2. Creator attempts final submission before branches are completed -> Should fail!
        $earlyFinal = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/final-submit");
        $earlyFinal->assertStatus(422);

        // 3. Complete branch 1
        $branch1 = $task->branches()->where('owner_id', $this->employee1->id)->first();
        $sub1 = $this->actingAs($this->employee1)->postJson("/api/tasks/{$taskId}/submit", [
            'task_branch_id' => $branch1->id,
            'description' => 'API is ready',
        ])->json('data.id');

        $this->actingAs($this->admin)->postJson("/api/submissions/{$sub1}/review", [
            'decision' => 'approved',
        ]);

        // Still 1 branch pending, final submit must still fail
        $midFinal = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/final-submit");
        $midFinal->assertStatus(422);

        // 4. Complete branch 2
        $branch2 = $task->branches()->where('owner_id', $this->employee2->id)->first();
        $sub2 = $this->actingAs($this->employee2)->postJson("/api/tasks/{$taskId}/submit", [
            'task_branch_id' => $branch2->id,
            'description' => 'UI is ready',
        ])->json('data.id');

        $this->actingAs($this->admin)->postJson("/api/submissions/{$sub2}/review", [
            'decision' => 'approved',
        ]);

        // 5. Now all branches are approved -> Final submit succeeds!
        $successFinal = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/final-submit");
        $successFinal->assertStatus(200);

        $task->refresh();
        $this->assertEquals('completed', $task->status);
    }

    public function test_hold_and_resume_task(): void
    {
        $task = Task::create([
            'title' => 'Pending Procurement',
            'description' => 'Need hardware',
            'handling_method' => 'work_alone',
            'creator_id' => $this->employee1->id,
            'status' => 'in_progress',
        ]);

        // Put on hold with mandatory reason
        $holdResponse = $this->actingAs($this->employee1)->putJson("/api/tasks/{$task->id}/hold", [
            'reason' => 'Waiting for vendor quote',
        ]);
        $holdResponse->assertStatus(200);

        $task->refresh();
        $this->assertEquals('on_hold', $task->status);
        $this->assertEquals(1, $task->holdRecords()->count());

        // Resume task
        $resumeResponse = $this->actingAs($this->employee1)->putJson("/api/tasks/{$task->id}/resume");
        $resumeResponse->assertStatus(200);

        $task->refresh();
        $this->assertEquals('in_progress', $task->status);
    }

    public function test_cancellation_permissions(): void
    {
        $task = Task::create([
            'title' => 'Task by Employee 1',
            'description' => 'Desc',
            'handling_method' => 'work_alone',
            'creator_id' => $this->employee1->id,
            'status' => 'in_progress',
        ]);

        // Employee 2 (unauthorized) attempts to cancel -> 403 Forbidden!
        $unauthCancel = $this->actingAs($this->employee2)->postJson("/api/tasks/{$task->id}/cancel", [
            'reason' => 'Not needed anymore',
        ]);
        $unauthCancel->assertStatus(403);

        // Creator (Employee 1) cancels -> 200 OK!
        $creatorCancel = $this->actingAs($this->employee1)->postJson("/api/tasks/{$task->id}/cancel", [
            'reason' => 'Duplicate requirement cancelled by creator',
        ]);
        $creatorCancel->assertStatus(200);

        $task->refresh();
        $this->assertEquals('cancelled', $task->status);
    }

    public function test_subadmin_cannot_create_admin_account(): void
    {
        // Sub-admin attempts to create Admin account -> 403 Forbidden!
        $response = $this->actingAs($this->subAdmin)->postJson('/api/users', [
            'name' => 'New Admin',
            'email' => 'newadmin@test.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);
        $response->assertStatus(403);

        // Sub-admin CAN create Employee account -> 201 Created!
        $validResponse = $this->actingAs($this->subAdmin)->postJson('/api/users', [
            'name' => 'New Regular Employee',
            'email' => 'newemp@test.com',
            'password' => 'password123',
            'role' => 'employee',
        ]);
        $validResponse->assertStatus(201);
    }

    public function test_pending_and_pending_with_others_scoping(): void
    {
        // 1. Employee 1 creates and assigns a task to Employee 2
        $createRes = $this->actingAs($this->employee1)->postJson('/api/tasks', [
            'title' => 'Cross-team Feature Task',
            'description' => 'Detailed requirements',
            'handling_method' => 'assign',
            'assignees' => [$this->employee2->id],
            'priority' => 'high',
        ]);
        $createRes->assertStatus(201);
        $taskId = $createRes->json('data.id');

        // Employee 2 should see this in My Action / Pending
        $emp2Pending = $this->actingAs($this->employee2)->getJson('/api/tasks?view=my_action');
        $emp2Pending->assertStatus(200);
        $this->assertEquals(1, count($emp2Pending->json('data')));
        $this->assertEquals($taskId, $emp2Pending->json('data.0.id'));

        // Employee 2 should NOT see this in Pending with Others
        $emp2Others = $this->actingAs($this->employee2)->getJson('/api/tasks?view=pending_with_others');
        $emp2Others->assertStatus(200);
        $this->assertEquals(0, count($emp2Others->json('data')));

        // Employee 1 (creator) should see this in Pending with Others
        $emp1Others = $this->actingAs($this->employee1)->getJson('/api/tasks?view=pending_with_others');
        $emp1Others->assertStatus(200);
        $this->assertEquals(1, count($emp1Others->json('data')));
        $this->assertEquals($taskId, $emp1Others->json('data.0.id'));

        // Employee 1 should NOT see this in My Action while Employee 2 is working
        $emp1Pending = $this->actingAs($this->employee1)->getJson('/api/tasks?view=my_action');
        $emp1Pending->assertStatus(200);
        $this->assertEquals(0, count($emp1Pending->json('data')));

        // 2. Employee 2 submits work for review
        $task = Task::find($taskId);
        $branch = $task->branches()->where('owner_id', $this->employee2->id)->first();
        $this->actingAs($this->employee2)->postJson("/api/tasks/{$taskId}/submit", [
            'task_branch_id' => $branch->id,
            'description' => 'Work submitted for review',
        ]);

        // Now Employee 1 (creator/reviewer) must take review action -> Appears in Employee 1's Pending!
        $emp1PendingAfterSub = $this->actingAs($this->employee1)->getJson('/api/tasks?view=my_action');
        $this->assertEquals(1, count($emp1PendingAfterSub->json('data')));
        $this->assertEquals($taskId, $emp1PendingAfterSub->json('data.0.id'));

        // And it should no longer be in Employee 1's Pending with Others (since Employee 1 is the pending actor)
        $emp1OthersAfterSub = $this->actingAs($this->employee1)->getJson('/api/tasks?view=pending_with_others');
        $this->assertEquals(0, count($emp1OthersAfterSub->json('data')));
    }

    public function test_dashboard_and_reports_endpoints(): void
    {
        // Test Admin Dashboard
        $adminDash = $this->actingAs($this->admin)->getJson('/api/dashboard/admin');
        $adminDash->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_tasks',
                    'open_tasks',
                    'in_progress',
                    'pending_review',
                    'on_hold',
                    'overdue',
                    'returned',
                    'completed',
                    'tasks_by_status',
                    'tasks_by_department',
                    'employee_workload',
                    'recent_activity',
                    'upcoming_deadlines',
                ],
            ]);

        // Test Employee Dashboard
        $empDash = $this->actingAs($this->employee1)->getJson('/api/dashboard/employee');
        $empDash->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'my_action',
                    'assigned_to_me',
                    'my_created',
                    'my_collaborations',
                    'awaiting_review',
                    'returned_tasks',
                    'upcoming_tasks',
                    'tasks_by_status',
                    'recent_notifications',
                ],
            ]);

        // Test Reports Analytics
        $reports = $this->actingAs($this->admin)->getJson('/api/reports?range=last_30_days');
        $reports->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_tasks',
                    'completion_rate',
                    'overdue_count',
                    'completed_count',
                    'tasks_by_status',
                    'tasks_by_department',
                    'employee_workload',
                ],
            ]);
    }

    public function test_one_to_many_assignment_and_collaboration(): void
    {
        // 1. Create a task directly assigned to multiple employees (1 to many creation)
        $createRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Multi-assignee and Multi-collaborator Task',
            'description' => 'Testing 1-to-many capabilities',
            'handling_method' => 'assign',
            'assignees' => [$this->employee1->id, $this->employee2->id],
            'priority' => 'high',
        ]);
        $createRes->assertStatus(201);
        $taskId = $createRes->json('data.id');
        $branches = $createRes->json('data.branches');
        $this->assertCount(2, $branches);

        $ownerIds = collect($branches)->pluck('owner.id')->toArray();
        $this->assertContains($this->employee1->id, $ownerIds);
        $this->assertContains($this->employee2->id, $ownerIds);

        // 2. Add an additional assignee (1 to many expansion on existing task)
        $assignRes = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/assignees", [
            'user_ids' => [$this->subAdmin->id],
        ]);
        $assignRes->assertStatus(200);
        $updatedBranches = $assignRes->json('data.branches');
        $this->assertCount(3, $updatedBranches);

        // 3. Add multiple collaborators (1 to many)
        $collabRes = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/collaborators", [
            'user_ids' => [$this->employee1->id, $this->employee2->id],
        ]);
        $collabRes->assertStatus(200);
        $collaborators = $collabRes->json('data.collaborators');
        $this->assertNotEmpty($collaborators);
        $collabIds = collect($collaborators)->pluck('id')->toArray();
        $this->assertContains($this->employee1->id, $collabIds);
        $this->assertContains($this->employee2->id, $collabIds);
    }

    public function test_assign_single_person_and_reject_self_assignment(): void
    {
        // 1. Assign to self should fail with 422 validation error
        $selfAssignRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Self Assign Should Fail',
            'description' => 'Admin cannot assign to self under assign handling method',
            'handling_method' => 'assign',
            'assignees' => [$this->admin->id],
        ]);
        $selfAssignRes->assertStatus(422)
            ->assertJsonValidationErrors(['assignees']);

        // 2. Assigning single other employee succeeds cleanly
        $singleAssignRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Assign Single Employee Task',
            'description' => 'Admin assigning to single employee',
            'handling_method' => 'assign',
            'assignees' => [$this->employee1->id],
        ]);
        $singleAssignRes->assertStatus(201);
        $branches = $singleAssignRes->json('data.branches');
        $this->assertCount(1, $branches);
        $this->assertEquals($this->employee1->id, $branches[0]['owner']['id']);
        $this->assertEquals($this->employee1->id, $singleAssignRes->json('data.current_owner.id'));
    }
}
