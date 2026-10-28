<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskCollaborator extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'task_branch_id',
        'user_id',
        'invited_by_id',
        'can_assign',
        'can_collaborate',
        'invited_at',
        'removed_at',
    ];

    protected $casts = [
        'can_assign' => 'boolean',
        'can_collaborate' => 'boolean',
        'invited_at' => 'datetime',
        'removed_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(TaskBranch::class, 'task_branch_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_id');
    }

    public function isActive(): bool
    {
        return $this->removed_at === null;
    }
}
