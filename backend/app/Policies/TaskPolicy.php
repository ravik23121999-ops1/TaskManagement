<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function view(User $user, Task $task): bool
    {
        if ($user->role === 'admin' || $user->role === 'sub_admin') {
            return true;
        }

        return $task->creator_id === $user->id
            || $task->branches()->where('owner_id', $user->id)->exists()
            || $task->collaborators()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return true; // All employees can create tasks
    }

    public function update(User $user, Task $task): bool
    {
        if ($user->role === 'admin' || $user->role === 'sub_admin') {
            return true;
        }

        return $task->creator_id === $user->id;
    }

    public function delete(User $user, Task $task): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'sub_admin') {
            return false; // Sub-Admin cannot delete protected records
        }

        return $task->creator_id === $user->id;
    }

    public function cancel(User $user, Task $task): bool
    {
        if ($user->role === 'admin' || $user->role === 'sub_admin') {
            return true;
        }

        return $task->creator_id === $user->id;
    }

    public function submit(User $user, Task $task): bool
    {
        if ($user->role === 'admin' || $user->role === 'sub_admin') {
            return true;
        }

        return $task->creator_id === $user->id
            || $task->branches()->where('owner_id', $user->id)->exists();
    }

    public function review(User $user, Task $task): bool
    {
        if ($user->role === 'admin' || $user->role === 'sub_admin') {
            return true;
        }

        if ($task->creator_id === $user->id) {
            return true;
        }

        // Upper branch / assigner who delegated or collaborated further
        return $task->branches()->where(function ($q) use ($user) {
            $q->whereHas('assignments', function ($a) use ($user) {
                $a->where('is_current', true)
                  ->where('assigned_by_id', $user->id)
                  ->where('assigned_to_id', '!=', $user->id);
            })->orWhereHas('collaborators', function ($c) use ($user) {
                $c->where('invited_by_id', $user->id)
                  ->where('user_id', '!=', $user->id);
            });
        })->exists();
    }
}
