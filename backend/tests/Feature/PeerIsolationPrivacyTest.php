<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Task;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PeerIsolationPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee1;
    private User $employee2;
    private Department $dept;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dept = Department::create([
            'name' => 'Operations',
            'code' => 'OPS',
        ]);

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@privacy-test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'department_id' => $this->dept->id,
        ]);

        $this->employee1 = User::create([
            'name' => 'Reviewer User',
            'email' => 'reviewer@privacy-test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'department_id' => $this->dept->id,
        ]);

        $this->employee2 = User::create([
            'name' => 'Checker User',
            'email' => 'checker@privacy-test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'department_id' => $this->dept->id,
        ]);
    }

    public function test_assignees_never_see_peer_assignees_in_current_owners_or_activity_history(): void
    {
        // Admin creates a task assigning both Employee 1 (Reviewer) and Employee 2 (Checker)
        $createRes = $this->actingAs($this->admin)->postJson('/api/tasks', [
            'title' => 'Cross-Department Audit Project',
            'description' => 'Confidential audit with parallel isolated subtasks',
            'handling_method' => 'assign',
            'due_date' => now()->addDays(5)->toDateString(),
            'assignees' => [$this->employee1->id, $this->employee2->id],
        ]);

        $createRes->assertStatus(201);
        $taskId = $createRes->json('data.id');

        // Admin adds a comment and Employee 2 adds a comment
        $this->actingAs($this->employee2)->postJson("/api/tasks/{$taskId}/comments", [
            'comment' => 'Private update from Checker User',
        ]);

        // 1. Verify Employee 1 (Reviewer) perspective:
        // Must NEVER know Employee 2 (Checker) is assigned!
        $emp1Res = $this->actingAs($this->employee1)->getJson("/api/tasks/{$taskId}");
        $emp1Res->assertStatus(200);

        // a) Current owners must strictly contain ONLY Employee 1
        $emp1CurrentOwners = $emp1Res->json('data.current_owners');
        $this->assertCount(1, $emp1CurrentOwners);
        $this->assertEquals($this->employee1->id, $emp1CurrentOwners[0]['id']);
        $this->assertEquals('Reviewer User', $emp1CurrentOwners[0]['name']);
        $this->assertEquals($this->employee1->id, $emp1Res->json('data.current_owner.id'));

        // b) Branches must strictly contain ONLY Employee 1's branch
        $emp1Branches = $emp1Res->json('data.branches');
        $this->assertCount(1, $emp1Branches);
        $this->assertEquals($this->employee1->id, $emp1Branches[0]['owner']['id']);

        // c) Status history must NOT mention Employee 2 (Checker)
        $emp1History = $emp1Res->json('data.status_history');
        foreach ($emp1History as $h) {
            $reason = strtolower($h['reason'] ?? '');
            $this->assertStringNotContainsString('checker user', $reason);
            $this->assertStringNotContainsString('checker@privacy-test.com', $reason);
        }

        // d) Comments must NOT contain Employee 2's comment
        $emp1Comments = $emp1Res->json('data.comments');
        foreach ($emp1Comments as $c) {
            $this->assertNotEquals($this->employee2->id, $c['user']['id']);
        }

        // 2. Verify Employee 2 (Checker) perspective:
        // Must NEVER know Employee 1 (Reviewer) is assigned!
        $emp2Res = $this->actingAs($this->employee2)->getJson("/api/tasks/{$taskId}");
        $emp2Res->assertStatus(200);

        // a) Current owners must strictly contain ONLY Employee 2
        $emp2CurrentOwners = $emp2Res->json('data.current_owners');
        $this->assertCount(1, $emp2CurrentOwners);
        $this->assertEquals($this->employee2->id, $emp2CurrentOwners[0]['id']);
        $this->assertEquals('Checker User', $emp2CurrentOwners[0]['name']);
        $this->assertEquals($this->employee2->id, $emp2Res->json('data.current_owner.id'));

        // b) Branches must strictly contain ONLY Employee 2's branch
        $emp2Branches = $emp2Res->json('data.branches');
        $this->assertCount(1, $emp2Branches);
        $this->assertEquals($this->employee2->id, $emp2Branches[0]['owner']['id']);

        // c) Status history must NOT mention Employee 1 (Reviewer)
        $emp2History = $emp2Res->json('data.status_history');
        foreach ($emp2History as $h) {
            $reason = strtolower($h['reason'] ?? '');
            $this->assertStringNotContainsString('reviewer user', $reason);
            $this->assertStringNotContainsString('reviewer@privacy-test.com', $reason);
        }

        // 3. Verify Admin (Creator/Overseer) perspective:
        // Oversees ALL branches and current owners
        $adminRes = $this->actingAs($this->admin)->getJson("/api/tasks/{$taskId}");
        $adminRes->assertStatus(200);
        $adminCurrentOwners = $adminRes->json('data.current_owners');
        $this->assertCount(2, $adminCurrentOwners);
        $adminOwnerIds = collect($adminCurrentOwners)->pluck('id')->all();
        $this->assertContains($this->employee1->id, $adminOwnerIds);
        $this->assertContains($this->employee2->id, $adminOwnerIds);
        $this->assertCount(2, $adminRes->json('data.branches'));
    }
}
