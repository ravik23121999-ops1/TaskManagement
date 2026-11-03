<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class ImpersonationAndUserPasswordTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $subAdmin;
    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $dept = Department::create(['name' => 'Engineering', 'description' => 'Software']);

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'department_id' => $dept->id,
            'encrypted_password' => Crypt::encryptString('adminPass123'),
        ]);

        $this->subAdmin = User::factory()->create([
            'role' => 'sub_admin',
            'department_id' => $dept->id,
            'encrypted_password' => Crypt::encryptString('subAdminPass123'),
        ]);

        $this->employee = User::factory()->create([
            'role' => 'employee',
            'department_id' => $dept->id,
            'encrypted_password' => Crypt::encryptString('empSecretPass'),
        ]);
    }

    public function test_admin_can_impersonate_employee(): void
    {
        $res = $this->actingAs($this->admin)->postJson("/api/auth/impersonate/{$this->employee->id}");

        $res->assertStatus(200);
        $res->assertJsonStructure([
            'data' => [
                'token',
                'user' => ['id', 'name', 'email', 'role'],
                'impersonator' => ['id', 'name', 'email', 'role'],
            ],
        ]);
        $this->assertEquals($this->employee->id, $res->json('data.user.id'));
        $this->assertEquals($this->admin->id, $res->json('data.impersonator.id'));
    }

    public function test_cannot_impersonate_self(): void
    {
        $res = $this->actingAs($this->admin)->postJson("/api/auth/impersonate/{$this->admin->id}");
        $res->assertStatus(422);
    }

    public function test_subadmin_cannot_impersonate_without_permission(): void
    {
        SystemSetting::set('allow_subadmin_impersonate', false);

        $res = $this->actingAs($this->subAdmin)->postJson("/api/auth/impersonate/{$this->employee->id}");
        $res->assertStatus(403);
    }

    public function test_subadmin_can_impersonate_employee_when_permitted(): void
    {
        SystemSetting::set('allow_subadmin_impersonate', true);

        $res = $this->actingAs($this->subAdmin)->postJson("/api/auth/impersonate/{$this->employee->id}");
        $res->assertStatus(200);
        $this->assertEquals($this->employee->id, $res->json('data.user.id'));

        // But Sub-Admin CANNOT impersonate Admin even if permitted
        $adminRes = $this->actingAs($this->subAdmin)->postJson("/api/auth/impersonate/{$this->admin->id}");
        $adminRes->assertStatus(403);
    }

    public function test_employee_cannot_impersonate_anyone(): void
    {
        $res = $this->actingAs($this->employee)->postJson("/api/auth/impersonate/{$this->admin->id}");
        $res->assertStatus(403);
    }

    public function test_admin_can_view_decrypted_password(): void
    {
        $res = $this->actingAs($this->admin)->getJson('/api/users');
        $res->assertStatus(200);

        $users = $res->json('data');
        $empItem = collect($users)->firstWhere('id', $this->employee->id);
        $this->assertNotNull($empItem);
        $this->assertEquals('empSecretPass', $empItem['plain_password']);
    }

    public function test_employee_cannot_view_plain_password(): void
    {
        $res = $this->actingAs($this->employee)->getJson('/api/users');
        $res->assertStatus(200);

        $users = $res->json('data');
        foreach ($users as $u) {
            $this->assertArrayNotHasKey('plain_password', $u);
        }
    }
}
