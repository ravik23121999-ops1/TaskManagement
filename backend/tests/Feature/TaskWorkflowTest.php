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
            'due_date' => now()->addDays(7)->toDateString(),
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
            'due_date' => now()->addDays(7)->toDateString(),
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
            'due_date' => now()->addDays(7)->toDateString(),
            'branches' => [
                ['title' => 'Backend API', 'owner_id' => $this->employee1->id, 'due_date' => now()->addDays(7)->toDateString()],
                ['title' => 'Frontend UI', 'owner_id' => $this->employee2->id, 'due_date' => now()->addDays(7)->toDateString()],
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
            'due_date' => now()->addDays(7)->toDateString(),
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
            'due_date' => now()->addDays(7)->toDateString(),
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
            'due_date' => now()->addDays(7)->toDateString(),
            'assignees' => [$this->admin->id],
        ]);
        $selfAssignRes->assertStatus(422)
            ->assertJsonValidationErrors(['assignees']);

        // 2. Assigning single other employee succeeds cleanly
        $singleAssignRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Assign Single Employee Task',
            'description' => 'Admin assigning to single employee',
            'handling_method' => 'assign',
            'due_date' => now()->addDays(7)->toDateString(),
            'assignees' => [$this->employee1->id],
        ]);
        $singleAssignRes->assertStatus(201);
        $branches = $singleAssignRes->json('data.branches');
        $this->assertCount(1, $branches);
        $this->assertEquals($this->employee1->id, $branches[0]['owner']['id']);
        $this->assertEquals($this->employee1->id, $singleAssignRes->json('data.current_owner.id'));
        $this->assertCount(1, $singleAssignRes->json('data.current_owners'));

        // 3. Assigning multiple employees returns all active assignees as current_owners
        $multiAssignRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Assign Multiple Employees Task',
            'description' => 'Admin assigning to multiple employees',
            'handling_method' => 'assign',
            'due_date' => now()->addDays(7)->toDateString(),
            'assignees' => [$this->employee1->id, $this->employee2->id],
        ]);
        $multiAssignRes->assertStatus(201);
        $multiBranches = $multiAssignRes->json('data.branches');
        $this->assertCount(2, $multiBranches);
        $currentOwners = $multiAssignRes->json('data.current_owners');
        $this->assertCount(2, $currentOwners);
        $ownerIds = collect($currentOwners)->pluck('id')->all();
        $this->assertContains($this->employee1->id, $ownerIds);
        $this->assertContains($this->employee2->id, $ownerIds);
    }

    public function test_clarification_is_superseded_when_work_is_returned_for_revision(): void
    {
        // 1. Admin creates task assigned to Employee 1
        $createRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Clarification vs Return Test',
            'description' => 'Test clarification supersession by return',
            'handling_method' => 'assign',
            'due_date' => now()->addDays(7)->toDateString(),
            'assignees' => [$this->employee1->id],
        ]);
        $createRes->assertStatus(201);
        $taskId = $createRes->json('data.id');
        $branchId = $createRes->json('data.branches.0.id');

        // 2. Employee 1 requests missing details
        $clarifyRes = $this->actingAs($this->employee1)->postJson("/api/tasks/{$taskId}/request-details", [
            'question' => 'Sir please provide missing spec sheet',
            'branch_id' => $branchId,
        ]);
        $clarifyRes->assertStatus(200);

        // Check task resource as Admin: clarification active, can_provide_details = true
        $adminView1 = $this->actingAs($this->admin)->getJson("/api/tasks/{$taskId}")->json('data');
        $this->assertNotNull($adminView1['latest_clarification']);
        $this->assertTrue($adminView1['permissions']['can_provide_details']);

        // Check task resource as Employee 1: can_provide_details = false, can_submit = false
        $empView1 = $this->actingAs($this->employee1)->getJson("/api/tasks/{$taskId}")->json('data');
        $this->assertFalse($empView1['permissions']['can_provide_details']);
        $this->assertFalse($empView1['permissions']['can_submit']);

        // 3. Employee 1 submits work anyway (or after obtaining info)
        $submitRes = $this->actingAs($this->employee1)->postJson("/api/tasks/{$taskId}/submit", [
            'task_branch_id' => $branchId,
            'description' => 'Completed deliverable attached',
        ]);
        $submitRes->assertStatus(201);
        $submissionId = $submitRes->json('data.id');

        // Check task resource: status is review, clarification no longer active
        $adminView2 = $this->actingAs($this->admin)->getJson("/api/tasks/{$taskId}")->json('data');
        $this->assertEquals('review', $adminView2['status']);
        $this->assertNull($adminView2['latest_clarification']);
        $this->assertFalse($adminView2['permissions']['can_provide_details']);
        $this->assertTrue($adminView2['permissions']['can_review']);

        // 4. Admin returns the work for revision with notes
        $returnRes = $this->actingAs($this->admin)->postJson("/api/submissions/{$submissionId}/review", [
            'decision' => 'returned',
            'comments' => 'make it right - formulas are wrong',
        ]);
        $returnRes->assertStatus(201);

        // Check task resource as Admin:
        // - status is post_comment
        // - latest_clarification MUST BE NULL (old question is superseded!)
        // - latest_return MUST BE POPULATED with reviewer comments
        // - can_provide_details MUST BE FALSE for Admin
        // - can_submit MUST BE FALSE for Admin
        $adminView3 = $this->actingAs($this->admin)->getJson("/api/tasks/{$taskId}")->json('data');
        $this->assertEquals('post_comment', $adminView3['status']);
        $this->assertNull($adminView3['latest_clarification']);
        $this->assertNotNull($adminView3['latest_return']);
        $this->assertEquals('make it right - formulas are wrong', $adminView3['latest_return']['comments']);
        $this->assertFalse($adminView3['permissions']['can_provide_details']);
        $this->assertFalse($adminView3['permissions']['can_submit']);

        // Check task resource as Employee 1:
        // - latest_clarification MUST BE NULL
        // - latest_return MUST BE POPULATED
        // - can_submit MUST BE TRUE for Employee 1
        $empView3 = $this->actingAs($this->employee1)->getJson("/api/tasks/{$taskId}")->json('data');
        $this->assertNull($empView3['latest_clarification']);
        $this->assertNotNull($empView3['latest_return']);
        $this->assertTrue($empView3['permissions']['can_submit']);
        $this->assertFalse($empView3['permissions']['can_provide_details']);
    }

    public function test_searching_by_keyword_or_code_returns_matching_tasks_across_all_statuses_including_completed(): void
    {
        // Create an active task
        $activeTask = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Alpha Active Project',
            'description' => 'Active task in progress',
            'handling_method' => 'work_alone',
            'due_date' => now()->addDays(7)->toDateString(),
        ])->json('data');

        // Create a completed task
        $completedTask = \App\Models\Task::create([
            'title' => 'Build House Project',
            'description' => 'Completed construction initiative',
            'status' => 'completed',
            'handling_method' => 'work_alone',
            'due_date' => now()->addDays(7)->toDateString(),
            'creator_id' => $this->admin->id,
            'completed_at' => now(),
        ]);

        // 1. Browsing default list (without search query) hides completed tasks
        $browseRes = $this->actingAs($this->admin)->getJson('/api/tasks');
        $browseTitles = collect($browseRes->json('data'))->pluck('title')->all();
        $this->assertContains('Alpha Active Project', $browseTitles);
        $this->assertNotContains('Build House Project', $browseTitles);

        // 2. Searching by title keyword "Build House" finds the completed task immediately without needing explicit status
        $searchRes = $this->actingAs($this->admin)->getJson('/api/tasks?search=Build+House');
        $searchTitles = collect($searchRes->json('data'))->pluck('title')->all();
        $this->assertContains('Build House Project', $searchTitles);

        // 3. Searching by task code (e.g. T-00X) finds the task
        $code = sprintf('T-%03d', $completedTask->id);
        $searchCodeRes = $this->actingAs($this->admin)->getJson("/api/tasks?search={$code}");
        $codeTitles = collect($searchCodeRes->json('data'))->pluck('title')->all();
        $this->assertContains('Build House Project', $codeTitles);
    }

    public function test_multi_branch_task_can_complete_when_one_branch_is_cancelled(): void
    {
        // 1. Create task with 2 branches (Employee 1 & Employee 2)
        $createRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Multi Branch Cancel Test',
            'description' => 'Test completion when one branch is cancelled',
            'handling_method' => 'assign',
            'due_date' => now()->addDays(7)->toDateString(),
            'assignees' => [$this->employee1->id, $this->employee2->id],
        ]);
        $createRes->assertStatus(201);
        $taskId = $createRes->json('data.id');
        $branch1Id = $createRes->json('data.branches.0.id');
        $branch2Id = $createRes->json('data.branches.1.id');

        // 2. Employee 1 submits work, Admin approves it -> Branch 1 is completed
        $submitRes = $this->actingAs($this->employee1)->postJson("/api/tasks/{$taskId}/submit", [
            'task_branch_id' => $branch1Id,
            'description' => 'Deliverables for branch 1',
        ]);
        $subId = $submitRes->json('data.id');
        $this->actingAs($this->admin)->postJson("/api/submissions/{$subId}/review", [
            'decision' => 'approved',
            'comments' => 'Looks good',
        ])->assertStatus(201);

        // 3. Branch 2 is cancelled
        \App\Models\TaskBranch::find($branch2Id)->update(['status' => 'cancelled']);

        // Check task resource: all active branches completed should be true!
        $taskRes = $this->actingAs($this->admin)->getJson("/api/tasks/{$taskId}")->json('data');
        $this->assertTrue($taskRes['all_branches_completed']);

        // 4. Admin final signoff succeeds cleanly without being blocked by cancelled branch
        $finalRes = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/final-submit", [
            'description' => 'Final sign-off complete',
        ]);
        $finalRes->assertStatus(200);
        $this->assertEquals('completed', $finalRes->json('data.status'));
    }

    public function test_task_reopen_restores_active_workflow(): void
    {
        // Create and complete task with one completed branch and one revoked/cancelled branch
        $task = \App\Models\Task::create([
            'title' => 'Task to Reopen',
            'description' => 'Testing reopening',
            'status' => 'completed',
            'handling_method' => 'delegate',
            'creator_id' => $this->admin->id,
            'completed_at' => now(),
        ]);

        $completedBranch = $task->branches()->create([
            'title' => 'Completed Branch',
            'owner_id' => $this->employee1->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);
        $completedBranch->assignments()->create([
            'task_id' => $task->id,
            'assigned_by_id' => $this->admin->id,
            'assigned_to_id' => $this->employee1->id,
            'assigned_at' => now(),
            'is_current' => true,
        ]);

        $revokedBranch = $task->branches()->create([
            'title' => 'Revoked Branch',
            'owner_id' => $this->employee2->id,
            'status' => 'cancelled',
        ]);
        $revokedBranch->assignments()->create([
            'task_id' => $task->id,
            'assigned_by_id' => $this->admin->id,
            'assigned_to_id' => $this->employee2->id,
            'assigned_at' => now(),
            'is_current' => false, // revoked
        ]);

        // Non-admin non-creator cannot reopen
        $this->actingAs($this->employee1)->postJson("/api/tasks/{$task->id}/reopen")
            ->assertStatus(403);

        // Admin can reopen
        $reopenRes = $this->actingAs($this->admin)->postJson("/api/tasks/{$task->id}/reopen", [
            'reason' => 'Client requested additional scope',
        ]);
        $reopenRes->assertStatus(200);
        $this->assertEquals('in_progress', $reopenRes->json('data.status'));
        $this->assertNull($reopenRes->json('data.completed_at'));

        // Completed branch should now be in_progress
        $this->assertEquals('in_progress', $completedBranch->fresh()->status);
        $this->assertNull($completedBranch->fresh()->completed_at);

        // Revoked branch should REMAIN cancelled!
        $this->assertEquals('cancelled', $revokedBranch->fresh()->status);
    }

    public function test_status_guards_prevent_submissions_on_completed_or_held_tasks(): void
    {
        $completedTask = \App\Models\Task::create([
            'title' => 'Guarded Completed Task',
            'description' => 'Testing guards',
            'status' => 'completed',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
        ]);

        // Submit should be rejected
        $this->actingAs($this->admin)->postJson("/api/tasks/{$completedTask->id}/submit", [
            'description' => 'Attempted submission on completed task',
        ])->assertStatus(422);

        // Clarification should be rejected
        $this->actingAs($this->admin)->postJson("/api/tasks/{$completedTask->id}/request-details", [
            'question' => 'Attempted question on completed task',
        ])->assertStatus(422);
    }

    public function test_reassign_transfer_subtask_to_another_employee(): void
    {
        $task = Task::create([
            'title' => 'Multi-branch reassign test',
            'description' => 'Desc',
            'handling_method' => 'assign',
            'creator_id' => $this->admin->id,
            'status' => 'in_progress',
        ]);

        $branch = \App\Models\TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'Backend API Subtask',
            'owner_id' => $this->employee1->id,
            'status' => 'in_progress',
        ]);

        $branch->assignments()->create([
            'assigned_to_id' => $this->employee1->id,
            'assigned_by_id' => $this->admin->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // Transfer from Employee 1 to Employee 2
        $transferRes = $this->actingAs($this->admin)->postJson("/api/task-branches/{$branch->id}/transfer", [
            'new_owner_id' => $this->employee2->id,
            'reason' => 'Employee 1 has personal emergency leave',
        ]);
        $transferRes->assertStatus(200);

        $branch->refresh();
        $this->assertEquals($this->employee2->id, $branch->owner_id);

        // Verify assignment records
        $currentAssignment = $branch->assignments()->where('is_current', true)->first();
        $this->assertNotNull($currentAssignment);
        $this->assertEquals($this->employee2->id, $currentAssignment->assigned_to_id);

        $oldAssignment = $branch->assignments()->where('assigned_to_id', $this->employee1->id)->first();
        $this->assertFalse((bool) $oldAssignment->is_current);

        // Verify status history
        $this->assertTrue(
            \App\Models\TaskStatusHistory::where('task_branch_id', $branch->id)
                ->where('reason', 'like', '%personal emergency leave%')
                ->exists()
        );
    }

    public function test_reassign_cancel_subtask_assignment(): void
    {
        $task = Task::create([
            'title' => 'Cancel assignment test',
            'description' => 'Desc',
            'handling_method' => 'assign',
            'creator_id' => $this->admin->id,
            'status' => 'in_progress',
        ]);

        $branch = \App\Models\TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'UI Subtask to cancel',
            'owner_id' => $this->employee1->id,
            'status' => 'in_progress',
        ]);

        // Cancel / withdraw assignment
        $cancelRes = $this->actingAs($this->admin)->postJson("/api/task-branches/{$branch->id}/cancel-assignment", [
            'reason' => 'Assignee unavailable, withdrawing assignment',
        ]);
        $cancelRes->assertStatus(200);

        $branch->refresh();
        $this->assertEquals('cancelled', $branch->status);
    }

    public function test_reassign_unauthorized_user_forbidden(): void
    {
        $task = Task::create([
            'title' => 'Unauthorized reassign test',
            'description' => 'Desc',
            'handling_method' => 'assign',
            'creator_id' => $this->admin->id,
            'status' => 'in_progress',
        ]);

        $branch = \App\Models\TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'Subtask',
            'owner_id' => $this->employee1->id,
            'status' => 'in_progress',
        ]);

        // Employee 2 is not admin, creator, or assigner -> 403 Forbidden!
        $this->actingAs($this->employee2)->postJson("/api/task-branches/{$branch->id}/transfer", [
            'new_owner_id' => $this->employee1->id,
        ])->assertStatus(403);

        $this->actingAs($this->employee2)->postJson("/api/task-branches/{$branch->id}/cancel-assignment", [
            'reason' => 'Malicious cancel',
        ])->assertStatus(403);
    }

    public function test_cannot_update_completed_task(): void
    {
        $task = Task::create([
            'title' => 'Completed Task Protection',
            'description' => 'Original description',
            'status' => 'completed',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
            'completed_at' => now(),
        ]);

        $res = $this->actingAs($this->admin)->putJson("/api/tasks/{$task->id}", [
            'title' => 'Attempted Edit on Completed Task',
        ]);

        $res->assertStatus(422);
    }

    public function test_export_reports_csv(): void
    {
        $res = $this->actingAs($this->admin)->get('/api/reports/export-csv');
        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    public function test_soft_deleted_user_relations(): void
    {
        $employee = \App\Models\User::factory()->create(['role' => 'employee']);
        $task = Task::create([
            'title' => 'Task with Deleted Creator',
            'description' => 'Testing withTrashed',
            'status' => 'in_progress',
            'handling_method' => 'work_alone',
            'creator_id' => $employee->id,
        ]);

        // Soft delete the creator
        $employee->delete();

        $freshTask = Task::find($task->id);
        $this->assertNotNull($freshTask->creator);
        $this->assertEquals($employee->name, $freshTask->creator->name);
    }

    public function test_task_assigned_mail_generation(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $task = Task::create([
            'title' => 'Mail Test Task',
            'description' => 'Testing email dispatch',
            'status' => 'in_progress',
            'handling_method' => 'assign',
            'creator_id' => $this->admin->id,
        ]);

        \App\Mail\TaskAssignedMail::safeSend($task, $this->employee1, $this->admin, null, 'Test Note', 'new_assignment');

        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\TaskAssignedMail::class);
    }

    public function test_can_final_submit_when_other_branch_is_cancelled(): void
    {
        $task = Task::create([
            'title' => 'Task with Completed and Cancelled Branches',
            'description' => 'Testing can_final_submit',
            'status' => 'review',
            'handling_method' => 'assign',
            'creator_id' => $this->admin->id,
        ]);

        $b1 = \App\Models\TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'Branch 1',
            'owner_id' => $this->employee1->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $b2 = \App\Models\TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'Branch 2',
            'owner_id' => $this->employee2->id,
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/tasks/{$task->id}");
        $res->assertStatus(200);
        $this->assertTrue($res->json('data.permissions.can_final_submit'));

        // Progress summary should only count active branches in total
        $summary = $res->json('data.progress_summary');
        $this->assertEquals(1, $summary['total']); // 1 active branch (excluding cancelled)
        $this->assertEquals(1, $summary['completed']);
        $this->assertEquals(1, $summary['cancelled']);
        $this->assertEquals(100, $res->json('data.progress')); // 1 completed out of 1 active = 100%

        // When a third active branch is added (e.g. newly assigned employee)
        $task->update(['status' => 'in_progress']);
        $b3 = \App\Models\TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'Branch 3',
            'owner_id' => $this->subAdmin->id,
            'status' => 'in_progress',
        ]);

        $resWith3 = $this->actingAs($this->admin)->getJson("/api/tasks/{$task->id}");
        $summaryWith3 = $resWith3->json('data.progress_summary');
        $this->assertEquals(2, $summaryWith3['total']); // 2 active branches (1 completed + 1 in_progress)
        $this->assertEquals(1, $summaryWith3['completed']);
        $this->assertEquals(1, $summaryWith3['in_progress']);
        $this->assertEquals(1, $summaryWith3['cancelled']);
        $this->assertEquals(50, $resWith3->json('data.progress')); // 1 / 2 = 50%
        $this->assertFalse($resWith3->json('data.permissions.can_final_submit'));

        // Can also reassign the cancelled branch to another employee
        $reassignRes = $this->actingAs($this->admin)->postJson("/api/task-branches/{$b2->id}/transfer", [
            'new_owner_id' => $this->employee1->id,
            'reason' => 'Reviving cancelled branch with new owner',
        ]);
        $reassignRes->assertStatus(200);
        $b2->refresh();
        $this->assertEquals($this->employee1->id, $b2->owner_id);
        $this->assertEquals('in_progress', $b2->status);
    }

    public function test_return_for_correction_sends_email_notification(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $task = Task::create([
            'title' => 'Email Correction Test',
            'description' => 'Test returning deliverable email',
            'status' => 'in_progress',
            'handling_method' => 'delegate',
            'creator_id' => $this->admin->id,
        ]);

        $branch = $task->branches()->create([
            'title' => 'Feature Implementation',
            'owner_id' => $this->employee1->id,
            'status' => 'review',
        ]);
        $branch->assignments()->create([
            'task_id' => $task->id,
            'assigned_by_id' => $this->admin->id,
            'assigned_to_id' => $this->employee1->id,
            'assigned_at' => now(),
            'is_current' => true,
        ]);

        $submission = $task->submissions()->create([
            'task_branch_id' => $branch->id,
            'submitted_by_id' => $this->employee1->id,
            'description' => 'First attempt deliverable',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/submissions/{$submission->id}/review", [
            'decision' => 'returned',
            'comments' => 'Please add unit test coverage and resubmit.',
        ]);
        $response->assertStatus(201);

        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\TaskAssignedMail::class, function ($mail) {
            return $mail->type === 'returned_for_correction'
                && $mail->assignee->id === $this->employee1->id
                && str_contains($mail->note, 'Please add unit test coverage');
        });
    }

    public function test_task_final_completion_sends_email_notification(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $task = Task::create([
            'title' => 'Task For Final Complete Mail',
            'description' => 'Testing completion email',
            'status' => 'review',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
        ]);

        $branch = $task->branches()->create([
            'title' => 'Main Scope',
            'owner_id' => $this->employee1->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $res = $this->actingAs($this->admin)->postJson("/api/tasks/{$task->id}/final-submit", [
            'description' => 'All milestones approved with excellence.',
        ]);
        $res->assertStatus(200);

        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\TaskAssignedMail::class, function ($mail) {
            return $mail->type === 'task_completed'
                && $mail->assignee->id === $this->employee1->id
                && str_contains($mail->note, 'All milestones approved with excellence');
        });
    }

    public function test_delegated_task_is_not_in_creator_upcoming_tasks_or_assigned_to_me(): void
    {
        // Employee 1 creates a task and delegates it to Employee 2
        $task = Task::create([
            'title' => 'Delegated Payment Task',
            'description' => 'Payment processing',
            'status' => 'in_progress',
            'handling_method' => 'assign',
            'creator_id' => $this->employee1->id,
            'due_date' => now()->addDays(3),
        ]);

        $branch = $task->branches()->create([
            'title' => 'Process Payment',
            'owner_id' => $this->employee2->id,
            'status' => 'in_progress',
            'due_date' => now()->addDays(3),
        ]);
        $branch->assignments()->create([
            'task_id' => $task->id,
            'assigned_by_id' => $this->employee1->id,
            'assigned_to_id' => $this->employee2->id,
            'assigned_at' => now(),
            'is_current' => true,
        ]);

        // Employee 1 checks dashboard:
        // 1. Assigned to me should be 0 (since task was delegated to Employee 2)
        // 2. Upcoming tasks should be empty (Employee 1 has no milestone to deliver)
        // 3. My Initiated tasks should be 1
        $dashRes = $this->actingAs($this->employee1)->getJson('/api/dashboard/employee');
        $dashRes->assertStatus(200);

        $this->assertEquals(0, $dashRes->json('data.assigned_to_me'));
        $this->assertEquals(0, count($dashRes->json('data.upcoming_tasks')));
        $this->assertEquals(1, $dashRes->json('data.my_created'));

        // Employee 2 checks dashboard:
        // Assigned to me should be 1, and Upcoming tasks should contain the task!
        $dashRes2 = $this->actingAs($this->employee2)->getJson('/api/dashboard/employee');
        $dashRes2->assertStatus(200);

        $this->assertEquals(1, $dashRes2->json('data.assigned_to_me'));
        $this->assertEquals(1, count($dashRes2->json('data.upcoming_tasks')));
        $this->assertEquals('Delegated Payment Task', $dashRes2->json('data.upcoming_tasks.0.title'));

        // Tasks API with view=assigned_to_me:
        // Employee 1 has 0
        $emp1Tasks = $this->actingAs($this->employee1)->getJson('/api/tasks?view=assigned_to_me');
        $emp1Tasks->assertStatus(200);
        $this->assertEquals(0, count($emp1Tasks->json('data')));

        // Employee 2 has 1
        $emp2Tasks = $this->actingAs($this->employee2)->getJson('/api/tasks?view=assigned_to_me');
        $emp2Tasks->assertStatus(200);
        $this->assertEquals(1, count($emp2Tasks->json('data')));
    }

    public function test_due_date_is_strictly_mandatory_for_parent_and_all_subtasks(): void
    {
        // 1. Creating task without due_date must fail with 422
        $resWithoutDue = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Missing Due Date Task',
            'description' => 'Should be rejected',
            'handling_method' => 'work_alone',
        ]);
        $resWithoutDue->assertStatus(422)
            ->assertJsonValidationErrors(['due_date']);

        // 2. Creating subtasks without due_date must fail with 422
        $resSubtaskWithoutDue = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Task With Subtasks',
            'description' => 'Subtask missing due date',
            'handling_method' => 'assign',
            'due_date' => now()->addDays(5)->toDateString(),
            'branches' => [
                [
                    'owner_id' => $this->employee1->id,
                    'title' => 'Subtask 1',
                    'description' => 'Missing branch due date',
                ],
            ],
        ]);
        $resSubtaskWithoutDue->assertStatus(422)
            ->assertJsonValidationErrors(['branches.0.due_date']);

        // 3. Subtask due_date later than parent due_date must fail with 422
        $resSubtaskExceedsDue = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Task With Exceeded Subtask Deadline',
            'description' => 'Subtask due date exceeds parent',
            'handling_method' => 'assign',
            'due_date' => now()->addDays(3)->toDateString(),
            'branches' => [
                [
                    'owner_id' => $this->employee1->id,
                    'title' => 'Subtask 1',
                    'description' => 'Due date too late',
                    'due_date' => now()->addDays(10)->toDateString(),
                ],
            ],
        ]);
        $resSubtaskExceedsDue->assertStatus(422)
            ->assertJsonValidationErrors(['branches.0.due_date']);
    }

    public function test_collaborations_view_visibility_for_creator_inviter_and_collaborator(): void
    {
        // 1. Admin creates a task assigned to Employee 1
        $createRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Collaborative Assigned Deliverable',
            'description' => 'Testing visibility in My Collaborations tab',
            'handling_method' => 'assign',
            'priority' => 'high',
            'due_date' => now()->addDays(5)->toDateString(),
            'branches' => [
                [
                    'owner_id' => $this->employee1->id,
                    'title' => 'Core Branch Execution',
                    'description' => 'Primary work stream',
                    'due_date' => now()->addDays(4)->toDateString(),
                ],
            ],
        ]);
        $createRes->assertStatus(201);
        $taskId = $createRes->json('data.id');

        // 2. Admin invites Employee 2 as a collaborator
        $collabRes = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/collaborators", [
            'user_ids' => [$this->employee2->id],
        ]);
        $collabRes->assertStatus(200);

        // 3. Admin (Creator & Inviter) views collaborations -> Task MUST be visible!
        $adminView = $this->actingAs($this->admin)->getJson('/api/tasks?view=collaborations');
        $adminView->assertStatus(200);
        $this->assertTrue(collect($adminView->json('data'))->contains('id', $taskId), 'Admin/Creator must see collaborative task in view=collaborations');

        // 4. Employee 1 (Branch Owner) views collaborations -> Task MUST be visible!
        $emp1View = $this->actingAs($this->employee1)->getJson('/api/tasks?view=collaborations');
        $emp1View->assertStatus(200);
        $this->assertTrue(collect($emp1View->json('data'))->contains('id', $taskId), 'Branch owner must see collaborative task in view=collaborations');

        // 5. Employee 2 (Invited Collaborator) views collaborations -> Task MUST be visible!
        $emp2View = $this->actingAs($this->employee2)->getJson('/api/tasks?view=collaborations');
        $emp2View->assertStatus(200);
        $this->assertTrue(collect($emp2View->json('data'))->contains('id', $taskId), 'Invited collaborator must see task in view=collaborations');

        // 6. Check Employee 2 Dashboard reflects collaboration count
        $emp2Dash = $this->actingAs($this->employee2)->getJson('/api/dashboard/employee');
        $emp2Dash->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $emp2Dash->json('data.my_collaborations'), 'Employee 2 dashboard should count this collaboration');

        // 7. Non-involved employee should NOT see this collaborative task
        $unrelatedEmp = User::create([
            'name' => 'Unrelated Employee',
            'email' => 'unrelated@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);
        $unrelatedView = $this->actingAs($unrelatedEmp)->getJson('/api/tasks?view=collaborations');
        $unrelatedView->assertStatus(200);
        $this->assertFalse(collect($unrelatedView->json('data'))->contains('id', $taskId), 'Unrelated employee must not see the private collaboration');
    }

    public function test_collaborator_submission_and_creator_approval(): void
    {
        // 1. Admin creates a task with subtask assigned to Employee 1
        $createRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Path B Collaborative Deliverables Project',
            'description' => 'Joint project with collaborators',
            'handling_method' => 'collaborate',
            'due_date' => now()->addDays(5)->toDateString(),
            'branches' => [
                [
                    'title' => 'Initial Subtask',
                    'owner_id' => $this->employee1->id,
                    'due_date' => now()->addDays(5)->toDateString(),
                ],
            ],
        ]);
        $createRes->assertStatus(201);
        $taskId = $createRes->json('data.id');
        $branchId = $createRes->json('data.branches.0.id');

        // 2. Creator invites Employee 2 as a collaborator
        $collabRes = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/collaborators", [
            'user_ids' => [$this->employee2->id],
        ]);
        $collabRes->assertStatus(200);

        // 3. Employee 1's branch is cancelled by admin (simulating T-028 condition where only collaborator remains)
        $cancelBranchRes = $this->actingAs($this->admin)->postJson("/api/task-branches/{$branchId}/cancel-assignment", [
            'reason' => 'Subtask cancelled in favor of direct collaboration',
        ]);
        $cancelBranchRes->assertStatus(200);

        // 4. Employee 2 (Collaborator) views task:
        // - Must have can_submit = true
        // - Must show in view=my_action
        // - Must NOT show in view=pending_with_others
        $emp2Task = $this->actingAs($this->employee2)->getJson("/api/tasks/{$taskId}");
        $emp2Task->assertStatus(200);
        $this->assertTrue($emp2Task->json('data.permissions.can_submit'), 'Collaborator must have can_submit permission');

        $emp2MyAction = $this->actingAs($this->employee2)->getJson('/api/tasks?view=my_action');
        $emp2MyAction->assertStatus(200);
        $this->assertTrue(collect($emp2MyAction->json('data'))->contains('id', $taskId), 'Collaborator must see task in my_action');

        $emp2Pending = $this->actingAs($this->employee2)->getJson('/api/tasks?view=pending_with_others');
        $emp2Pending->assertStatus(200);
        $this->assertFalse(collect($emp2Pending->json('data'))->contains('id', $taskId), 'Collaborator must not see task in pending_with_others');

        // 5. Collaborator submits deliverables
        $submitRes = $this->actingAs($this->employee2)->postJson("/api/tasks/{$taskId}/submit", [
            'description' => 'Completed all collaborative deliverables with files and documentation.',
        ]);
        $submitRes->assertStatus(201);
        $submissionId = $submitRes->json('data.id');

        // 6. Task moves to review status
        $taskAfterSubmit = $this->actingAs($this->admin)->getJson("/api/tasks/{$taskId}");
        $taskAfterSubmit->assertStatus(200);
        $this->assertEquals('review', $taskAfterSubmit->json('data.status'));
        $this->assertTrue($taskAfterSubmit->json('data.permissions.can_review'), 'Creator must have can_review permission');

        // Creator sees task in view=review
        $creatorReviewQueue = $this->actingAs($this->admin)->getJson('/api/tasks?view=review');
        $creatorReviewQueue->assertStatus(200);
        $this->assertTrue(collect($creatorReviewQueue->json('data'))->contains('id', $taskId), 'Creator must see task in review queue');

        // 7. Creator approves the collaborator submission
        $reviewRes = $this->actingAs($this->admin)->postJson("/api/submissions/{$submissionId}/review", [
            'decision' => 'approved',
            'comments' => 'Excellent work on the collaborative deliverables!',
        ]);
        $reviewRes->assertStatus(201);

        // 8. Task is ready for final sign-off by creator
        $taskAfterApproval = $this->actingAs($this->admin)->getJson("/api/tasks/{$taskId}");
        $taskAfterApproval->assertStatus(200);
        $this->assertTrue($taskAfterApproval->json('data.permissions.can_final_submit'), 'Creator must have can_final_submit permission');

        // 9. Creator performs final completion
        $finalRes = $this->actingAs($this->admin)->postJson("/api/tasks/{$taskId}/final-submit", [
            'description' => 'Task verified, accepted, and completed.',
        ]);
        $finalRes->assertStatus(200);
        $this->assertEquals('completed', $finalRes->json('data.status'));
    }

    public function test_completed_tasks_method_filtering(): void
    {
        // 1. Create a completed solo task
        $soloTask = \App\Models\Task::create([
            'title' => 'Completed Solo Task',
            'description' => 'Solo work',
            'handling_method' => 'work_alone',
            'priority' => 'low',
            'status' => 'completed',
            'completed_at' => now(),
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
        ]);

        // 2. Create a completed team task
        $teamTask = \App\Models\Task::create([
            'title' => 'Completed Team Task',
            'description' => 'Team work',
            'handling_method' => 'assign',
            'priority' => 'medium',
            'status' => 'completed',
            'completed_at' => now(),
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
        ]);
        $teamBranch = $teamTask->branches()->create([
            'title' => 'Team Subtask',
            'owner_id' => $this->employee1->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // 3. Create a completed collaborative task
        $collabTask = \App\Models\Task::create([
            'title' => 'Completed Collaboration Task',
            'description' => 'Collaborative work',
            'handling_method' => 'collaborate',
            'priority' => 'high',
            'status' => 'completed',
            'completed_at' => now(),
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
        ]);
        $collabBranch = $collabTask->branches()->create([
            'title' => 'Collab Branch',
            'owner_id' => $this->admin->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);
        $collabBranch->collaborators()->create([
            'user_id' => $this->employee2->id,
            'invited_by_id' => $this->admin->id,
            'invited_at' => now(),
        ]);

        // 4. GET /api/tasks?view=completed (All) -> Contains all 3 tasks and has method_counts
        $allRes = $this->actingAs($this->admin)->getJson('/api/tasks?view=completed');
        $allRes->assertStatus(200);
        $allIds = collect($allRes->json('data'))->pluck('id')->all();
        $this->assertContains($soloTask->id, $allIds);
        $this->assertContains($teamTask->id, $allIds);
        $this->assertContains($collabTask->id, $allIds);

        $counts = $allRes->json('meta.method_counts');
        $this->assertNotNull($counts);
        $this->assertGreaterThanOrEqual(1, $counts['solo']);
        $this->assertGreaterThanOrEqual(1, $counts['team']);
        $this->assertGreaterThanOrEqual(1, $counts['collaboration']);
        $this->assertGreaterThanOrEqual(3, $counts['all']);

        // 5. GET /api/tasks?view=completed&handling_method=solo
        $soloRes = $this->actingAs($this->admin)->getJson('/api/tasks?view=completed&handling_method=solo');
        $soloRes->assertStatus(200);
        $soloIds = collect($soloRes->json('data'))->pluck('id')->all();
        $this->assertContains($soloTask->id, $soloIds);
        $this->assertNotContains($teamTask->id, $soloIds);
        $this->assertNotContains($collabTask->id, $soloIds);

        // 6. GET /api/tasks?view=completed&handling_method=team
        $teamRes = $this->actingAs($this->admin)->getJson('/api/tasks?view=completed&handling_method=team');
        $teamRes->assertStatus(200);
        $teamIds = collect($teamRes->json('data'))->pluck('id')->all();
        $this->assertContains($teamTask->id, $teamIds);
        $this->assertNotContains($soloTask->id, $teamIds);
        $this->assertNotContains($collabTask->id, $teamIds);

        // 7. GET /api/tasks?view=completed&handling_method=collaboration
        $collabFilterRes = $this->actingAs($this->admin)->getJson('/api/tasks?view=completed&handling_method=collaboration');
        $collabFilterRes->assertStatus(200);
        $collabIds = collect($collabFilterRes->json('data'))->pluck('id')->all();
        $this->assertContains($collabTask->id, $collabIds);
        $this->assertNotContains($soloTask->id, $collabIds);
        $this->assertNotContains($teamTask->id, $collabIds);
    }
}
