<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'expected_result',
        'acceptance_criteria',
        'handling_method',
        'priority',
        'status',
        'start_date',
        'due_date',
        'creator_id',
        'department_id',
        'completed_at',
        'cancelled_at',
        'cancellation_reason',
        'cancelled_by_id',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'due_date' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(TaskBranch::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(TaskSubmission::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(TaskReview::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(TaskStatusHistory::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class, 'subject_id')->where('subject_type', Task::class);
    }

    public function holdRecords(): HasMany
    {
        return $this->hasMany(TaskHoldRecord::class);
    }

    public function isWorkAlone(): bool
    {
        return $this->handling_method === 'work_alone';
    }

    public function isAssign(): bool
    {
        return $this->handling_method === 'assign';
    }

    public function isCollaborate(): bool
    {
        return $this->handling_method === 'collaborate';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    public function isOnHold(): bool
    {
        return $this->status === 'on_hold';
    }

    public function canBeCompleted(): bool
    {
        if ($this->isWorkAlone()) {
            return $this->status === 'in_progress';
        }

        if ($this->isAssign() || $this->isCollaborate()) {
            $allBranchesCompleted = $this->branches()->where('status', 'completed')->count() === $this->branches()->count();
            return $allBranchesCompleted && $this->status === 'review';
        }

        return false;
    }
}
