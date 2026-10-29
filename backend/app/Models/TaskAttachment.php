<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskAttachment extends Model
{
    protected $fillable = [
        'task_id',
        'task_branch_id',
        'task_comment_id',
        'uploaded_by_id',
        'user_id',
        'file_name',
        'file_path',
        'file_size',
        'file_type',
    ];

    /**
     * Alias mutator so both user_id and uploaded_by_id set the underlying column
     */
    public function setUserIdAttribute($value): void
    {
        $this->attributes['uploaded_by_id'] = $value;
    }

    protected $casts = [
        'file_size' => 'integer',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(TaskBranch::class, 'task_branch_id');
    }

    public function comment(): BelongsTo
    {
        return $this->belongsTo(TaskComment::class, 'task_comment_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_id');
    }

    public function user(): BelongsTo
    {
        return $this->uploadedBy();
    }

    public function getFileSizeInMB(): float
    {
        return round($this->file_size / 1024 / 1024, 2);
    }

    public function getFileSizeInKB(): float
    {
        return round($this->file_size / 1024, 2);
    }
}
