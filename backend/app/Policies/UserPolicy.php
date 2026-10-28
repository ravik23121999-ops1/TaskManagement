<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin' || $user->role === 'sub_admin';
    }

    public function view(User $user, User $target): bool
    {
        if ($user->role === 'admin' || $user->role === 'sub_admin') {
            return true;
        }

        return $user->id === $target->id;
    }

    public function create(User $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'sub_admin') {
            return false; // Sub-Admin cannot create Admin/Sub-Admin
        }

        return false; // Employees cannot create users
    }

    public function update(User $user, User $target): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'sub_admin') {
            // Sub-Admin can update employees but not other admins
            return $target->role === 'employee';
        }

        return $user->id === $target->id;
    }

    public function delete(User $user, User $target): bool
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
