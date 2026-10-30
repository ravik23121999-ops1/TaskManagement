<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Department;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskAssignment;
use App\Models\TaskCollaborator;
use App\Models\TaskMessage;
use App\Models\TaskSubmission;
use App\Models\TaskReview;
use App\Models\TaskComment;
use App\Models\TaskHoldRecord;
use App\Models\TaskStatusHistory;
use App\Models\ActivityLog;
use App\Models\SystemNotification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Core Enterprise Departments
        $deptIT = Department::updateOrCreate(['name' => 'IT'], [
            'description' => 'Information Technology & Software Infrastructure',
            'is_active' => true,
        ]);
        $deptHR = Department::updateOrCreate(['name' => 'HR'], [
            'description' => 'Human Resources & Talent Management',
            'is_active' => true,
        ]);
        $deptSales = Department::updateOrCreate(['name' => 'Sales'], [
            'description' => 'Sales & Business Development',
            'is_active' => true,
        ]);
        $deptOps = Department::updateOrCreate(['name' => 'Operations'], [
            'description' => 'Operations, Facilities & Logistics',
            'is_active' => true,
        ]);
        $deptFinance = Department::updateOrCreate(['name' => 'Finance'], [
            'description' => 'Finance, Payroll & Corporate Accounting',
            'is_active' => true,
        ]);
        $deptMarketing = Department::updateOrCreate(['name' => 'Marketing'], [
            'description' => 'Marketing, Branding & Communications',
            'is_active' => true,
        ]);

        // 2. Verified Corporate Users
        $admin = User::updateOrCreate(['email' => 'admin@example.com'], [
            'name' => 'Admin User',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/admin_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        $ravi = User::updateOrCreate(['email' => 'ravi@company.com'], [
            'name' => 'Ravi Singh',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/admin_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        $priya = User::updateOrCreate(['email' => 'priya@company.com'], [
            'name' => 'Priya Sharma',
            'password' => Hash::make('password'),
            'role' => 'sub_admin',
            'gender' => 'female',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/sub_admin_female.png',
            'department_id' => $deptOps->id,
            'is_active' => true,
        ]);

        $karan = User::updateOrCreate(['email' => 'karan@gmail.com'], [
            'name' => 'Karan Sharma',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        $aman = User::updateOrCreate(['email' => 'aman@company.com'], [
            'name' => 'Aman Verma',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        $neha = User::updateOrCreate(['email' => 'neha@company.com'], [
            'name' => 'Neha Kapoor',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'female',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_female.png',
            'department_id' => $deptHR->id,
            'is_active' => true,
        ]);

        $rohit = User::updateOrCreate(['email' => 'rohit@company.com'], [
            'name' => 'Rohit Mehta',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptSales->id,
            'is_active' => true,
        ]);

        // 3. Seed Professional Demo Tasks only if database has no tasks yet (preserves user data across redeployments)
        if (Task::count() === 0) {
            // Task 1: Assigned to Rohit Mehta (Engineering / Sales)
            $task1 = Task::create([
                'title' => 'Enterprise API Gateway Integration & Security Hardening',
                'description' => 'Implement secure Sanctum token exchange, rate limiting, and branch messaging endpoints.',
                'expected_result' => 'Fully operational, isolated branch communications with automated notifications.',
                'acceptance_criteria' => "1. Direct branch communication without self-chatting.\n2. Peer isolation enforced.\n3. Role-based badge indicators.",
                'handling_method' => 'assign',
                'priority' => 'high',
                'status' => 'in_progress',
                'start_date' => now()->subDays(2),
                'due_date' => now()->addDays(5),
                'creator_id' => $ravi->id,
                'department_id' => $deptIT->id,
            ]);

            $branch1 = TaskBranch::create([
                'task_id' => $task1->id,
                'title' => 'API Authentication & Branch Messaging',
                'description' => 'Integrate branch messages and real-time review gate.',
                'status' => 'in_progress',
                'owner_id' => $rohit->id,
                'due_date' => now()->addDays(5),
            ]);

            TaskAssignment::create([
                'task_branch_id' => $branch1->id,
                'assigned_by_id' => $ravi->id,
                'assigned_to_id' => $rohit->id,
                'is_current' => true,
                'assigned_at' => now()->subDays(2),
            ]);

            // Sample messages on Branch 1 between Assigner (Ravi) and Assignee (Rohit)
            TaskMessage::create([
                'task_id' => $task1->id,
                'task_branch_id' => $branch1->id,
                'sender_id' => $ravi->id,
                'recipient_id' => $rohit->id,
                'message' => 'Please provide the missing specifications and document details for the gateway rate limit thresholds.',
                'message_type' => 'missing_details_request',
                'is_read' => true,
                'read_at' => now()->subHours(5),
                'created_at' => now()->subHours(6),
            ]);

            TaskMessage::create([
                'task_id' => $task1->id,
                'task_branch_id' => $branch1->id,
                'sender_id' => $rohit->id,
                'recipient_id' => $ravi->id,
                'message' => 'I have updated the requirements and uploaded the required documents for your review.',
                'message_type' => 'details_provided',
                'is_read' => false,
                'created_at' => now()->subMinutes(45),
            ]);

            // Task 2: Collaborative Task with Karan (Assignee) & Aman (Collaborator)
            $task2 = Task::create([
                'title' => 'Cloud Infrastructure Scaling & Disaster Recovery Automation',
                'description' => 'Automate multi-region database failover, backups, and live container health checks.',
                'expected_result' => 'Sub-minute recovery time objective with automated alert routing.',
                'acceptance_criteria' => "1. Daily automated snapshots.\n2. Redundant failover tested.\n3. Monitoring alerts sent to Ops channel.",
                'handling_method' => 'collaborate',
                'priority' => 'urgent',
                'status' => 'in_progress',
                'start_date' => now()->subDay(),
                'due_date' => now()->addDays(7),
                'creator_id' => $ravi->id,
                'department_id' => $deptIT->id,
            ]);

            $branch2 = TaskBranch::create([
                'task_id' => $task2->id,
                'title' => 'Disaster Recovery Automation',
                'description' => 'Coordinate container deployments and snapshot testing.',
                'status' => 'in_progress',
                'owner_id' => $karan->id,
                'due_date' => now()->addDays(7),
            ]);

            TaskAssignment::create([
                'task_branch_id' => $branch2->id,
                'assigned_by_id' => $ravi->id,
                'assigned_to_id' => $karan->id,
                'is_current' => true,
                'assigned_at' => now()->subDay(),
            ]);

            TaskCollaborator::create([
                'task_branch_id' => $branch2->id,
                'user_id' => $aman->id,
                'invited_by_id' => $ravi->id,
                'can_assign' => true,
                'can_collaborate' => true,
                'invited_at' => now()->subDay(),
            ]);

            TaskMessage::create([
                'task_id' => $task2->id,
                'task_branch_id' => $branch2->id,
                'sender_id' => $ravi->id,
                'recipient_id' => $karan->id,
                'message' => 'Karan, verify the failover playbook and coordinate testing with Aman.',
                'message_type' => 'text',
                'is_read' => true,
                'read_at' => now()->subHours(2),
                'created_at' => now()->subHours(3),
            ]);

            TaskMessage::create([
                'task_id' => $task2->id,
                'task_branch_id' => $branch2->id,
                'sender_id' => $aman->id,
                'recipient_id' => $ravi->id,
                'message' => 'Disaster recovery scripts tested successfully in staging environment.',
                'message_type' => 'details_provided',
                'is_read' => false,
                'created_at' => now()->subMinutes(15),
            ]);

            // Task 3: Delegated Hierarchy Task (Priya -> Aman) for Other Communications oversight
            $task3 = Task::create([
                'title' => 'Corporate Operations & Compliance Audit',
                'description' => 'Review vendor contracts, facility logs, and compliance records.',
                'expected_result' => 'Complete compliance verification report signed off.',
                'acceptance_criteria' => 'All vendor agreements audited and updated.',
                'handling_method' => 'assign',
                'priority' => 'medium',
                'status' => 'in_progress',
                'start_date' => now()->subDays(3),
                'due_date' => now()->addDays(4),
                'creator_id' => $ravi->id,
                'department_id' => $deptOps->id,
            ]);

            // Branch 3.1: Priya
            $branch3 = TaskBranch::create([
                'task_id' => $task3->id,
                'title' => 'Facility Operations & Vendor Audit',
                'status' => 'in_progress',
                'owner_id' => $priya->id,
                'due_date' => now()->addDays(4),
            ]);

            $assignment3 = TaskAssignment::create([
                'task_branch_id' => $branch3->id,
                'assigned_by_id' => $ravi->id,
                'assigned_to_id' => $priya->id,
                'is_current' => true,
                'assigned_at' => now()->subDays(3),
            ]);

            // Branch 3.2: Sub-delegated by Priya to Aman
            $branch3Sub = TaskBranch::create([
                'task_id' => $task3->id,
                'title' => 'Vendor Contract Review & Verification',
                'status' => 'in_progress',
                'owner_id' => $aman->id,
                'parent_assignment_id' => $assignment3->id,
                'due_date' => now()->addDays(3),
            ]);

            TaskAssignment::create([
                'task_branch_id' => $branch3Sub->id,
                'assigned_by_id' => $priya->id,
                'assigned_to_id' => $aman->id,
                'is_current' => true,
                'assigned_at' => now()->subDays(1),
            ]);

            TaskMessage::create([
                'task_id' => $task3->id,
                'task_branch_id' => $branch3Sub->id,
                'sender_id' => $priya->id,
                'recipient_id' => $aman->id,
                'message' => 'Aman, please audit the Q4 vendor agreements and summarize discrepancies.',
                'message_type' => 'text',
                'is_read' => true,
                'read_at' => now()->subHours(8),
                'created_at' => now()->subHours(10),
            ]);
        }
    }
}
