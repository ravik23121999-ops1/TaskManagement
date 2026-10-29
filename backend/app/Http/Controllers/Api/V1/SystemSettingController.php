<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    /**
     * Get system settings and user's effective permissions
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $settings = SystemSetting::getAllSettings();

        $allowSubAdminDelete = (bool) ($settings['allow_subadmin_delete_records'] ?? false);
        $allowSubAdminCancel = (bool) ($settings['allow_subadmin_cancel_tasks'] ?? false);

        // Effective user capabilities
        $canDeleteRecords = $user->role === 'admin' || ($user->role === 'sub_admin' && $allowSubAdminDelete);
        $canCancelTasks = $user->role === 'admin' || ($user->role === 'sub_admin' && $allowSubAdminCancel);

        return response()->json([
            'settings' => $settings,
            'user_capabilities' => [
                'role' => $user->role,
                'can_delete_records' => $canDeleteRecords,
                'can_cancel_tasks' => $canCancelTasks,
            ],
        ]);
    }

    /**
     * Update system settings (Admin only)
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        // Strict rule: Only full Admin can update system settings
        if ($user->role !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized: Only Super Administrators can configure system settings and permissions.',
            ], 403);
        }

        $validated = $request->validate([
            'allow_subadmin_delete_records' => 'nullable|boolean',
            'allow_subadmin_cancel_tasks' => 'nullable|boolean',
        ]);

        foreach ($validated as $key => $value) {
            SystemSetting::set($key, (bool) $value);
        }

        ActivityLogger::log(
            'system_settings_updated',
            'Updated system access permissions and settings',
            null,
            $user->id
        );

        $updatedSettings = SystemSetting::getAllSettings();

        return response()->json([
            'message' => 'System settings updated successfully',
            'settings' => $updatedSettings,
        ]);
    }
}
