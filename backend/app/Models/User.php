<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'department_id', 'is_active', 'gender', 'avatar_type', 'custom_avatar_path', 'avatar_url'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    /**
     * Get computed avatar URL.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if ($this->avatar_type === 'custom' && $this->custom_avatar_path) {
            return asset('storage/' . $this->custom_avatar_path);
        }

        $gender = $this->gender ?: 'female';
        $role = $this->role ?: 'employee';
        return "/assets/roles/{$role}_{$gender}.png";
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function createdTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'creator_id');
    }

    public function ownedBranches(): HasMany
    {
        return $this->hasMany(TaskBranch::class, 'owner_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TaskAssignment::class, 'assigned_to_id');
    }

    public function collaborations(): HasMany
    {
        return $this->hasMany(TaskCollaborator::class, 'user_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(TaskReview::class, 'reviewer_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class, 'user_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class, 'uploaded_by_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class, 'actor_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(SystemNotification::class, 'user_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSubAdmin(): bool
    {
        return $this->role === 'sub_admin';
    }

    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    public function canManageUsers(): bool
    {
        return $this->isAdmin() || $this->isSubAdmin();
    }

    public function canDeleteRecords(): bool
    {
        return $this->isAdmin();
    }
}
