<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskSubmission extends Model
{
    protected $fillable = [
        'task_id',
        'task_branch_id',
        'submitted_by_id',
        'description',
        'submitted_at',
        'is_final',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'is_final' => 'boolean',
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

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(TaskReview::class);
    }

    public function latestReview(): HasMany
    {
        return $this->reviews()->latest();
    }
}
