<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\TaskBranch;
use App\Models\TaskComment;
use App\Models\TaskHoldRecord;
use App\Models\TaskReview;
use App\Models\TaskStatusHistory;
use App\Models\TaskSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ComprehensiveSystemTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $subAdmin;
    protected User $employee1;
    protected User $employee2;
    protected User $unrelatedEmployee;
    protected Department $department;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->department = Department::create([
            'name' => 'Technology Operations',
            'description' => 'Core IT & Software Infrastructure',
            'is_active' => true,
        ]);

        $this->admin = User::create([
            'name' => 'Ravi Admin',
            'email' => 'ravi@company.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'gender' => 'male',
            'is_active' => true,
        ]);

        $this->subAdmin = User::create([
            'name' => 'Priya SubAdmin',
            'email' => 'priya@company.com',
            'password' => Hash::make('password'),
            'role' => 'sub_admin',
            'department_id' => $this->department->id,
            'gender' => 'female',
            'is_active' => true,
        ]);

        $this->employee1 = User::create([
            'name' => 'Karan Employee',
            'email' => 'karan@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'department_id' => $this->department->id,
            'gender' => 'male',
            'is_active' => true,
        ]);

        $this->employee2 = User::create([
            'name' => 'Sara Employee',
            'email' => 'sara@company.com',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'department_id' => $this->department->id,
            'gender' => 'female',
            'is_active' => true,
        ]);

        $this->unrelatedEmployee = User::create([
            'name' => 'Unrelated Worker',
            'email' => 'unrelated@company.com',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'is_active' => true,
        ]);
    }

    public function test_authentication_flow_and_rejections(): void
    {
        // 1. Admin Login
        $res = $this->postJson('/api/auth/login', [
            'email' => 'ravi@company.com',
            'password' => 'password',
        ]);
        $res->assertStatus(200)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'email', 'role']]]);
        $this->assertEquals('admin', $res->json('data.user.role'));

        // 2. Sub-Admin Login
        $res = $this->postJson('/api/auth/login', [
            'email' => 'priya@company.com',
            'password' => 'password',
        ]);
        $res->assertStatus(200);
        $this->assertEquals('sub_admin', $res->json('data.user.role'));

        // 3. Employee Login
        $res = $this->postJson('/api/auth/login', [
            'email' => 'karan@gmail.com',
            'password' => 'password',
        ]);
        $res->assertStatus(200);
        $this->assertEquals('employee', $res->json('data.user.role'));

        // 4. Invalid Password Rejection
        $res = $this->postJson('/api/auth/login', [
            'email' => 'ravi@company.com',
            'password' => 'wrongpassword123',
        ]);
        $res->assertStatus(401);

        // 5. Auth Me Endpoint
        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/auth/me');
        $res->assertStatus(200);

        // 6. Logout
        $res = $this->postJson('/api/auth/logout');
        $res->assertStatus(200);
    }

    public function test_profile_and_avatar_customizations(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. Get profile
        $res = $this->getJson('/api/profile');
        $res->assertStatus(200);
        $this->assertEquals('ravi@company.com', $res->json('data.email'));

        // 2. Update to male preset
        $res = $this->postJson('/api/profile/avatar', ['gender' => 'male']);
        $res->assertStatus(200);
        $this->assertEquals('male', $res->json('data.gender'));
        $this->assertEquals('preset', $res->json('data.avatar_type'));

        // 3. Update to female preset
        $res = $this->postJson('/api/profile/avatar', ['gender' => 'female']);
        $res->assertStatus(200);
        $this->assertEquals('female', $res->json('data.gender'));
        $this->assertEquals('preset', $res->json('data.avatar_type'));

        // 4. Upload custom photo avatar
        $photo = UploadedFile::fake()->image('custom_pic.png', 300, 300);
        $res = $this->postJson('/api/profile/avatar', ['photo' => $photo]);
        $res->assertStatus(200);
        $this->assertEquals('custom', $res->json('data.avatar_type'));
        $this->assertNotEmpty($res->json('data.avatar_url'));

        // 5. Update profile details
        $res = $this->putJson('/api/profile', [
            'name' => 'Ravi Admin Updated',
            'department_id' => $this->department->id,
        ]);
        $res->assertStatus(200);
        $this->assertEquals('Ravi Admin Updated', $res->json('data.name'));
    }

    public function test_dashboards_and_kpis(): void
    {
        // Create sample tasks
        Task::create([
            'title' => 'Dashboard In Progress Task',
            'description' => 'Test task for dashboard counts',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
            'status' => 'in_progress',
            'priority' => 'high',
            'progress' => 50,
            'start_date' => now(),
            'due_date' => now()->addDays(3),
        ]);

        Task::create([
            'title' => 'Dashboard Completed Task',
            'description' => 'Test task for dashboard completed counts',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
            'status' => 'completed',
            'priority' => 'medium',
            'progress' => 100,
            'start_date' => now()->subDays(5),
            'due_date' => now()->subDay(),
            'completed_at' => now(),
        ]);

        // 1. Admin Dashboard
        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/dashboard/admin');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_tasks',
                    'in_progress',
                    'completed',
                    'pending_review',
                    'on_hold',
                ]
            ]);
        $this->assertGreaterThanOrEqual(2, $res->json('data.total_tasks'));

        // 2. Employee Dashboard
        Sanctum::actingAs($this->employee1);
        $res = $this->getJson('/api/dashboard/employee');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'my_action',
                    'assigned_to_me',
                    'my_created',
                    'my_collaborations',
                    'awaiting_review',
                    'returned_tasks',
                ]
            ]);
    }

    public function test_departments_management_and_rbac(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. List departments
        $res = $this->getJson('/api/departments');
        $res->assertStatus(200);

        // 2. Admin creates department
        $res = $this->postJson('/api/departments', [
            'name' => 'Data Science & AI',
            'description' => 'Machine learning and deep models department',
        ]);
        $res->assertStatus(201);
        $deptId = $res->json('data.id');
        $this->assertNotNull($deptId);

        // 3. Admin updates department
        $res = $this->putJson("/api/departments/{$deptId}", [
            'name' => 'Data Science & Advanced Analytics',
            'description' => 'Updated department scope',
            'is_active' => true,
        ]);
        $res->assertStatus(200);

        // 4. Admin deactivates department
        $res = $this->putJson("/api/departments/{$deptId}/deactivate");
        $res->assertStatus(200);
        $this->assertFalse(Department::find($deptId)->is_active);

        // 5. Admin activates department
        $res = $this->putJson("/api/departments/{$deptId}/activate");
        $res->assertStatus(200);
        $this->assertTrue(Department::find($deptId)->is_active);

        // 6. RBAC Guard: Employee cannot create department
        Sanctum::actingAs($this->employee1);
        $res = $this->postJson('/api/departments', [
            'name' => 'Rogue Department',
        ]);
        $res->assertStatus(403);
    }

    public function test_users_management_and_sub_admin_rules(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. Admin lists users
        $res = $this->getJson('/api/users');
        $res->assertStatus(200);

        // 2. Admin creates an employee
        $res = $this->postJson('/api/users', [
            'name' => 'New Junior Developer',
            'email' => 'juniordev@company.com',
            'password' => 'Password123!',
            'role' => 'employee',
            'department_id' => $this->department->id,
        ]);
        $res->assertStatus(201);
        $newUserId = $res->json('data.id');

        // 3. Admin deactivates and activates user
        $res = $this->putJson("/api/users/{$newUserId}/deactivate");
        $res->assertStatus(200);
        $this->assertFalse(User::find($newUserId)->is_active);

        $res = $this->putJson("/api/users/{$newUserId}/activate");
        $res->assertStatus(200);
        $this->assertTrue(User::find($newUserId)->is_active);

        // 4. Sub-Admin Hierarchy Rule: Sub-Admin cannot create Admin
        Sanctum::actingAs($this->subAdmin);
        $res = $this->postJson('/api/users', [
            'name' => 'Illegal SuperAdmin',
            'email' => 'illegal_admin@company.com',
            'password' => 'Password123!',
            'role' => 'admin',
        ]);
        $res->assertStatus(403);

        // 5. Sub-Admin Hierarchy Rule: Sub-Admin cannot create Sub-Admin
        $res = $this->postJson('/api/users', [
            'name' => 'Illegal SubAdmin Peer',
            'email' => 'illegal_sub@company.com',
            'password' => 'Password123!',
            'role' => 'sub_admin',
        ]);
        $res->assertStatus(403);

        // 6. Sub-Admin can create an Employee
        $res = $this->postJson('/api/users', [
            'name' => 'Legit Employee By SubAdmin',
            'email' => 'legit_emp@company.com',
            'password' => 'Password123!',
            'role' => 'employee',
            'department_id' => $this->department->id,
        ]);
        $res->assertStatus(201);
    }

    public function test_task_creation_and_automatic_branching(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. Single Assignee Task
        $res = $this->postJson('/api/tasks', [
            'title' => 'Build Single Assignee Feature',
            'description' => 'Test automatic branch creation and sequential code',
            'handling_method' => 'assign',
            'priority' => 'high',
            'start_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'assignees' => [$this->employee1->id],
        ]);
        $res->assertStatus(201);
        $taskId = $res->json('data.id');
        $taskCode = $res->json('data.task_code');

        $this->assertStringStartsWith('T-', $taskCode);
        $task = Task::with('branches')->find($taskId);
        $this->assertCount(1, $task->branches);
        $this->assertEquals($this->employee1->id, $task->branches->first()->owner_id);

        // 2. Collaborative Multi-Assignee Task
        $res = $this->postJson('/api/tasks', [
            'title' => 'Collaborative Core Architecture',
            'description' => 'Test multiple parallel branches and collaborators',
            'handling_method' => 'collaborate',
            'priority' => 'urgent',
            'start_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'assignees' => [$this->employee1->id, $this->employee2->id],
            'collaborators' => [$this->subAdmin->id],
        ]);
        $res->assertStatus(201);
        $collabTask = Task::with(['branches.collaborators'])->find($res->json('data.id'));
        $this->assertCount(2, $collabTask->branches);
    }

    public function test_task_lifecycle_hold_resume_cancel(): void
    {
        Sanctum::actingAs($this->admin);

        $task = Task::create([
            'title' => 'Lifecycle Control Task',
            'description' => 'Testing hold, resume, and cancel actions',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
            'status' => 'in_progress',
            'priority' => 'high',
            'start_date' => now(),
            'due_date' => now()->addDays(5),
        ]);

        // 1. Put task on hold with reason
        $res = $this->putJson("/api/tasks/{$task->id}/hold", [
            'reason' => 'Awaiting third-party vendor API credentials',
        ]);
        $res->assertStatus(200);
        $task->refresh();
        $this->assertEquals('on_hold', $task->status);
        $this->assertDatabaseHas('task_hold_records', [
            'task_id' => $task->id,
            'reason' => 'Awaiting third-party vendor API credentials',
        ]);

        // 2. Resume task from hold
        $res = $this->putJson("/api/tasks/{$task->id}/resume");
        $res->assertStatus(200);
        $task->refresh();
        $this->assertEquals('in_progress', $task->status);

        // 3. Cancel task with reason
        $res = $this->postJson("/api/tasks/{$task->id}/cancel", [
            'reason' => 'Project superseded by enterprise initiative',
        ]);
        $res->assertStatus(200);
        $task->refresh();
        $this->assertEquals('cancelled', $task->status);
    }

    public function test_deliverables_and_secure_download_permissions(): void
    {
        Sanctum::actingAs($this->admin);

        $task = Task::create([
            'title' => 'Deliverable Upload Task',
            'description' => 'Test file upload and permission gated streaming',
            'handling_method' => 'assign',
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
            'status' => 'in_progress',
            'priority' => 'medium',
            'start_date' => now(),
            'due_date' => now()->addDays(5),
        ]);

        $branch = TaskBranch::create([
            'task_id' => $task->id,
            'owner_id' => $this->employee1->id,
            'title' => 'Frontend Branch',
            'status' => 'in_progress',
        ]);

        // 1. Employee 1 uploads deliverable file
        Sanctum::actingAs($this->employee1);
        $fakePdf = UploadedFile::fake()->create('Final_Report.pdf', 250, 'application/pdf');
        $res = $this->postJson('/api/attachments', [
            'task_id' => $task->id,
            'task_branch_id' => $branch->id,
            'file' => $fakePdf,
        ]);
        $res->assertStatus(201);
        $attId = $res->json('data.id');
        $this->assertNotNull($attId);

        $attachment = TaskAttachment::find($attId);

        // 2. Admin can download
        Sanctum::actingAs($this->admin);
        $downloadRes = $this->get("/api/attachments/{$attachment->id}/download");
        $downloadRes->assertStatus(200);

        // 3. Assignee (Employee 1) can download
        Sanctum::actingAs($this->employee1);
        $downloadRes = $this->get("/api/attachments/{$attachment->id}/download");
        $downloadRes->assertStatus(200);

        // 4. Unrelated employee download attempt -> 403 Forbidden
        Sanctum::actingAs($this->unrelatedEmployee);
        $downloadRes = $this->get("/api/attachments/{$attachment->id}/download");
        $downloadRes->assertStatus(403);
    }

    public function test_comments_and_notifications_feed(): void
    {
        $task = Task::create([
            'title' => 'Collaboration & Communication Task',
            'description' => 'Discussion between team members',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
            'status' => 'in_progress',
            'priority' => 'low',
            'start_date' => now(),
            'due_date' => now()->addDays(5),
        ]);

        // 1. Employee posts comment
        Sanctum::actingAs($this->employee1);
        $res = $this->postJson('/api/comments', [
            'task_id' => $task->id,
            'comment' => 'Completed phase one module setup and ready for review.',
        ]);
        $res->assertStatus(201);

        // 2. List comments for task
        $res = $this->getJson("/api/comments?task_id={$task->id}");
        $res->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($res->json('data')));

        // 3. User notifications feed
        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/notifications');
        $res->assertStatus(200);

        // 4. Mark all notifications as read
        $res = $this->putJson('/api/notifications/read-all');
        $res->assertStatus(200);
    }

    public function test_multi_tier_submission_and_review_gates(): void
    {
        $task = Task::create([
            'title' => 'Feature Review Task',
            'description' => 'Test submission, return for revision, and final approval',
            'handling_method' => 'assign',
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
            'status' => 'in_progress',
            'priority' => 'high',
            'start_date' => now(),
            'due_date' => now()->addDays(5),
        ]);

        $branch = TaskBranch::create([
            'task_id' => $task->id,
            'owner_id' => $this->employee1->id,
            'title' => 'Implementation Branch',
            'status' => 'in_progress',
        ]);

        // 1. Employee submits work for review
        Sanctum::actingAs($this->employee1);
        $res = $this->postJson("/api/tasks/{$task->id}/submit", [
            'task_branch_id' => $branch->id,
            'description' => 'First release version submitted for manager review',
        ]);
        $res->assertStatus(201);
        $submissionId = $res->json('data.id');
        $this->assertNotNull($submissionId);

        // 2. Admin returns submission for revision
        Sanctum::actingAs($this->admin);
        $res = $this->postJson("/api/submissions/{$submissionId}/review", [
            'decision' => 'returned',
            'comments' => 'Please add unit tests before approval.',
        ]);
        $res->assertStatus(201);

        $branch->refresh();
        $this->assertEquals('post_comment', $branch->status);

        // 3. Employee re-submits work
        Sanctum::actingAs($this->employee1);
        $res = $this->postJson("/api/tasks/{$task->id}/submit", [
            'task_branch_id' => $branch->id,
            'description' => 'Unit tests added, re-submitting for sign-off',
        ]);
        $res->assertStatus(201);
        $secondSubmissionId = $res->json('data.id');

        // 4. Admin approves submission
        Sanctum::actingAs($this->admin);
        $res = $this->postJson("/api/submissions/{$secondSubmissionId}/review", [
            'decision' => 'approved',
            'comments' => 'Looks solid! Approved.',
        ]);
        $res->assertStatus(201);

        $branch->refresh();
        $this->assertEquals('completed', $branch->status);

        $task->refresh();
        $this->assertEquals('review', $task->status);

        // 5. Creator does Final Submit to officially mark entire task completed
        $res = $this->postJson("/api/tasks/{$task->id}/final-submit");
        $res->assertStatus(200);

        $task->refresh();
        $this->assertEquals('completed', $task->status);
        $this->assertNotNull($task->completed_at);
    }

    public function test_admin_work_logs_and_task_journey_dossier(): void
    {
        $task = Task::create([
            'title' => 'Audit Trail Journey Task',
            'description' => 'Exhaustive journey tracking verification',
            'handling_method' => 'work_alone',
            'creator_id' => $this->admin->id,
            'department_id' => $this->department->id,
            'status' => 'in_progress',
            'priority' => 'urgent',
            'start_date' => now(),
            'due_date' => now()->addDays(5),
        ]);

        TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $this->employee1->id,
            'comment' => 'Audited team discussion note.',
        ]);

        TaskStatusHistory::create([
            'task_id' => $task->id,
            'from_status' => 'pending',
            'to_status' => 'in_progress',
            'changed_by_id' => $this->admin->id,
            'reason' => 'Work initiated by team lead',
            'changed_at' => now(),
        ]);

        // 1. Employee access blocked with 403 Forbidden
        Sanctum::actingAs($this->employee1);
        $res = $this->getJson('/api/work-logs');
        $res->assertStatus(403);
        $res = $this->getJson('/api/work-logs/stats');
        $res->assertStatus(403);

        // 2. Admin retrieves stats
        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/work-logs/stats');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_logs',
                    'total_comments',
                    'total_status_changes',
                    'total_attachments',
                    'total_reviews',
                    'total_tasks',
                ]
            ]);

        // 3. Admin retrieves unified work logs stream
        $res = $this->getJson('/api/work-logs');
        $res->assertStatus(200)
            ->assertJsonStructure(['data', 'meta']);
        $this->assertGreaterThanOrEqual(1, count($res->json('data')));

        // 4. Admin filters by type
        $res = $this->getJson('/api/work-logs?type=comment');
        $res->assertStatus(200);

        // 5. Admin retrieves complete Task Journey Dossier with 4 sub-tabs
        $res = $this->getJson("/api/work-logs/task/{$task->id}");
        $res->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'task',
                    'timeline',
                    'conversations',
                    'attachments',
                    'branches',
                ]
            ]);
    }

    public function test_executive_reports_analytics(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->getJson('/api/reports?range=last_30_days');
        $res->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_tasks',
                    'completion_rate',
                    'overdue_count',
                    'completed_count',
                    'tasks_by_status',
                    'tasks_by_department',
                    'employee_workload',
                ]
            ]);
    }
}
