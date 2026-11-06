<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BottomUpDelegationPrerequisiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_intermediate_assigner_cannot_submit_while_subordinates_are_incomplete(): void
    {
        $creator = User::factory()->create(['role' => 'employee', 'name' => 'Creator']);
        $lead = User::factory()->create(['role' => 'employee', 'name' => 'Checker']);
        $executor = User::factory()->create(['role' => 'employee', 'name' => 'Neha']);

        // 1. Task created with lead branch
        $task = Task::create([
            'title' => 'Project Alpha',
            'description' => 'Top level task',
            'handling_method' => 'assign',
            'creator_id' => $creator->id,
            'status' => 'in_progress',
        ]);

        $leadBranch = $task->branches()->create([
            'title' => 'Lead Scope',
            'description' => 'Lead work',
            'owner_id' => $lead->id,
            'status' => 'in_progress',
        ]);

        $leadAssignment = $leadBranch->assignments()->create([
            'assigned_to_id' => $lead->id,
            'assigned_by_id' => $creator->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // 2. Lead delegates further to executor
        $childBranch = $task->branches()->create([
            'title' => 'Subtask 1.2.1',
            'description' => 'Subordinate work',
            'owner_id' => $executor->id,
            'parent_assignment_id' => $leadAssignment->id,
            'status' => 'in_progress',
        ]);

        $childBranch->assignments()->create([
            'assigned_to_id' => $executor->id,
            'assigned_by_id' => $lead->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // 3. Lead attempts to submit work deliverables while child branch is still in_progress
        $leadAttempt1 = $this->actingAs($lead)->postJson("/api/tasks/{$task->id}/submit", [
            'description' => 'Lead trying to submit prematurely',
            'task_branch_id' => $leadBranch->id,
        ]);

        $leadAttempt1->assertStatus(422)
            ->assertJsonFragment([
                'message' => "Cannot submit work deliverables: You have delegated subtask(s) that are not yet completed or approved: ['Subtask 1.2.1' (Neha - In Progress)]. Under workflow policy, you must review and approve all subordinate deliverables before submitting your work upward.",
            ]);

        // 4. Executor submits their work -> status becomes 'review'
        $executorSubmit = $this->actingAs($executor)->postJson("/api/tasks/{$task->id}/submit", [
            'description' => 'Executor completed work',
            'task_branch_id' => $childBranch->id,
        ]);
        $executorSubmit->assertStatus(201);
        $this->assertEquals('review', $childBranch->fresh()->status);

        // 5. Lead attempts to submit deliverables while child branch is in 'review' (not yet approved by lead)
        $leadAttempt2 = $this->actingAs($lead)->postJson("/api/tasks/{$task->id}/submit", [
            'description' => 'Lead trying to submit before approving child work',
            'task_branch_id' => $leadBranch->id,
        ]);

        $leadAttempt2->assertStatus(422)
            ->assertJsonFragment([
                'message' => "Cannot submit work deliverables: You have delegated subtask(s) that are not yet completed or approved: ['Subtask 1.2.1' (Neha - Awaiting Your Review)]. Under workflow policy, you must review and approve all subordinate deliverables before submitting your work upward.",
            ]);

        // 6. Lead reviews and approves executor submission
        $executorSubmission = TaskSubmission::where('task_branch_id', $childBranch->id)->first();
        $reviewResponse = $this->actingAs($lead)->postJson("/api/submissions/{$executorSubmission->id}/review", [
            'decision' => 'approved',
            'comments' => 'Looks great!',
        ]);
        $reviewResponse->assertStatus(201);
        $this->assertEquals('completed', $childBranch->fresh()->status);

        // 7. Now that child branch is approved & completed, Lead submits deliverables upward -> SUCCESS!
        $leadAttempt3 = $this->actingAs($lead)->postJson("/api/tasks/{$task->id}/submit", [
            'description' => 'All subordinate work verified and lead deliverable ready.',
            'task_branch_id' => $leadBranch->id,
        ]);
        $leadAttempt3->assertStatus(201);
        $this->assertEquals('review', $leadBranch->fresh()->status);
    }
}
