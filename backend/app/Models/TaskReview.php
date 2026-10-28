<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskReview extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'task_id',
        'task_branch_id',
        'task_submission_id',
        'reviewer_id',
        'decision',
        'comments',
        'reviewed_at',
        'next_reviewer_id',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(TaskBranch::class, 'task_branch_id');
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(TaskSubmission::class, 'task_submission_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function nextReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'next_reviewer_id');
    }

    public function isApproved(): bool
    {
        return $this->decision === 'approved';
    }

    public function isReturned(): bool
    {
        return $this->decision === 'returned';
    }

    public function isRejected(): bool
    {
        return $this->decision === 'rejected';
    }
}
