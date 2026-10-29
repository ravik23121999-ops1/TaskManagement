<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskAssignment;
use App\Models\TaskMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BranchMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_assigner_and_assignee_can_communicate_branch_wise()
    {
        $assigner = User::create([
            'name' => 'Assigner User',
            'email' => 'assigner@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $assignee = User::create([
            'name' => 'Assignee User',
            'email' => 'assignee@example.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $task = Task::create([
            'title' => 'Feature Implementation Task',
            'description' => 'Building feature',
            'creator_id' => $assigner->id,
            'handling_method' => 'assign',
            'priority' => 'medium',
            'status' => 'in_progress',
        ]);

        $branch = TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'Feature Implementation',
            'status' => 'in_progress',
            'owner_id' => $assignee->id,
        ]);

        TaskAssignment::create([
            'task_branch_id' => $branch->id,
            'assigned_by_id' => $assigner->id,
            'assigned_to_id' => $assignee->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // Assigner sends message to Assignee
        $response = $this->actingAs($assigner, 'sanctum')->postJson('/api/messages/send', [
            'task_id' => $task->id,
            'task_branch_id' => $branch->id,
            'recipient_id' => $assignee->id,
            'message' => 'Please provide the missing API docs.',
            'message_type' => 'missing_details_request',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('task_messages', [
            'task_branch_id' => $branch->id,
            'sender_id' => $assigner->id,
            'recipient_id' => $assignee->id,
            'message' => 'Please provide the missing API docs.',
            'message_type' => 'missing_details_request',
            'is_read' => false,
        ]);

        // Check unread count for assignee
        $unreadResp = $this->actingAs($assignee, 'sanctum')->getJson('/api/messages/unread-count');
        $unreadResp->assertStatus(200)->assertJson(['unread_count' => 1]);

        // Assignee opens thread, messages should be marked read
        $historyResp = $this->actingAs($assignee, 'sanctum')->getJson("/api/messages/threads/{$branch->id}?partner_id={$assigner->id}");
        $historyResp->assertStatus(200);
        $this->assertCount(1, $historyResp->json('messages'));

        // Verify message is now read
        $this->assertDatabaseHas('task_messages', [
            'task_branch_id' => $branch->id,
            'is_read' => true,
        ]);
    }

    public function test_same_level_assignee_cannot_access_other_branch_conversation()
    {
        $assigner = User::create([
            'name' => 'Manager User',
            'email' => 'manager@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $assignee1 = User::create([
            'name' => 'Assignee One',
            'email' => 'assignee1@example.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $assignee2 = User::create([
            'name' => 'Assignee Two',
            'email' => 'assignee2@example.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $task = Task::create([
            'title' => 'Collaborative Project',
            'description' => 'Multi-branch task',
            'creator_id' => $assigner->id,
            'handling_method' => 'collaborate',
            'priority' => 'high',
            'status' => 'in_progress',
        ]);

        // Branch 1 assigned to Assignee 1
        $branch1 = TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'Frontend Module',
            'status' => 'in_progress',
            'owner_id' => $assignee1->id,
        ]);
        TaskAssignment::create([
            'task_branch_id' => $branch1->id,
            'assigned_by_id' => $assigner->id,
            'assigned_to_id' => $assignee1->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // Message on Branch 1 between Assigner and Assignee 1
        TaskMessage::create([
            'task_id' => $task->id,
            'task_branch_id' => $branch1->id,
            'sender_id' => $assigner->id,
            'recipient_id' => $assignee1->id,
            'message' => 'Confidential feedback for Frontend.',
            'message_type' => 'text',
        ]);

        // Assignee 2 tries to access Branch 1's conversation -> MUST BE 403 FORBIDDEN
        $unauthorizedResp = $this->actingAs($assignee2, 'sanctum')->getJson("/api/messages/threads/{$branch1->id}?partner_id={$assignee1->id}");
        $unauthorizedResp->assertStatus(403);
    }

    public function test_work_alone_tasks_excluded_and_assigner_sees_assignees_and_collaborators()
    {
        $creator = User::create([
            'name' => 'Ravi Singh',
            'email' => 'ravi@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $assignee = User::create([
            'name' => 'Rohit Mehta',
            'email' => 'rohit@example.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        $collab = User::create([
            'name' => 'Aman Verma',
            'email' => 'aman@example.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
        ]);

        // 1. Work alone task - should NEVER show as a chat thread
        $workAloneTask = Task::create([
            'title' => 'Personal Work Alone Task',
            'description' => 'Self execution',
            'creator_id' => $creator->id,
            'handling_method' => 'work_alone',
            'priority' => 'low',
            'status' => 'in_progress',
        ]);
        $workAloneBranch = TaskBranch::create([
            'task_id' => $workAloneTask->id,
            'title' => 'Personal Work Alone Task',
            'status' => 'in_progress',
            'owner_id' => $creator->id,
        ]);
        TaskAssignment::create([
            'task_branch_id' => $workAloneBranch->id,
            'assigned_by_id' => $creator->id,
            'assigned_to_id' => $creator->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // 2. Assigned task with Collaborator
        $assignedTask = Task::create([
            'title' => 'Team Feature Task',
            'description' => 'Collaboration',
            'creator_id' => $creator->id,
            'handling_method' => 'collaborate',
            'priority' => 'high',
            'status' => 'in_progress',
        ]);
        $branch = TaskBranch::create([
            'task_id' => $assignedTask->id,
            'title' => 'Team Feature Task',
            'status' => 'in_progress',
            'owner_id' => $assignee->id,
        ]);
        TaskAssignment::create([
            'task_branch_id' => $branch->id,
            'assigned_by_id' => $creator->id,
            'assigned_to_id' => $assignee->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);
        \App\Models\TaskCollaborator::create([
            'task_branch_id' => $branch->id,
            'user_id' => $collab->id,
            'invited_by_id' => $creator->id,
            'can_assign' => true,
            'can_collaborate' => true,
            'invited_at' => now(),
        ]);

        // Ravi Singh checks My Chats
        $resp = $this->actingAs($creator, 'sanctum')->getJson('/api/messages/threads?tab=my_chats');
        $resp->assertStatus(200);

        $threads = $resp->json('threads');
        // Total threads should be 2 (Rohit Mehta + Aman Verma), NOT 3 (Work alone excluded!)
        $this->assertCount(2, $threads);

        // Verify Rohit Mehta is listed as Assignee
        $rohitThread = collect($threads)->firstWhere('partner.id', $assignee->id);
        $this->assertNotNull($rohitThread);
        $this->assertEquals('Rohit Mehta', $rohitThread['partner']['name']);
        $this->assertEquals('Assignee', $rohitThread['thread_role']);

        // Verify Aman Verma is listed as Collaborator
        $amanThread = collect($threads)->firstWhere('partner.id', $collab->id);
        $this->assertNotNull($amanThread);
        $this->assertEquals('Aman Verma', $amanThread['partner']['name']);
        $this->assertEquals('Collaborator', $amanThread['thread_role']);

        // Verify Ravi Singh is NEVER his own partner in any thread
        $selfThread = collect($threads)->firstWhere('partner.id', $creator->id);
        $this->assertNull($selfThread);
    }

    public function test_cannot_send_message_to_oneself()
    {
        $user = User::create([
            'name' => 'Self User',
            'email' => 'self@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $task = Task::create([
            'title' => 'Self Task',
            'description' => 'Test',
            'creator_id' => $user->id,
            'handling_method' => 'work_alone',
            'priority' => 'low',
            'status' => 'in_progress',
        ]);

        $branch = TaskBranch::create([
            'task_id' => $task->id,
            'title' => 'Self Branch',
            'status' => 'in_progress',
            'owner_id' => $user->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/messages/send', [
            'task_id' => $task->id,
            'task_branch_id' => $branch->id,
            'recipient_id' => $user->id,
            'message' => 'Hello myself',
        ]);

        $response->assertStatus(422);
    }
}
