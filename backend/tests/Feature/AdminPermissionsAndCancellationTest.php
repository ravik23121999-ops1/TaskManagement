<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Task;
use App\Models\Department;
use App\Models\SystemSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AdminPermissionsAndCancellationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed default system settings
        SystemSetting::updateOrCreate(
            ['key' => 'allow_subadmin_delete_records'],
            ['value' => 'false', 'type' => 'boolean']
        );
        SystemSetting::updateOrCreate(
            ['key' => 'allow_subadmin_cancel_tasks'],
            ['value' => 'false', 'type' => 'boolean']
        );
        SystemSetting::clearCache();
    }

    public function test_admin_can_update_system_settings_but_subadmin_cannot()
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $subAdmin = User::create([
            'name' => 'Sub Admin',
            'email' => 'subadmin@test.com',
            'password' => bcrypt('password'),
            'role' => 'sub_admin',
        ]);

        // Sub-admin attempting to update system settings fails (403)
        $subRes = $this->actingAs($subAdmin, 'sanctum')->putJson('/api/settings/system', [
            'allow_subadmin_delete_records' => true,
        ]);
        $subRes->assertStatus(403);

        // Admin updating settings succeeds (200)
        $adminRes = $this->actingAs($admin, 'sanctum')->putJson('/api/settings/system', [
            'allow_subadmin_delete_records' => true,
            'allow_subadmin_cancel_tasks' => true,
        ]);
        $adminRes->assertStatus(200);
        $this->assertTrue(SystemSetting::get('allow_subadmin_delete_records'));
        $this->assertTrue(SystemSetting::get('allow_subadmin_cancel_tasks'));
    }

    public function test_creator_can_cancel_own_task_with_reason_note()
    {
        $creator = User::create([
            'name' => 'Task Creator',
            'email' => 'creator@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $task = Task::create([
            'title' => 'Creator Own Task',
            'description' => 'Test task',
            'creator_id' => $creator->id,
            'handling_method' => 'work_alone',
            'priority' => 'medium',
            'status' => 'in_progress',
        ]);

        // Missing reason note fails validation
        $failRes = $this->actingAs($creator, 'sanctum')->postJson("/api/tasks/{$task->id}/cancel", [
            'reason' => 'ab',
        ]);
        $failRes->assertStatus(422);

        // Valid reason note succeeds
        $res = $this->actingAs($creator, 'sanctum')->postJson("/api/tasks/{$task->id}/cancel", [
            'reason' => 'Project scope changed by client, cancelling task.',
        ]);
        $res->assertStatus(200);

        $task->refresh();
        $this->assertEquals('cancelled', $task->status);
        $this->assertEquals($creator->id, $task->cancelled_by_id);
        $this->assertEquals('Project scope changed by client, cancelling task.', $task->cancellation_reason);
        $this->assertNotNull($task->cancelled_at);
    }

    public function test_subadmin_cannot_cancel_others_task_unless_permission_is_granted()
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_task@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $subAdmin = User::create([
            'name' => 'Sub Admin User',
            'email' => 'subadmin_task@test.com',
            'password' => bcrypt('password'),
            'role' => 'sub_admin',
        ]);

        $task = Task::create([
            'title' => 'Admin Created Task',
            'description' => 'Created by admin',
            'creator_id' => $admin->id,
            'handling_method' => 'work_alone',
            'priority' => 'high',
            'status' => 'in_progress',
        ]);

        // Default setting: allow_subadmin_cancel_tasks = false -> sub-admin is blocked
        $deniedRes = $this->actingAs($subAdmin, 'sanctum')->postJson("/api/tasks/{$task->id}/cancel", [
            'reason' => 'Attempting cancellation without permission',
        ]);
        $deniedRes->assertStatus(403);

        // Admin grants permission
        SystemSetting::set('allow_subadmin_cancel_tasks', true, 'boolean');

        // Sub-admin can now cancel
        $allowedRes = $this->actingAs($subAdmin, 'sanctum')->postJson("/api/tasks/{$task->id}/cancel", [
            'reason' => 'Authorized cancellation by sub-admin per company policy',
        ]);
        $allowedRes->assertStatus(200);

        $task->refresh();
        $this->assertEquals('cancelled', $task->status);
        $this->assertEquals($subAdmin->id, $task->cancelled_by_id);
    }

    public function test_subadmin_cannot_delete_records_unless_permission_is_granted()
    {
        $subAdmin = User::create([
            'name' => 'Sub Admin Delete Test',
            'email' => 'subadmin_del@test.com',
            'password' => bcrypt('password'),
            'role' => 'sub_admin',
        ]);

        $targetUser = User::create([
            'name' => 'Target User',
            'email' => 'target@test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $dept = Department::create([
            'name' => 'Temporary Dept',
            'description' => 'To be deleted',
            'is_active' => true,
        ]);

        // 1. Setting is false: SubAdmin cannot delete user
        $delUserDenied = $this->actingAs($subAdmin, 'sanctum')->deleteJson("/api/users/{$targetUser->id}");
        $delUserDenied->assertStatus(403);

        // 2. Setting is false: SubAdmin cannot delete department
        $delDeptDenied = $this->actingAs($subAdmin, 'sanctum')->deleteJson("/api/departments/{$dept->id}");
        $delDeptDenied->assertStatus(403);

        // 3. Admin grants permission
        SystemSetting::set('allow_subadmin_delete_records', true, 'boolean');

        // 4. SubAdmin can now delete user
        $delUserOk = $this->actingAs($subAdmin, 'sanctum')->deleteJson("/api/users/{$targetUser->id}");
        $delUserOk->assertStatus(200);
        $this->assertNull(User::find($targetUser->id));

        // 5. SubAdmin can now delete department
        $delDeptOk = $this->actingAs($subAdmin, 'sanctum')->deleteJson("/api/departments/{$dept->id}");
        $delDeptOk->assertStatus(200);
        $this->assertNull(Department::find($dept->id));
    }

    public function test_cancelled_tasks_endpoint_returns_archived_records()
    {
        $admin = User::create([
            'name' => 'Admin Archive',
            'email' => 'admin_arch@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $task = Task::create([
            'title' => 'Cancelled Showcase Task',
            'description' => 'Testing archive list',
            'creator_id' => $admin->id,
            'handling_method' => 'work_alone',
            'priority' => 'low',
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => 'Duplicate requirement submitted in error.',
            'cancelled_by_id' => $admin->id,
        ]);

        $res = $this->actingAs($admin, 'sanctum')->getJson('/api/tasks?status=cancelled');
        $res->assertStatus(200);
        $res->assertJsonFragment([
            'id' => $task->id,
            'status' => 'cancelled',
            'cancellation_reason' => 'Duplicate requirement submitted in error.',
        ]);
        $res->assertJsonFragment([
            'name' => 'Admin Archive',
        ]);
    }
}
