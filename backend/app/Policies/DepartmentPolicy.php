<?php

namespace App\Policies;

use App\Models\Department;
use App\Models\User;

class DepartmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // All users can view departments
    }

    public function view(User $user, Department $department): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->role === 'admin' || $user->role === 'sub_admin';
    }

    public function update(User $user, Department $department): bool
    {
        return $user->role === 'admin' || $user->role === 'sub_admin';
    }

    public function delete(User $user, Department $department): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return false; // Sub-Admin cannot delete protected records
    }

    public function activate(User $user): bool
    {
        return $user->role === 'admin' || $user->role === 'sub_admin';
    }

    public function deactivate(User $user): bool
    {
        return $user->role === 'admin' || $user->role === 'sub_admin';
    }
}
