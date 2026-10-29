<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreUserRequest;
use App\Http\Requests\Api\V1\UpdateUserRequest;
use App\Http\Resources\V1\UserCollection;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request): UserCollection
    {
        $query = User::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('role') && $request->role && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        if ($request->has('department_id') && $request->department_id && $request->department_id !== 'all') {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('is_active') && $request->is_active !== null && $request->is_active !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->with('department')->latest()->paginate($request->input('per_page', 15));

        return new UserCollection($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $currentUser = $request->user();

        // Enforce role rule: Sub-admin cannot create Admin or Sub-Admin accounts
        if ($currentUser->role === 'sub_admin' && in_array($request->role, ['admin', 'sub_admin'])) {
            return response()->json([
                'message' => 'Unauthorized: Sub-Admin cannot create Admin or Sub-Admin accounts'
            ], 403);
        }

        if ($currentUser->role === 'employee') {
            return response()->json([
                'message' => 'Unauthorized: Employees cannot create accounts'
            ], 403);
        }

        $data = $request->validated();
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            $data['password'] = Hash::make('password123');
        }
        $data['is_active'] = $data['is_active'] ?? true;

        $user = User::create($data);

        ActivityLogger::log('user_created', "Created {$user->role} user: {$user->name} ({$user->email})", null, $currentUser->id);

        return response()->json([
            'message' => 'User created successfully',
            'data' => new UserResource($user->load('department')),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($user->load('department')),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $currentUser = $request->user();

        // Enforce permissions: Sub-admin cannot edit Admin users
        if ($currentUser->role === 'sub_admin' && $user->role === 'admin') {
            return response()->json([
                'message' => 'Unauthorized: Sub-Admin cannot modify Admin accounts'
            ], 403);
        }

        // Sub-admin cannot promote user to admin
        if ($currentUser->role === 'sub_admin' && $request->has('role') && in_array($request->role, ['admin', 'sub_admin'])) {
            return response()->json([
                'message' => 'Unauthorized: Sub-Admin cannot promote accounts to Admin or Sub-Admin'
            ], 403);
        }

        $data = $request->validated();
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        ActivityLogger::log('user_updated', "Updated user: {$user->name}", null, $currentUser->id);

        return response()->json([
            'message' => 'User updated successfully',
            'data' => new UserResource($user->load('department')),
        ]);
    }

    public function destroy(User $user, Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $subAdminCanDelete = $currentUser->role === 'sub_admin' && \App\Models\SystemSetting::get('allow_subadmin_delete_records', false);

        if ($currentUser->role !== 'admin' && !$subAdminCanDelete) {
            return response()->json([
                'message' => 'Unauthorized: Deleting user records is restricted to Administrators (or authorized Sub-Administrators).'
            ], 403);
        }

        if ($currentUser->id === $user->id) {
            return response()->json([
                'message' => 'You cannot delete your own account'
            ], 422);
        }

        $user->delete();

        ActivityLogger::log('user_deleted', "Deleted user: {$user->name}", null, $currentUser->id);

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    public function activate(User $user, Request $request): JsonResponse
    {
        $currentUser = $request->user();
        if ($currentUser->role === 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user->update(['is_active' => true]);

        ActivityLogger::log('user_activated', "Activated user: {$user->name}", null, $currentUser->id);

        return response()->json([
            'message' => 'User activated successfully',
            'data' => new UserResource($user->load('department')),
        ]);
    }

    public function deactivate(User $user, Request $request): JsonResponse
    {
        $currentUser = $request->user();
        if ($currentUser->role === 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($currentUser->id === $user->id) {
            return response()->json(['message' => 'You cannot deactivate your own account'], 422);
        }

        $user->update(['is_active' => false]);

        ActivityLogger::log('user_deactivated', "Deactivated user: {$user->name}", null, $currentUser->id);

        return response()->json([
            'message' => 'User deactivated successfully',
            'data' => new UserResource($user->load('department')),
        ]);
    }
}
