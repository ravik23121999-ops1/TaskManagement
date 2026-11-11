<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Task;
use App\Models\Department;
use App\Models\TaskSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class HierarchicalPauseRightsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $creator;
    private User $assigner;
    private User $leafAssignee;
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
            'email' => 'admin@pause-test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'department_id' => $this->dept->id,
        ]);

        $this->creator = User::create([
            'name' => 'Creator User',
            'email' => 'creator@pause-test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'department_id' => $this->dept->id,
        ]);

        $this->assigner = User::create([
            'name' => 'Priya Assigner',
            'email' => 'priya@pause-test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'department_id' => $this->dept->id,
        ]);

        $this->leafAssignee = User::create([
            'name' => 'Checker Worker',
            'email' => 'checker@pause-test.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'department_id' => $this->dept->id,
        ]);
    }

    public function test_dynamic_pause_rights_lifecycle_across_delegation(): void
    {
        // 1. Creator creates Task
        $task = Task::create([
            'title' => 'Financial Audit 2026',
            'description' => 'Multi-level audit with sub-delegation',
            'handling_method' => 'assign',
            'status' => 'in_progress',
            'creator_id' => $this->creator->id,
            'department_id' => $this->dept->id,
        ]);

        // Level 2 branch: Creator assigns Priya Assigner
        $bPriya = $task->branches()->create([
            'title' => 'Audit Core - Priya',
            'owner_id' => $this->assigner->id,
            'status' => 'in_progress',
        ]);
        $priyaAssignment = $bPriya->assignments()->create([
            'assigned_to_id' => $this->assigner->id,
            'assigned_by_id' => $this->creator->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // Level 3 branch: Priya delegates further to Checker Worker (Leaf Node)
        $bChecker = $task->branches()->create([
            'title' => 'Audit Verification - Checker',
            'owner_id' => $this->leafAssignee->id,
            'parent_assignment_id' => $priyaAssignment->id,
            'status' => 'in_progress',
        ]);
        $bChecker->assignments()->create([
            'assigned_to_id' => $this->leafAssignee->id,
            'assigned_by_id' => $this->assigner->id,
            'is_current' => true,
            'assigned_at' => now()->addMinute(),
        ]);

        // ---------------------------------------------------------------------
        // PHASE 1: Leaf Node is actively working (status: in_progress)
        // ---------------------------------------------------------------------
        // Checker (Leaf Node) MUST have can_hold = true
        $resChecker = $this->actingAs($this->leafAssignee)->getJson("/api/tasks/{$task->id}");
        $resChecker->assertStatus(200);
        $this->assertTrue($resChecker->json('data.permissions.can_hold'));

        // Priya (Assigner who delegated further) MUST have can_hold = false
        $resPriya = $this->actingAs($this->assigner)->getJson("/api/tasks/{$task->id}");
        $resPriya->assertStatus(200);
        $this->assertFalse($resPriya->json('data.permissions.can_hold'));

        // Calling /hold as Priya MUST return 403 Forbidden
        $holdAttemptPriya = $this->actingAs($this->assigner)->putJson("/api/tasks/{$task->id}/hold", [
            'reason' => 'Assigner trying to hold while subordinate works',
        ]);
        $holdAttemptPriya->assertStatus(403);

        // Checker (Leaf Node) puts task on hold -> MUST succeed
        $holdResChecker = $this->actingAs($this->leafAssignee)->putJson("/api/tasks/{$task->id}/hold", [
            'reason' => 'Waiting for bank statement documents',
        ]);
        $holdResChecker->assertStatus(200);
        $this->assertEquals('on_hold', $task->fresh()->status);

        // Checker can resume task -> MUST succeed
        $resumeRes = $this->actingAs($this->leafAssignee)->putJson("/api/tasks/{$task->id}/resume");
        $resumeRes->assertStatus(200);
        $this->assertEquals('in_progress', $task->fresh()->status);

        // ---------------------------------------------------------------------
        // PHASE 2: Leaf Node SUBMITS work for review (status: review)
        // ---------------------------------------------------------------------
        $bChecker->update(['status' => 'review']);
        $submission = TaskSubmission::create([
            'task_id' => $task->id,
            'task_branch_id' => $bChecker->id,
            'submitted_by_id' => $this->leafAssignee->id,
            'description' => 'Verification deliverables submitted for review',
            'is_final' => true,
            'submitted_at' => now(),
        ]);

        // Checker (Leaf Node) has submitted -> MUST have can_hold = false
        $resCheckerSubmitted = $this->actingAs($this->leafAssignee)->getJson("/api/tasks/{$task->id}");
        $resCheckerSubmitted->assertStatus(200);
        $this->assertFalse($resCheckerSubmitted->json('data.permissions.can_hold'));

        // Priya (Assigner / Reviewer) now holds the review action -> MUST have can_hold = true!
        $resPriyaReviewing = $this->actingAs($this->assigner)->getJson("/api/tasks/{$task->id}");
        $resPriyaReviewing->assertStatus(200);
        $this->assertTrue($resPriyaReviewing->json('data.permissions.can_hold'));

        // Priya puts task on hold during review -> MUST succeed
        $holdPriyaReview = $this->actingAs($this->assigner)->putJson("/api/tasks/{$task->id}/hold", [
            'reason' => 'Reviewer verifying external ledger records',
        ]);
        $holdPriyaReview->assertStatus(200);
        $this->assertEquals('on_hold', $task->fresh()->status);

        // Resume back to active review
        $this->actingAs($this->assigner)->putJson("/api/tasks/{$task->id}/resume")->assertStatus(200);

        // ---------------------------------------------------------------------
        // PHASE 3: Assigner APPROVES subordinate's work!
        // Now assigner holds the consolidated work to submit upward to Creator
        // ---------------------------------------------------------------------
        $bChecker->update(['status' => 'completed']);

        // Priya Assigner now holds their own deliverable to submit upward -> MUST have can_hold = true!
        $resPriyaApproved = $this->actingAs($this->assigner)->getJson("/api/tasks/{$task->id}");
        $resPriyaApproved->assertStatus(200);
        $this->assertTrue($resPriyaApproved->json('data.permissions.can_hold'));

        // Priya puts task on hold -> MUST succeed
        $holdPriyaFinal = $this->actingAs($this->assigner)->putJson("/api/tasks/{$task->id}/hold", [
            'reason' => 'Consolidating overall audit report before submitting to creator',
        ]);
        $holdPriyaFinal->assertStatus(200);

        // Admin can always resume
        $this->actingAs($this->admin)->putJson("/api/tasks/{$task->id}/resume")->assertStatus(200);
        $this->assertEquals('in_progress', $task->fresh()->status);
    }
}
