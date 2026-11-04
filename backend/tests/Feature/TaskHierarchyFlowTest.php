<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskHierarchyFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $creator;
    protected User $leadA;
    protected User $leadB;
    protected User $subLead1;
    protected User $subLead2;
    protected User $executor1;
    protected User $executor2;
    protected User $extraUser;
    protected Department $department;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::create(['name' => 'Engineering']);
        $this->creator = User::factory()->create(['role' => 'admin', 'department_id' => $this->department->id]);
        $this->leadA = User::factory()->create(['name' => 'Aman Kumar', 'role' => 'employee', 'department_id' => $this->department->id]);
        $this->leadB = User::factory()->create(['name' => 'Pooja Sharma', 'role' => 'employee', 'department_id' => $this->department->id]);
        $this->subLead1 = User::factory()->create(['name' => 'Rohit Mehta', 'role' => 'employee', 'department_id' => $this->department->id]);
        $this->subLead2 = User::factory()->create(['name' => 'Neha Rawat', 'role' => 'employee', 'department_id' => $this->department->id]);
        $this->executor1 = User::factory()->create(['name' => 'Karan Sharma', 'role' => 'employee', 'department_id' => $this->department->id]);
        $this->executor2 = User::factory()->create(['name' => 'Anjali', 'role' => 'employee', 'department_id' => $this->department->id]);
        $this->extraUser = User::factory()->create(['name' => 'Saurav', 'role' => 'employee', 'department_id' => $this->department->id]);
    }

    public function test_four_level_hierarchical_codes_and_summary_generation(): void
    {
        // 1. Creator creates Level 1 Task with 2 Team Leads (Level 2)
        $response = $this->actingAs($this->creator)->postJson('/api/tasks', [
            'title' => 'Project: QuickLifeNow v2',
            'description' => 'Main Task Description',
            'handling_method' => 'assign',
            'priority' => 'high',
            'department_id' => $this->department->id,
            'branches' => [
                [
                    'owner_id' => $this->leadA->id,
                    'title' => 'Frontend Module',
                    'description' => 'Aman Lead Frontend',
                ],
                [
                    'owner_id' => $this->leadB->id,
                    'title' => 'Backend Module',
                    'description' => 'Pooja Lead Backend',
                ],
            ],
        ]);

        $response->assertStatus(201);
        $taskId = $response->json('data.id');
        $baseCode = sprintf('QL-%04d', $taskId);

        // Fetch task details
        $taskRes = $this->actingAs($this->creator)->getJson("/api/tasks/{$taskId}");
        $taskRes->assertStatus(200);

        $branches = $taskRes->json('data.branches');
        $this->assertCount(2, $branches);
        $this->assertEquals("{$baseCode}.1", $branches[0]['hierarchical_code']);
        $this->assertEquals(2, $branches[0]['level']);
        $this->assertEquals("{$baseCode}.2", $branches[1]['hierarchical_code']);
        $this->assertEquals(2, $branches[1]['level']);

        $summary = $taskRes->json('data.hierarchy_summary');
        $this->assertEquals(1, $summary['level_1_count']);
        $this->assertEquals(2, $summary['level_2_count']);
        $this->assertEquals(0, $summary['level_3_count']);
        $this->assertEquals(0, $summary['level_4_count']);

        // 2. Lead A (Aman) delegates to 2 Sub Leads (Level 3)
        $delRes1 = $this->actingAs($this->leadA)->postJson("/api/tasks/{$taskId}/assignees", [
            'user_ids' => [$this->subLead1->id, $this->subLead2->id],
            'branches' => [
                [
                    'owner_id' => $this->subLead1->id,
                    'title' => 'UI Development',
                    'description' => 'Rohit subtask',
                ],
                [
                    'owner_id' => $this->subLead2->id,
                    'title' => 'Integration & API',
                    'description' => 'Neha subtask',
                ],
            ],
        ]);
        $delRes1->assertStatus(200);

        // Check hierarchy with Level 3 added
        $taskRes2 = $this->actingAs($this->creator)->getJson("/api/tasks/{$taskId}");
        $branches2 = $taskRes2->json('data.branches');
        $this->assertCount(4, $branches2);

        $subLead1Branch = collect($branches2)->firstWhere('owner.id', $this->subLead1->id);
        $this->assertEquals("{$baseCode}.1.1", $subLead1Branch['hierarchical_code']);
        $this->assertEquals(3, $subLead1Branch['level']);
        $this->assertTrue($subLead1Branch['can_assign_further']);

        // 3. SubLead 1 (Rohit) delegates to 2 Executors (Level 4)
        $delRes2 = $this->actingAs($this->subLead1)->postJson("/api/tasks/{$taskId}/assignees", [
            'user_ids' => [$this->executor1->id, $this->executor2->id],
            'branches' => [
                [
                    'owner_id' => $this->executor1->id,
                    'title' => 'UI Pages',
                    'description' => 'Karan execute UI pages',
                ],
                [
                    'owner_id' => $this->executor2->id,
                    'title' => 'Components',
                    'description' => 'Anjali execute components',
                ],
            ],
        ]);
        $delRes2->assertStatus(200);

        // Check hierarchy with Level 4 added
        $taskRes3 = $this->actingAs($this->creator)->getJson("/api/tasks/{$taskId}");
        $branches3 = $taskRes3->json('data.branches');
        $this->assertCount(6, $branches3);

        $exec1Branch = collect($branches3)->firstWhere('owner.id', $this->executor1->id);
        $this->assertEquals("{$baseCode}.1.1.1", $exec1Branch['hierarchical_code']);
        $this->assertEquals(4, $exec1Branch['level']);
        $this->assertFalse($exec1Branch['can_assign_further']); // Capped at Level 4!

        $exec2Branch = collect($branches3)->firstWhere('owner.id', $this->executor2->id);
        $this->assertEquals("{$baseCode}.1.1.2", $exec2Branch['hierarchical_code']);
        $this->assertEquals(4, $exec2Branch['level']);
        $this->assertFalse($exec2Branch['can_assign_further']);

        $summary3 = $taskRes3->json('data.hierarchy_summary');
        $this->assertEquals(1, $summary3['level_1_count']);
        $this->assertEquals(2, $summary3['level_2_count']);
        $this->assertEquals(2, $summary3['level_3_count']);
        $this->assertEquals(2, $summary3['level_4_count']);
        $this->assertEquals(6, $summary3['total_assignments']);

        // 4. Executor 1 (Karan, at Level 4) attempts to delegate further -> must be REJECTED!
        $delRes3 = $this->actingAs($this->executor1)->postJson("/api/tasks/{$taskId}/assignees", [
            'user_ids' => [$this->extraUser->id],
            'branches' => [
                [
                    'owner_id' => $this->extraUser->id,
                    'title' => 'Sub-executor task',
                    'description' => 'Should fail due to level 4 capping',
                ],
            ],
        ]);

        $delRes3->assertStatus(422);
        $this->assertStringContainsString('capped at Level 4', $delRes3->json('message'));
    }
}
