<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public static function log(string $action, string $description, ?int $taskId = null, ?int $userId = null): void
    {
        try {
            $actorId = $userId ?? Auth::id();
            if (!$actorId) {
                return; // Skip logging if no user ID
            }

            ActivityLog::create([
                'actor_id' => $actorId,
                'action' => $action,
                'subject_type' => 'App\\Models\\Task',
                'subject_id' => $taskId ?? 0,
                'description' => $description,
                'properties' => [
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ],
                'created_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Log errors but don't break the workflow
            \Log::error('ActivityLogger failed: ' . $e->getMessage());
        }
    }
}
