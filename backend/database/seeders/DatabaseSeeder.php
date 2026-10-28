<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Department;
use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\TaskAssignment;
use App\Models\TaskCollaborator;
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

        // 3. Clear any remnant tasks/logs to guarantee a 100% fresh start
        Task::query()->forceDelete();
        TaskBranch::query()->forceDelete();
        TaskAssignment::query()->delete();
        TaskCollaborator::query()->delete();
        TaskSubmission::query()->delete();
        TaskReview::query()->delete();
        TaskComment::query()->delete();
        TaskHoldRecord::query()->delete();
        TaskStatusHistory::query()->delete();
        ActivityLog::query()->delete();
        SystemNotification::query()->delete();
    }
}
