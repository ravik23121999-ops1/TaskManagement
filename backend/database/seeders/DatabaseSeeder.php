<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Department;
use App\Models\SystemSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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
        User::updateOrCreate(['email' => 'admin@example.com'], [
            'name' => 'Admin User',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/admin_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'ravi@company.com'], [
            'name' => 'Ravi Singh',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/admin_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'priya@company.com'], [
            'name' => 'Priya Sharma',
            'password' => Hash::make('password'),
            'role' => 'sub_admin',
            'gender' => 'female',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/sub_admin_female.png',
            'department_id' => $deptOps->id,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'karan@gmail.com'], [
            'name' => 'Karan Sharma',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'aman@company.com'], [
            'name' => 'Aman Verma',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'neha@company.com'], [
            'name' => 'Neha Kapoor',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'female',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_female.png',
            'department_id' => $deptHR->id,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'rohit@company.com'], [
            'name' => 'Rohit Mehta',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptSales->id,
            'is_active' => true,
        ]);

        // Workflow Testing Users: Creator, Checker, Reviewer
        User::updateOrCreate(['email' => 'creator@company.com'], [
            'name' => 'Creator',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'checker@company.com'], [
            'name' => 'Checker',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'female',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_female.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'reviewer@company.com'], [
            'name' => 'Reviewer',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptIT->id,
            'is_active' => true,
        ]);

        // 3. Default System Permissions
        SystemSetting::set('allow_subadmin_delete_records', false);
        SystemSetting::set('allow_subadmin_cancel_tasks', false);

        // Production Clean State: Zero demo or testing tasks.
        // Ready for clean live task workflows.
    }
}
