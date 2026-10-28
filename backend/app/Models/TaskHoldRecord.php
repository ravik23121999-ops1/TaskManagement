<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskHoldRecord extends Model
{
    protected $fillable = [
        'task_id',
        'task_branch_id',
        'put_on_hold_by_id',
        'reason',
        'held_at',
        'resumed_at',
        'resumed_by_id',
    ];

    protected $casts = [
        'held_at' => 'datetime',
        'resumed_at' => 'datetime',
    ];

    public $timestamps = false;

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(TaskBranch::class, 'task_branch_id');
    }

    public function putOnHoldBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'put_on_hold_by_id');
    }

    public function resumedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resumed_by_id');
    }

    public function isActive(): bool
    {
        return $this->resumed_at === null;
    }
}
