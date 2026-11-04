<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee1;
    private User $employee2;
    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $dept = Department::create(['name' => 'Engineering', 'description' => 'Software']);

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'department_id' => $dept->id,
            'is_active' => true,
            'password' => Hash::make('password123'),
        ]);

        $this->employee1 = User::factory()->create([
            'role' => 'employee',
            'department_id' => $dept->id,
            'is_active' => true,
            'password' => Hash::make('password123'),
        ]);

        $this->employee2 = User::factory()->create([
            'role' => 'employee',
            'department_id' => $dept->id,
            'is_active' => true,
            'password' => Hash::make('password123'),
        ]);

        $this->task = Task::create([
            'title' => 'Secure Task',
            'description' => 'Confidential Work',
            'handling_method' => 'delegate',
            'creator_id' => $this->admin->id,
            'status' => 'in_progress',
        ]);
        $branch = $this->task->branches()->create([
            'title' => 'Assigned Subtask',
            'owner_id' => $this->employee1->id,
            'status' => 'in_progress',
        ]);
        $branch->assignments()->create([
            'task_id' => $this->task->id,
            'assigned_by_id' => $this->admin->id,
            'assigned_to_id' => $this->employee1->id,
            'assigned_at' => now(),
            'is_current' => true,
        ]);
    }

    public function test_login_does_not_enumerate_users_via_status_code(): void
    {
        // 1. Non-existent email should return 401 (not 422 validation failure)
        $resNonExistent = $this->postJson('/api/auth/login', [
            'email' => 'doesnotexist@nowhere.com',
            'password' => 'somePassword123',
        ]);
        $resNonExistent->assertStatus(401);

        // 2. Existing email with incorrect password should also return 401
        $resWrongPassword = $this->postJson('/api/auth/login', [
            'email' => $this->admin->email,
            'password' => 'wrongPassword',
        ]);
        $resWrongPassword->assertStatus(401);
    }

    public function test_deactivated_user_cannot_login(): void
    {
        $this->employee1->update(['is_active' => false]);

        $res = $this->postJson('/api/auth/login', [
            'email' => $this->employee1->email,
            'password' => 'password123',
        ]);

        $res->assertStatus(403);
    }

    public function test_deactivating_user_revokes_active_tokens(): void
    {
        $token = $this->employee1->createToken('test-token')->plainTextToken;

        // Verify token works
        $check = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/auth/me');
        $check->assertStatus(200);

        // Admin deactivates employee
        $deactivateRes = $this->actingAs($this->admin)->putJson("/api/users/{$this->employee1->id}/deactivate");
        $deactivateRes->assertStatus(200);

        // Clear test actingAs session state
        app('auth')->forgetGuards();

        // Old token should be deleted from DB and now rejected with 401
        $rejectedCheck = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/auth/me');
        $rejectedCheck->assertStatus(401);
    }

    public function test_unassigned_user_cannot_upload_attachment_to_task(): void
    {
        $file = UploadedFile::fake()->create('report.pdf', 100, 'application/pdf');

        // Employee 2 is NOT a participant or creator of this task
        $res = $this->actingAs($this->employee2)->postJson('/api/attachments', [
            'task_id' => $this->task->id,
            'file' => $file,
        ]);

        $res->assertStatus(403);

        // Assigned Employee 1 CAN upload
        $resAllowed = $this->actingAs($this->employee1)->postJson('/api/attachments', [
            'task_id' => $this->task->id,
            'file' => $file,
        ]);

        $resAllowed->assertStatus(201);
    }

    public function test_executable_files_are_rejected_from_uploads(): void
    {
        $phpFile = UploadedFile::fake()->create('shell.php', 50, 'application/x-php');

        $res = $this->actingAs($this->employee1)->postJson('/api/attachments', [
            'task_id' => $this->task->id,
            'file' => $phpFile,
        ]);

        $res->assertStatus(422);
    }
}
