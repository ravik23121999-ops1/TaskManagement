<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use App\Models\SystemSetting;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $request->authenticate();

        $user = Auth::user();
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
            ],
        ], 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out',
        ], 200);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ], 200);
    }

    public function impersonate(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();
        $allowSubAdmin = (bool) SystemSetting::get('allow_subadmin_impersonate', false);
        $canImpersonate = $currentUser->role === 'admin' || ($currentUser->role === 'sub_admin' && $allowSubAdmin);

        if (!$canImpersonate) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to log in as other users.',
            ], 403);
        }

        if ($currentUser->role === 'sub_admin' && $user->role !== 'employee') {
            return response()->json([
                'message' => 'Unauthorized: Sub-Administrators can only log in as employee accounts.',
            ], 403);
        }

        if ($currentUser->id === $user->id) {
            return response()->json([
                'message' => 'You cannot impersonate your own account.',
            ], 422);
        }

        ActivityLogger::log(
            'user_impersonated',
            "{$currentUser->name} ({$currentUser->role}) logged in as {$user->name} ({$user->email})",
            null,
            $currentUser->id
        );

        $token = $user->createToken('impersonation-token')->plainTextToken;

        return response()->json([
            'message' => "Successfully logged in as {$user->name}",
            'data' => [
                'token' => $token,
                'user' => new UserResource($user->load('department')),
                'impersonator' => new UserResource($currentUser->load('department')),
            ],
        ], 200);
    }
}
