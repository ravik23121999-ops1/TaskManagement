<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SystemNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = SystemNotification::where('user_id', $request->user()->id)
            ->latest()
            ->paginate($request->input('per_page', 15));
        return response()->json(['data' => $notifications]);
    }

    public function markAsRead(Request $request, SystemNotification $notification): JsonResponse
    {
        $notification->markAsRead();
        return response()->json(['message' => 'Notification marked as read']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        SystemNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);
        return response()->json(['message' => 'All notifications marked as read']);
    }
}
