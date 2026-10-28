<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Department;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskAttachment;
use App\Models\TaskSubmission;
use App\Models\TaskReview;
use App\Models\TaskComment;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

class SystemVerifier {
    private int $passed = 0;
    private int $failed = 0;
    private array $errors = [];
    private $app;
    private $httpKernel;

    public function __construct($app) {
        $this->app = $app;
        $this->httpKernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
        Storage::fake('public');
    }

    public function assert($condition, string $testName, string $details = ''): void {
        if ($condition) {
            $this->passed++;
            echo "  [PASS] {$testName}" . PHP_EOL;
        } else {
            $this->failed++;
            $msg = "  [FAIL] {$testName}" . ($details ? " - Details: {$details}" : '');
            $this->errors[] = $msg;
            echo $msg . PHP_EOL;
        }
    }

    public function callApi(string $method, string $uri, array $params = [], ?User $user = null, array $files = []) {
        if ($user) {
            Sanctum::actingAs($user, ['*']);
        }
        $server = ['HTTP_ACCEPT' => 'application/json'];
        $req = Request::create($uri, $method, $params, [], $files, $server);
        if ($user) {
            $req->setUserResolver(fn() => $user);
        }
        $res = $this->httpKernel->handle($req);
        $this->httpKernel->terminate($req, $res);
        return $res;
    }

    public function run(): void {
        echo "========================================================" . PHP_EOL;
        echo "  QUICKLIFENOW - FULL COMPREHENSIVE SYSTEM TEST SUITE  " . PHP_EOL;
        echo "========================================================" . PHP_EOL . PHP_EOL;

        $this->testAuthentication();
        $this->testProfileAndAvatars();
        $this->testDashboards();
        $this->testDepartmentsManagement();
        $this->testUsersManagement();
        $this->testTaskCreationAndAssignment();
        $this->testTaskLifecycleAndTransitions();
        $this->testAttachmentsAndSecureDownloads();
        $this->testSubmissionsAndReviews();
        $this->testAdminWorkLogsAndDossier();
        $this->testReportsAndNotifications();

        echo PHP_EOL . "========================================================" . PHP_EOL;
        echo "TEST SUMMARY: {$this->passed} PASSED, {$this->failed} FAILED." . PHP_EOL;
        echo "========================================================" . PHP_EOL;

        if ($this->failed > 0) {
            echo PHP_EOL . "FAILURES ENCOUNTERED:" . PHP_EOL;
            foreach ($this->errors as $err) {
                echo $err . PHP_EOL;
            }
        }
    }

    private function testAuthentication(): void {
        echo "--- 1. Testing Authentication & Session Tokens ---" . PHP_EOL;

        // 1.1 Admin login
        $res = $this->callApi('POST', '/api/auth/login', [
            'email' => 'ravi@company.com',
            'password' => 'password',
        ]);
        $data = json_decode($res->getContent(), true);
        $this->assert($res->getStatusCode() === 200 && !empty($data['data']['token']), "Admin Login (ravi@company.com)");
        $this->assert(($data['data']['user']['role'] ?? '') === 'admin', "Admin Role Verification");

        // 1.2 Sub-Admin login
        $res = $this->callApi('POST', '/api/auth/login', [
            'email' => 'priya@company.com',
            'password' => 'password',
        ]);
        $data = json_decode($res->getContent(), true);
        $this->assert($res->getStatusCode() === 200 && ($data['data']['user']['role'] ?? '') === 'sub_admin', "Sub-Admin Login (priya@company.com)");

        // 1.3 Employee login
        $emp = User::where('role', 'employee')->where('is_active', true)->first();
        $empEmail = $emp ? $emp->email : 'aman@company.com';
        $res = $this->callApi('POST', '/api/auth/login', [
            'email' => $empEmail,
            'password' => 'password',
        ]);
        $data = json_decode($res->getContent(), true);
        $this->assert($res->getStatusCode() === 200 && ($data['data']['user']['role'] ?? '') === 'employee', "Employee Login ({$empEmail})");

        // 1.4 Invalid password rejection
        $res = $this->callApi('POST', '/api/auth/login', [
            'email' => 'ravi@company.com',
            'password' => 'wrong_password_xyz',
        ]);
        $this->assert($res->getStatusCode() === 401 || $res->getStatusCode() === 422, "Invalid Password Guard Rejection (Status {$res->getStatusCode()})");
    }

