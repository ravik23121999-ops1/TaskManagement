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
        $allowSubAdminImpersonate = (bool) ($settings['allow_subadmin_impersonate'] ?? false);
        $enableWorkMessages = (bool) ($settings['enable_work_messages'] ?? true);

        // Effective user capabilities
        $canDeleteRecords = $user->role === 'admin' || ($user->role === 'sub_admin' && $allowSubAdminDelete);
        $canCancelTasks = $user->role === 'admin' || ($user->role === 'sub_admin' && $allowSubAdminCancel);
        $canImpersonate = $user->role === 'admin' || ($user->role === 'sub_admin' && $allowSubAdminImpersonate);

        $allSettings = array_merge($settings, [
            'allow_subadmin_delete_records' => $allowSubAdminDelete,
            'allow_subadmin_cancel_tasks' => $allowSubAdminCancel,
            'allow_subadmin_impersonate' => $allowSubAdminImpersonate,
            'enable_work_messages' => $enableWorkMessages,
        ]);

        return response()->json([
            'settings' => $allSettings,
            'user_capabilities' => [
                'role' => $user->role,
                'can_delete_records' => $canDeleteRecords,
                'can_cancel_tasks' => $canCancelTasks,
                'can_impersonate' => $canImpersonate,
                'enable_work_messages' => $enableWorkMessages,
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
            'allow_subadmin_impersonate' => 'nullable|boolean',
            'enable_work_messages' => 'nullable|boolean',
        ]);

        foreach ($validated as $key => $value) {
            if ($value !== null) {
                SystemSetting::set($key, (bool) $value);
            }
        }

        ActivityLogger::log(
            'system_settings_updated',
            'Updated system access permissions and settings',
            null,
            $user->id
        );

        $updatedSettings = SystemSetting::getAllSettings();
        if (!isset($updatedSettings['enable_work_messages'])) {
            $updatedSettings['enable_work_messages'] = true;
        }

        return response()->json([
            'message' => 'System settings updated successfully',
            'settings' => $updatedSettings,
        ]);
    }

    /**
     * Clear all testing tasks, attachments, messages, logs and notifications (Super Admin only)
     */
    public function clearTestingData(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized: Only Super Administrators can clear system testing data.',
            ], 403);
        }

        $result = \App\Services\TestingDataCleaner::clean();

        return response()->json([
            'message' => 'All testing data has been completely cleared from the system.',
            'result' => $result,
        ]);
    }
}
