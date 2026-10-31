<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\User;
use App\Models\Department;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        $dept = Department::first();
        $deptId = $dept ? $dept->id : null;

        // 1. Creator
        User::updateOrCreate(['email' => 'creator@company.com'], [
            'name' => 'Creator',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptId,
            'is_active' => true,
        ]);

        // 2. Checker
        User::updateOrCreate(['email' => 'checker@company.com'], [
            'name' => 'Checker',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'female',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_female.png',
            'department_id' => $deptId,
            'is_active' => true,
        ]);

        // 3. Reviewer
        User::updateOrCreate(['email' => 'reviewer@company.com'], [
            'name' => 'Reviewer',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'gender' => 'male',
            'avatar_type' => 'preset',
            'avatar_url' => '/assets/roles/employee_male.png',
            'department_id' => $deptId,
            'is_active' => true,
        ]);
    }

    public function down(): void
    {
        User::whereIn('email', [
            'creator@company.com',
            'checker@company.com',
            'reviewer@company.com',
        ])->forceDelete();
    }
};