    private function testProfileAndAvatars(): void {
        echo PHP_EOL . "--- 2. Testing Profile & 3D / Custom Avatar Management ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();

        // 2.1 Get profile
        $res = $this->callApi('GET', '/api/profile', [], $admin);
        $this->assert($res->getStatusCode() === 200, "Profile Show API (Status 200)");

        // 2.2 Update to Male preset
        $res = $this->callApi('POST', '/api/profile/avatar', ['gender' => 'male'], $admin);
        $data = json_decode($res->getContent(), true);
        $this->assert($res->getStatusCode() === 200 && ($data['data']['gender'] ?? '') === 'male', "Update Avatar to Male Preset");

        // 2.3 Update to Female preset
        $res = $this->callApi('POST', '/api/profile/avatar', ['gender' => 'female'], $admin);
        $data = json_decode($res->getContent(), true);
        $this->assert($res->getStatusCode() === 200 && ($data['data']['gender'] ?? '') === 'female', "Update Avatar to Female Preset");

        // 2.4 Upload Custom Avatar Photo
        $fakePhoto = UploadedFile::fake()->image('custom_avatar.png', 200, 200);
        $res = $this->callApi('POST', '/api/profile/avatar', [], $admin, ['photo' => $fakePhoto]);
        $data = json_decode($res->getContent(), true);
        $this->assert($res->getStatusCode() === 200 && ($data['data']['avatar_type'] ?? '') === 'custom', "Upload Custom Avatar Photo");

        // Restore preset
        $this->callApi('POST', '/api/profile/avatar', ['gender' => 'male'], $admin);
    }

    private function testDashboards(): void {
        echo PHP_EOL . "--- 3. Testing Role Dashboards & Metrics ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();
        $employee = User::where('role', 'employee')->first();

        // 3.1 Admin Dashboard
        $res = $this->callApi('GET', '/api/dashboard/admin', [], $admin);
        $data = json_decode($res->getContent(), true)['data'] ?? [];
        $this->assert($res->getStatusCode() === 200, "Admin Dashboard API (Status 200)");
        $this->assert(isset($data['total_tasks']) && isset($data['in_progress']) && isset($data['pending_review']), "Admin Dashboard KPI Metrics");

        // 3.2 Employee Dashboard
        $res = $this->callApi('GET', '/api/dashboard/employee', [], $employee);
        $data = json_decode($res->getContent(), true)['data'] ?? [];
        $this->assert($res->getStatusCode() === 200, "Employee Dashboard API (Status 200)");
        $this->assert(isset($data['my_action']) && isset($data['assigned_to_me']), "Employee Dashboard KPI Metrics");
    }

    private function testDepartmentsManagement(): void {
        echo PHP_EOL . "--- 4. Testing Departments Management ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();
        $employee = User::where('role', 'employee')->first();

        // 4.1 List departments
        $res = $this->callApi('GET', '/api/departments', [], $admin);
        $this->assert($res->getStatusCode() === 200, "List Departments (Status 200)");

        // 4.2 Create test department
        $res = $this->callApi('POST', '/api/departments', [
            'name' => 'Quality Assurance & Security ' . rand(100, 999),
            'description' => 'QA and software security test department',
        ], $admin);
        $dept = json_decode($res->getContent(), true)['data'] ?? null;
        $this->assert($res->getStatusCode() === 201 && !empty($dept['id']), "Create Department (Status 201)");

        // 4.3 Update & Deactivate department
        if ($dept) {
            $res = $this->callApi('PUT', "/api/departments/{$dept['id']}/deactivate", [], $admin);
            $this->assert($res->getStatusCode() === 200, "Deactivate Department");

            // Clean up test department
            Department::find($dept['id'])?->delete();
        }

        // 4.4 RBAC Guard: Employee cannot create department
        $res = $this->callApi('POST', '/api/departments', ['name' => 'Forbidden Dept'], $employee);
        $this->assert($res->getStatusCode() === 403, "RBAC Guard: Employee Forbidden from Creating Department (403)");
    }

