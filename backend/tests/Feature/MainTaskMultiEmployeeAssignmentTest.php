<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class MainTaskMultiEmployeeAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;
    protected User $rohit;
    protected User $aman;
    protected Department $department;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->department = Department::create([
            'name' => 'Engineering',
            'code' => 'ENG',
            'is_active' => true,
        ]);

        $this->manager = User::factory()->create([
            'name' => 'Manager Priya',
            'email' => 'priya.manager@quicklifenow.com',
            'role' => 'sub_admin',
            'department_id' => $this->department->id,
        ]);

        $this->rohit = User::factory()->create([
            'name' => 'Rohit Mehta',
            'email' => 'rohit.mehta@quicklifenow.com',
            'role' => 'employee',
            'department_id' => $this->department->id,
        ]);

        $this->aman = User::factory()->create([
            'name' => 'Aman Verma',
            'email' => 'aman.verma@quicklifenow.com',
            'role' => 'employee',
            'department_id' => $this->department->id,
        ]);
    }

    public function test_manager_can_create_main_task_with_shared_attachments_and_individual_allocations(): array
    {
        $sharedPdf = UploadedFile::fake()->create('Project_Overview.pdf', 500, 'application/pdf');
        $rohitPdf = UploadedFile::fake()->create('Backend_Requirements.pdf', 300, 'application/pdf');
        $amanPdf = UploadedFile::fake()->create('UI_Design.pdf', 400, 'application/pdf');

        $response = $this->actingAs($this->manager, 'sanctum')->post('/api/tasks', [
            'title' => 'Develop Employee Management Module',
            'description' => 'Comprehensive core module for enterprise workforce records.',
            'handling_method' => 'assign',
            'priority' => 'high',
            'department_id' => $this->department->id,
            'due_date' => '2026-11-10',
            'shared_files' => [$sharedPdf],
            'assignees' => [$this->rohit->id, $this->aman->id],
            'branches' => [
                [
                    'owner_id' => $this->rohit->id,
                    'title' => 'Create Employee API',
                    'description' => 'Develop employee CRUD APIs with validation and authentication.',
                    'expected_result' => 'Working API endpoints.',
                    'acceptance_criteria' => 'All required endpoints must pass testing.',
                    'due_date' => '2026-11-02',
                    'files' => [$rohitPdf],
                ],
                [
                    'owner_id' => $this->aman->id,
                    'title' => 'Create Employee UI',
                    'description' => 'Develop a responsive employee management interface.',
                    'expected_result' => 'Functional employee management UI.',
                    'acceptance_criteria' => 'All forms must validate correctly.',
                    'due_date' => '2026-11-04',
                    'files' => [$amanPdf],
                ],
            ],
        ]);

        $response->assertStatus(201);
        $taskId = $response->json('data.id');
        $this->assertNotNull($taskId);

        return [
            'taskId' => $taskId,
            'rohitPdfName' => 'Backend_Requirements.pdf',
            'amanPdfName' => 'UI_Design.pdf',
            'sharedPdfName' => 'Project_Overview.pdf',
        ];
    }

    public function test_employee_can_only_view_their_assignment_and_cannot_download_peer_files()
    {
        $taskData = $this->test_manager_can_create_main_task_with_shared_attachments_and_individual_allocations();
        $taskId = $taskData['taskId'];

        // Manager inspection to get attachment IDs
        $managerRes = $this->actingAs($this->manager, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $managerRes->assertStatus(200);

        $attachments = $managerRes->json('data.attachments');
        $this->assertCount(3, $attachments);

        $sharedAtt = collect($attachments)->firstWhere('file_name', 'Project_Overview.pdf');
        $rohitAtt = collect($attachments)->firstWhere('file_name', 'Backend_Requirements.pdf');
        $amanAtt = collect($attachments)->firstWhere('file_name', 'UI_Design.pdf');

        $this->assertNotNull($sharedAtt);
        $this->assertNotNull($rohitAtt);
        $this->assertNotNull($amanAtt);

        // 1. Rohit Mehta logs in
        $rohitRes = $this->actingAs($this->rohit, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $rohitRes->assertStatus(200);

        // Rohit sees my_branch with his specific subtask details
        $myBranch = $rohitRes->json('data.my_branch');
        $this->assertNotNull($myBranch);
        $this->assertEquals('Create Employee API', $myBranch['title']);
        $this->assertEquals('Develop employee CRUD APIs with validation and authentication.', $myBranch['description']);
        $this->assertEquals('Working API endpoints.', $myBranch['expected_result']);
        $this->assertEquals('All required endpoints must pass testing.', $myBranch['acceptance_criteria']);

        // Strict Peer Isolation: Rohit does NOT see Aman's branch in branches list
        $visibleBranches = $rohitRes->json('data.branches');
        $this->assertCount(1, $visibleBranches);
        $this->assertEquals('Create Employee API', $visibleBranches[0]['title']);

        // Attachments visible to Rohit: ONLY Rohit's subtask attachment (main task shared doc and Aman's attachment MUST NOT be in array)
        $rohitVisibleAtts = $rohitRes->json('data.attachments');
        $rohitAttNames = collect($rohitVisibleAtts)->pluck('file_name')->all();
        $this->assertNotContains('Project_Overview.pdf', $rohitAttNames);
        $this->assertContains('Backend_Requirements.pdf', $rohitAttNames);
        $this->assertNotContains('UI_Design.pdf', $rohitAttNames);

        // URL Security: Rohit tries to download Aman's file -> 403 Forbidden!
        $downloadAmanAttempt = $this->actingAs($this->rohit, 'sanctum')->get("/api/attachments/{$amanAtt['id']}/download");
        $downloadAmanAttempt->assertStatus(403);

        // URL Security: Rohit tries to download main task Shared file -> 403 Forbidden (he only has a subtask)!
        $downloadShared = $this->actingAs($this->rohit, 'sanctum')->get("/api/attachments/{$sharedAtt['id']}/download");
        $downloadShared->assertStatus(403);

        // URL Security: Rohit downloads his own file -> 200 OK!
        $downloadRohitOwn = $this->actingAs($this->rohit, 'sanctum')->get("/api/attachments/{$rohitAtt['id']}/download");
        $downloadRohitOwn->assertStatus(200);

        // 2. Aman Verma logs in
        $amanRes = $this->actingAs($this->aman, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $amanRes->assertStatus(200);

        $amanBranch = $amanRes->json('data.my_branch');
        $this->assertNotNull($amanBranch);
        $this->assertEquals('Create Employee UI', $amanBranch['title']);
        $this->assertEquals('Functional employee management UI.', $amanBranch['expected_result']);

        // Aman tries to download Rohit's file -> 403 Forbidden!
        $downloadRohitAttempt = $this->actingAs($this->aman, 'sanctum')->get("/api/attachments/{$rohitAtt['id']}/download");
        $downloadRohitAttempt->assertStatus(403);

        // Aman downloads his own file -> 200 OK!
        $downloadAmanOwn = $this->actingAs($this->aman, 'sanctum')->get("/api/attachments/{$amanAtt['id']}/download");
        $downloadAmanOwn->assertStatus(200);
    }

    public function test_manager_sees_all_branches_progress_summary_and_can_download_all_files()
    {
        $taskData = $this->test_manager_can_create_main_task_with_shared_attachments_and_individual_allocations();
        $taskId = $taskData['taskId'];

        $managerRes = $this->actingAs($this->manager, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $managerRes->assertStatus(200);

        // Manager sees progress summary
        $summary = $managerRes->json('data.progress_summary');
        $this->assertNotNull($summary);
        $this->assertEquals(2, $summary['total']);
        $this->assertEquals(2, $summary['pending']);
        $this->assertEquals(0, $summary['completed']);

        // Manager sees both branches
        $branches = $managerRes->json('data.branches');
        $this->assertCount(2, $branches);

        // Manager can download all attachments
        $attachments = $managerRes->json('data.attachments');
        foreach ($attachments as $att) {
            $dlRes = $this->actingAs($this->manager, 'sanctum')->get("/api/attachments/{$att['id']}/download");
            $dlRes->assertStatus(200);
        }
    }

    public function test_independent_submissions_and_reviews_update_aggregated_progress()
    {
        $taskData = $this->test_manager_can_create_main_task_with_shared_attachments_and_individual_allocations();
        $taskId = $taskData['taskId'];

        $rohitTaskRes = $this->actingAs($this->rohit, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $rohitBranchId = $rohitTaskRes->json('data.my_branch.id');

        // Rohit starts working on his branch
        $startRes = $this->actingAs($this->rohit, 'sanctum')->putJson("/api/task-branches/{$rohitBranchId}", [
            'status' => 'in_progress',
        ]);
        $startRes->assertStatus(200);

        // Rohit submits deliverable for his branch
        $subRes = $this->actingAs($this->rohit, 'sanctum')->postJson("/api/tasks/{$taskId}/submit", [
            'task_branch_id' => $rohitBranchId,
            'description' => 'Employee CRUD API endpoints completed and verified with unit tests.',
        ]);
        $subRes->assertStatus(201);
        $submissionId = $subRes->json('data.id');

        // Check manager's progress summary: 1 pending review, 1 pending
        $managerRes = $this->actingAs($this->manager, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $summary = $managerRes->json('data.progress_summary');
        $this->assertEquals(2, $summary['total']);
        $this->assertEquals(1, $summary['pending_review']);
        $this->assertEquals(1, $summary['pending']);

        // Manager reviews and approves Rohit's branch
        $revRes = $this->actingAs($this->manager, 'sanctum')->postJson("/api/submissions/{$submissionId}/review", [
            'decision' => 'approved',
            'comments' => 'APIs meet all acceptance criteria. Great job!',
        ]);
        $revRes->assertStatus(201);

        // Manager checks progress again: 1 completed, 1 pending
        $managerResAfter = $this->actingAs($this->manager, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $summaryAfter = $managerResAfter->json('data.progress_summary');
        $this->assertEquals(1, $summaryAfter['completed']);
        $this->assertEquals(1, $summaryAfter['pending']);
        $this->assertEquals(50, $managerResAfter->json('data.progress'));
    }

    public function test_assignee_can_assign_further_with_new_note_attachments_and_share_previous_toggled()
    {
        $taskData = $this->test_manager_can_create_main_task_with_shared_attachments_and_individual_allocations();
        $taskId = $taskData['taskId'];

        $neha = User::factory()->create([
            'name' => 'Neha Gupta',
            'email' => 'neha.gupta@quicklifenow.com',
            'role' => 'employee',
            'department_id' => $this->department->id,
        ]);

        $vikas = User::factory()->create([
            'name' => 'Vikas Kumar',
            'email' => 'vikas.kumar@quicklifenow.com',
            'role' => 'employee',
            'department_id' => $this->department->id,
        ]);

        $jwtPdf = UploadedFile::fake()->create('JWT_Specs.pdf', 250, 'application/pdf');
        $loggingPdf = UploadedFile::fake()->create('Logging_Guide.pdf', 180, 'application/pdf');

        // Rohit Mehta assigns further to Neha (share_previous = true) and Vikas (share_previous = false)
        $assignResponse = $this->actingAs($this->rohit, 'sanctum')->post("/api/tasks/{$taskId}/assignees", [
            'user_ids' => [$neha->id, $vikas->id],
            'branches' => [
                [
                    'owner_id' => $neha->id,
                    'mode' => 'new_subtask',
                    'title' => 'Subtask - JWT Validation',
                    'description' => 'Neha, implement JWT validation and route protection.',
                    'expected_result' => 'Protected API endpoints with token verification.',
                    'share_previous_branch_details' => true,
                    'files' => [$jwtPdf],
                ],
                [
                    'owner_id' => $vikas->id,
                    'mode' => 'new_subtask',
                    'title' => 'Subtask - Logging Utility',
                    'description' => 'Vikas, build isolated logging utility for requests.',
                    'expected_result' => 'Standardized JSON request logs.',
                    'share_previous_branch_details' => false,
                    'files' => [$loggingPdf],
                ],
            ],
            'branch_files' => [
                $neha->id => [$jwtPdf],
                $vikas->id => [$loggingPdf],
            ],
        ]);

        $assignResponse->assertStatus(200);

        // 1. Neha logs in (share_previous was TRUE)
        $nehaRes = $this->actingAs($neha, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $nehaRes->assertStatus(200);

        $nehaBranch = $nehaRes->json('data.my_branch');
        $this->assertNotNull($nehaBranch);
        $this->assertEquals('Subtask - JWT Validation', $nehaBranch['title']);
        $this->assertStringContainsString('Neha, implement JWT validation', $nehaBranch['description']);

        $nehaAtts = $nehaRes->json('data.attachments');
        $nehaAttNames = collect($nehaAtts)->pluck('file_name')->all();
        $this->assertContains('JWT_Specs.pdf', $nehaAttNames);
        $this->assertNotContains('Backend_Requirements.pdf', $nehaAttNames); // Prior attachments NOT shared with subtasks
        $this->assertNotContains('Project_Overview.pdf', $nehaAttNames);
        $this->assertNotContains('Logging_Guide.pdf', $nehaAttNames); // Vikas's attachment must not be visible

        $nehaJwtAtt = collect($nehaAtts)->firstWhere('file_name', 'JWT_Specs.pdf');
        $this->actingAs($neha, 'sanctum')->get("/api/attachments/{$nehaJwtAtt['id']}/download")->assertStatus(200);

        // 2. Vikas logs in (share_previous was FALSE)
        $vikasRes = $this->actingAs($vikas, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $vikasRes->assertStatus(200);

        $vikasBranch = $vikasRes->json('data.my_branch');
        $this->assertNotNull($vikasBranch);
        $this->assertEquals('Subtask - Logging Utility', $vikasBranch['title']);
        $this->assertEquals('Vikas, build isolated logging utility for requests.', $vikasBranch['description']);
        // Crucial: prior description must NOT be included because share_previous was false
        $this->assertStringNotContainsString('Develop employee CRUD APIs', $vikasBranch['description']);

        $vikasAtts = $vikasRes->json('data.attachments');
        $vikasAttNames = collect($vikasAtts)->pluck('file_name')->all();
        $this->assertContains('Logging_Guide.pdf', $vikasAttNames);
        $this->assertNotContains('Backend_Requirements.pdf', $vikasAttNames); // Rohit's doc hidden
        $this->assertNotContains('JWT_Specs.pdf', $vikasAttNames); // Neha's doc hidden

        $vikasLogAtt = collect($vikasAtts)->firstWhere('file_name', 'Logging_Guide.pdf');
        $this->actingAs($vikas, 'sanctum')->get("/api/attachments/{$vikasLogAtt['id']}/download")->assertStatus(200);

        // Vikas attempts to access Neha's file -> 403 Forbidden!
        $this->actingAs($vikas, 'sanctum')->get("/api/attachments/{$nehaJwtAtt['id']}/download")->assertStatus(403);
    }

    public function test_manager_can_create_task_with_unticked_share_main_task_details_keeping_shared_attachments_confidential()
    {
        $sharedSecretPdf = UploadedFile::fake()->create('Company_Secret.pdf', 500, 'application/pdf');
        $rohitPdf = UploadedFile::fake()->create('Rohit_Doc.pdf', 300, 'application/pdf');
        $amanPdf = UploadedFile::fake()->create('Aman_Doc.pdf', 400, 'application/pdf');

        $response = $this->actingAs($this->manager, 'sanctum')->post('/api/tasks', [
            'title' => 'Confidential Security Audit',
            'description' => 'Main task executive instructions with classified company details.',
            'handling_method' => 'assign',
            'priority' => 'high',
            'department_id' => $this->department->id,
            'due_date' => '2026-11-20',
            'shared_files' => [$sharedSecretPdf],
            'assignees' => [$this->rohit->id, $this->aman->id],
            'branches' => [
                [
                    'owner_id' => $this->rohit->id,
                    'title' => 'Rohit - Shared Access Subtask',
                    'description' => 'Rohit, analyze company secret document.',
                    'share_main_task_details' => true,
                    'files' => [$rohitPdf],
                ],
                [
                    'owner_id' => $this->aman->id,
                    'title' => 'Aman - Strictly Confidential Subtask',
                    'description' => 'Aman, do isolated unit test only.',
                    'share_main_task_details' => false,
                    'files' => [$amanPdf],
                ],
            ],
            'branch_files' => [
                $this->rohit->id => [$rohitPdf],
                $this->aman->id => [$amanPdf],
            ],
        ]);

        $response->assertStatus(201);
        $taskId = $response->json('data.id');

        // Manager view to get shared attachment ID
        $managerRes = $this->actingAs($this->manager, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $sharedAtt = collect($managerRes->json('data.attachments'))->firstWhere('file_name', 'Company_Secret.pdf');
        $this->assertNotNull($sharedAtt);

        // 1. Rohit (assigned a subtask - main task shared doc MUST NOT be visible)
        $rohitRes = $this->actingAs($this->rohit, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $rohitAttNames = collect($rohitRes->json('data.attachments'))->pluck('file_name')->all();
        $this->assertNotContains('Company_Secret.pdf', $rohitAttNames);
        $this->assertContains('Rohit_Doc.pdf', $rohitAttNames);
        $this->actingAs($this->rohit, 'sanctum')->get("/api/attachments/{$sharedAtt['id']}/download")->assertStatus(403);

        // 2. Aman (assigned a subtask - main task shared doc MUST NOT be visible)
        $amanRes = $this->actingAs($this->aman, 'sanctum')->getJson("/api/tasks/{$taskId}");
        $amanAttNames = collect($amanRes->json('data.attachments'))->pluck('file_name')->all();
        $this->assertContains('Aman_Doc.pdf', $amanAttNames);
        $this->assertNotContains('Company_Secret.pdf', $amanAttNames);

        // Aman tries to download Company_Secret.pdf directly -> 403 Forbidden!
        $this->actingAs($this->aman, 'sanctum')->get("/api/attachments/{$sharedAtt['id']}/download")->assertStatus(403);
    }

    public function test_manager_can_create_task_with_direct_delegation_mode(): void
    {
        $sharedDoc = UploadedFile::fake()->create('DirectBrief.pdf', 200, 'application/pdf');

        $response = $this->actingAs($this->manager, 'sanctum')->post('/api/tasks', [
            'title' => 'Direct Delegation Operational Task',
            'description' => 'Direct task pass-through to employees without subtasks.',
            'handling_method' => 'assign',
            'priority' => 'high',
            'department_id' => $this->department->id,
            'due_date' => '2026-11-25',
            'delegation_mode' => 'direct',
            'shared_files' => [$sharedDoc],
            'assignees' => [$this->rohit->id, $this->aman->id],
        ]);

        $response->assertStatus(201);
        $taskId = $response->json('data.id');

        // Check both Rohit and Aman have branches copying the main task details
        $rohitBranch = \App\Models\TaskBranch::where('task_id', $taskId)->where('owner_id', $this->rohit->id)->first();
        $this->assertNotNull($rohitBranch);
        $this->assertEquals('Direct Delegation Operational Task', $rohitBranch->title);
        $this->assertEquals('Direct task pass-through to employees without subtasks.', $rohitBranch->description);

        $amanBranch = \App\Models\TaskBranch::where('task_id', $taskId)->where('owner_id', $this->aman->id)->first();
        $this->assertNotNull($amanBranch);
        $this->assertEquals('Direct Delegation Operational Task', $amanBranch->title);
    }

    public function test_assignee_can_delegate_task_directly_further(): void
    {
        $sharedDoc = UploadedFile::fake()->create('OriginalDoc.pdf', 150, 'application/pdf');

        // 1. Manager assigns directly to Rohit
        $createRes = $this->actingAs($this->manager, 'sanctum')->post('/api/tasks', [
            'title' => 'Client Migration Project',
            'description' => 'Complete the client database migration.',
            'handling_method' => 'assign',
            'priority' => 'medium',
            'department_id' => $this->department->id,
            'due_date' => '2026-11-30',
            'delegation_mode' => 'direct',
            'shared_files' => [$sharedDoc],
            'assignees' => [$this->rohit->id],
        ]);
        $taskId = $createRes->json('data.id');

        // 2. Rohit delegates directly further to Aman (without creating custom subtasks)
        $delegateRes = $this->actingAs($this->rohit, 'sanctum')->post("/api/tasks/{$taskId}/assignees", [
            'delegation_mode' => 'direct',
            'user_ids' => [$this->aman->id],
        ]);
        $delegateRes->assertStatus(200);

        // 3. Verify Aman's branch
        $amanBranch = \App\Models\TaskBranch::where('task_id', $taskId)->where('owner_id', $this->aman->id)->first();
        $this->assertNotNull($amanBranch);
        $this->assertEquals('Client Migration Project', $amanBranch->title);
        $this->assertEquals('Complete the client database migration.', $amanBranch->description);

        // Verify attachments were passed to Aman
        $amanAttachments = \App\Models\TaskAttachment::where('task_branch_id', $amanBranch->id)->get();
        $this->assertNotEmpty($amanAttachments);
        $this->assertContains('OriginalDoc.pdf', $amanAttachments->pluck('file_name')->all());
    }
}