    private function testUsersManagement(): void {
        echo PHP_EOL . "--- 5. Testing Users Management ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();
        $subAdmin = User::where('role', 'sub_admin')->first();

        // 5.1 List users
        $res = $this->callApi('GET', '/api/users', [], $admin);
        $this->assert($res->getStatusCode() === 200, "List Users Directory (Status 200)");

        // 5.2 Create temporary employee
        $testEmail = 'test_worker_' . rand(1000, 9999) . '@company.com';
        $res = $this->callApi('POST', '/api/users', [
            'name' => 'Automated Test User',
            'email' => $testEmail,
            'password' => 'Password123!',
            'role' => 'employee',
        ], $admin);
        $newUser = json_decode($res->getContent(), true)['data'] ?? null;
        $this->assert($res->getStatusCode() === 201 && !empty($newUser['id']), "Create New User (Status 201)");

        if ($newUser) {
            $uModel = User::find($newUser['id']);
            // Deactivate
            $res = $this->callApi('PUT', "/api/users/{$newUser['id']}/deactivate", [], $admin);
            $this->assert($res->getStatusCode() === 200, "Deactivate User");

            // Clean up
            $uModel?->forceDelete();
        }

        // 5.3 Hierarchy Rule: Sub-Admin cannot create Admin
        $res = $this->callApi('POST', '/api/users', [
            'name' => 'Illegal Admin',
            'email' => 'illegal_' . rand(100, 999) . '@company.com',
            'password' => 'Password123!',
            'role' => 'admin',
        ], $subAdmin);
        $this->assert($res->getStatusCode() === 403, "Hierarchy Rule: Sub-Admin Forbidden from Creating Admin (403)");
    }

    private function testTaskCreationAndAssignment(): void {
        echo PHP_EOL . "--- 6. Testing Task Creation & Assignment Rules ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();
        $employee = User::where('role', 'employee')->first();
        $subAdmin = User::where('role', 'sub_admin')->first();

        // 6.1 Create Single-Assignee Task
        $res = $this->callApi('POST', '/api/tasks', [
            'title' => 'Automated Verification Task ' . rand(100, 999),
            'description' => 'End to end system verification task',
            'handling_method' => 'assign',
            'priority' => 'high',
            'start_date' => now()->toDateString(),
            'due_date' => now()->addDays(5)->toDateString(),
            'assignees' => [$employee->id],
        ], $admin);
        $taskData = json_decode($res->getContent(), true)['data'] ?? [];
        $taskId = $taskData['id'] ?? null;

        $this->assert($res->getStatusCode() === 201 && !empty($taskId), "Task Created (Status 201)");
        $this->assert(isset($taskData['task_code']) && str_starts_with($taskData['task_code'], 'T-'), "Unique Sequential Task Code Generated ({$taskData['task_code']})");

        // Verify branch created for assignee
        $task = Task::with('branches.owner')->find($taskId);
        $this->assert($task->branches->count() === 1 && $task->branches->first()->owner_id === $employee->id, "Single Assignee Branch Successfully Created");

        // 6.2 Multi-Assignee & Collaboration Task
        $res = $this->callApi('POST', '/api/tasks', [
            'title' => 'Multi-Assignee Collaborative Task ' . rand(100, 999),
            'description' => 'Multi-branch collaboration verification',
            'handling_method' => 'collaborate',
            'priority' => 'urgent',
            'start_date' => now()->toDateString(),
            'due_date' => now()->addDays(10)->toDateString(),
            'assignees' => [$employee->id, $subAdmin->id],
            'collaborators' => [$admin->id],
        ], $admin);
        $multiTaskData = json_decode($res->getContent(), true)['data'] ?? [];
        $multiTaskId = $multiTaskData['id'] ?? null;

        $this->assert($res->getStatusCode() === 201 && !empty($multiTaskId), "Multi-Assignee Task Created (Status 201)");
        $multiTask = Task::with('branches.collaborators')->find($multiTaskId);
        $this->assert($multiTask->branches->count() >= 2, "Multiple Parallel Assignee Branches Created");
    }

    private function testTaskLifecycleAndTransitions(): void {
        echo PHP_EOL . "--- 7. Testing Task Lifecycle & Stage Transitions ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();
        $employee = User::where('role', 'employee')->first();
        $task = Task::where('status', 'in_progress')->first() ?: Task::first();

        // 7.1 Put task on hold
        $res = $this->callApi('PUT', "/api/tasks/{$task->id}/hold", [
            'reason' => 'Awaiting client approval of design assets',
        ], $admin);
        $this->assert($res->getStatusCode() === 200, "Put Task On Hold with Reason");
        $task->refresh();
        $this->assert($task->status === 'on_hold', "Task Status Changed to 'on_hold'");

        // 7.2 Resume task
        $res = $this->callApi('PUT', "/api/tasks/{$task->id}/resume", [], $admin);
        $this->assert($res->getStatusCode() === 200, "Resume Task from Hold");
        $task->refresh();
        $this->assert($task->status === 'in_progress', "Task Status Restored to 'in_progress'");

        // 7.3 Post task comment
        $res = $this->callApi('POST', '/api/comments', [
            'task_id' => $task->id,
            'comment' => 'Initial milestone completed. Moving to review stage.',
        ], $employee);
        $this->assert($res->getStatusCode() === 201, "Post Team Communication / Comment");
    }

    private function testAttachmentsAndSecureDownloads(): void {
        echo PHP_EOL . "--- 8. Testing Deliverables & Secure Downloads (No 403) ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();
        $employee = User::where('role', 'employee')->first();
        $task = Task::first();

        // 8.1 Upload deliverable file
        $file = UploadedFile::fake()->create('Test_Deliverable_v1.pdf', 120, 'application/pdf');
        $res = $this->callApi('POST', '/api/attachments', [
            'task_id' => $task->id,
        ], $employee, ['file' => $file]);
        $data = json_decode($res->getContent(), true)['data'] ?? null;
        $this->assert($res->getStatusCode() === 201 && !empty($data['id']), "Upload Task Deliverable (PDF)");

        if ($data) {
            $attId = $data['id'];

            // 8.2 Admin Download
            $res = $this->callApi('GET', "/api/attachments/{$attId}/download", [], $admin);
            $this->assert($res->getStatusCode() === 200, "Admin Download Deliverable (HTTP 200 Stream, NO 403)");

            // 8.3 Employee Download
            $res = $this->callApi('GET', "/api/attachments/{$attId}/download", [], $employee);
            $this->assert($res->getStatusCode() === 200, "Employee Download Deliverable (HTTP 200 Stream, NO 403)");
        }
    }

    private function testSubmissionsAndReviews(): void {
        echo PHP_EOL . "--- 9. Testing Submissions & Multi-Tier Review Gates ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();
        $employee = User::where('role', 'employee')->first();
        
        // Create an explicit task for submission and review testing
        $task = Task::create([
            'title' => 'Submission Test Task ' . rand(100, 999),
            'description' => 'Stage review workflow',
            'handling_method' => 'assign',
            'creator_id' => $admin->id,
            'status' => 'in_progress',
            'priority' => 'high',
            'start_date' => now(),
            'due_date' => now()->addDays(5),
        ]);
        $branch = TaskBranch::create([
            'task_id' => $task->id,
            'owner_id' => $employee->id,
            'title' => 'Employee Stage 1',
            'status' => 'in_progress',
        ]);

        // 9.1 Submit task stage
        $res = $this->callApi('POST', "/api/tasks/{$task->id}/submit", [
            'description' => 'Stage 1 completion submission with deliverables',
            'task_branch_id' => $branch->id,
        ], $employee);
        $subData = json_decode($res->getContent(), true)['data'] ?? null;
        $this->assert($res->getStatusCode() === 201 && !empty($subData['id']), "Submit Deliverable for Review (Status 201)");

        if ($subData) {
            $subId = $subData['id'];

            // 9.2 Review: Return for Revision
            $res = $this->callApi('POST', "/api/submissions/{$subId}/review", [
                'decision' => 'returned',
                'comments' => 'Please update section 3 with the requested revisions.',
            ], $admin);
            $this->assert($res->getStatusCode() === 201, "Review Decision: Return for Revision (Status 201)");

            // 9.3 Employee re-submits
            $res = $this->callApi('POST', "/api/tasks/{$task->id}/submit", [
                'description' => 'Section 3 updated with required diagrams',
                'task_branch_id' => $branch->id,
            ], $employee);
            $newSub = json_decode($res->getContent(), true)['data'] ?? null;

            // 9.4 Review: Approval
            if ($newSub) {
                $res = $this->callApi('POST', "/api/submissions/{$newSub['id']}/review", [
                    'decision' => 'approved',
                    'comments' => 'Revisions confirmed. Approved!',
                ], $admin);
                $this->assert($res->getStatusCode() === 201, "Review Decision: Approved (Status 201)");

                // 9.5 Creator final submit
                $res = $this->callApi('POST', "/api/tasks/{$task->id}/final-submit", [], $admin);
                $this->assert($res->getStatusCode() === 200, "Creator Final Submission Completes Task (Status 200)");
                $task->refresh();
                $this->assert($task->status === 'completed', "Task Marked Fully Completed");
            }
        }
    }

    private function testAdminWorkLogsAndDossier(): void {
        echo PHP_EOL . "--- 10. Testing Admin Work Logs Separation Page & Audit Dossier ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();
        $employee = User::where('role', 'employee')->first();
        $task = Task::first();

        // 10.1 Work Logs Stats
        $res = $this->callApi('GET', '/api/work-logs/stats', [], $admin);
        $data = json_decode($res->getContent(), true)['data'] ?? [];
        $this->assert($res->getStatusCode() === 200 && isset($data['total_logs']), "Work Logs Stats Metrics API (Status 200)");

        // 10.2 Unified Stream Feed (All Events)
        $res = $this->callApi('GET', '/api/work-logs', [], $admin);
        $stream = json_decode($res->getContent(), true)['data'] ?? [];
        $this->assert($res->getStatusCode() === 200 && count($stream) > 0, "Company Work Logs Stream (Returned " . count($stream) . " entries)");

        // 10.3 Filter by event type
        $res = $this->callApi('GET', '/api/work-logs?type=comment', [], $admin);
        $this->assert($res->getStatusCode() === 200, "Filter Stream by Comments & Communications");

        // 10.4 Complete Task Journey Dossier
        $res = $this->callApi('GET', "/api/work-logs/task/{$task->id}", [], $admin);
        $dossier = json_decode($res->getContent(), true)['data'] ?? [];
        $this->assert($res->getStatusCode() === 200, "Task Journey Dossier API (Status 200)");
        $this->assert(isset($dossier['timeline']) && isset($dossier['conversations']) && isset($dossier['attachments']) && isset($dossier['branches']), "Dossier 4 Sub-Tabs Complete (Timeline, Conversations, Attachments Vault, Branches)");

        // 10.5 Security Check: Employee 403 Forbidden
        $res = $this->callApi('GET', '/api/work-logs', [], $employee);
        $this->assert($res->getStatusCode() === 403, "Security Guard: Employee Forbidden from Work Logs (403)");
    }

    private function testReportsAndNotifications(): void {
        echo PHP_EOL . "--- 11. Testing Reports & Notifications ---" . PHP_EOL;
        $admin = User::where('role', 'admin')->first();

        // 11.1 Reports
        $res = $this->callApi('GET', '/api/reports?range=last_30_days', [], $admin);
        $this->assert($res->getStatusCode() === 200, "Executive Reports & Analytics API (Status 200)");

        // 11.2 Notifications
        $res = $this->callApi('GET', '/api/notifications', [], $admin);
        $this->assert($res->getStatusCode() === 200, "User Notifications Feed (Status 200)");
    }
}

$verifier = new SystemVerifier($app);
$verifier->run();
