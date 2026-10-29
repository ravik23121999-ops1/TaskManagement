<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreDepartmentRequest;
use App\Http\Requests\Api\V1\UpdateDepartmentRequest;
use App\Http\Resources\V1\DepartmentCollection;
use App\Http\Resources\V1\DepartmentResource;
use App\Models\Department;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request): DepartmentCollection
    {
        $query = Department::query()->withCount(['users', 'tasks']);

        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%");
        }

        if ($request->has('is_active') && $request->is_active !== null && $request->is_active !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $departments = $query->latest()->paginate($request->input('per_page', 15));

        return new DepartmentCollection($departments);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return response()->json(['message' => 'Unauthorized: Employees cannot create departments'], 403);
        }

        $department = Department::create([
            ...$request->validated(),
            'is_active' => true,
        ]);

        ActivityLogger::log('department_created', "Created department: {$department->name}", null, $user->id);

        return response()->json([
            'message' => 'Department created successfully',
            'data' => new DepartmentResource($department),
        ], 201);
    }

    public function show(Department $department): JsonResponse
    {
        return response()->json([
            'data' => new DepartmentResource($department->loadCount(['users', 'tasks'])),
        ]);
    }

    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $department->update($request->validated());

        ActivityLogger::log('department_updated', "Updated department: {$department->name}", null, $user->id);

        return response()->json([
            'message' => 'Department updated successfully',
            'data' => new DepartmentResource($department->loadCount(['users', 'tasks'])),
        ]);
    }

    public function destroy(Department $department, Request $request): JsonResponse
    {
        $user = $request->user();
        $subAdminCanDelete = $user->role === 'sub_admin' && \App\Models\SystemSetting::get('allow_subadmin_delete_records', false);

        if ($user->role !== 'admin' && !$subAdminCanDelete) {
            return response()->json(['message' => 'Unauthorized: Deleting departments is restricted to Administrators (or authorized Sub-Administrators)'], 403);
        }

        // Rule: If a department is already used by historical tasks, deactivate it rather than permanently deleting
        if ($department->tasks()->count() > 0) {
            $department->update(['is_active' => false]);
            return response()->json([
                'message' => 'Department is associated with existing tasks and has been deactivated instead of deleted to preserve history.',
            ]);
        }

        $department->delete();

        return response()->json([
            'message' => 'Department deleted successfully',
        ]);
    }

    public function activate(Department $department, Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $department->update(['is_active' => true]);

        ActivityLogger::log('department_activated', "Activated department: {$department->name}", null, $user->id);

        return response()->json([
            'message' => 'Department activated successfully',
            'data' => new DepartmentResource($department->loadCount(['users', 'tasks'])),
        ]);
    }

    public function deactivate(Department $department, Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $department->update(['is_active' => false]);

        ActivityLogger::log('department_deactivated', "Deactivated department: {$department->name}", null, $user->id);

        return response()->json([
            'message' => 'Department deactivated successfully',
            'data' => new DepartmentResource($department->loadCount(['users', 'tasks'])),
        ]);
    }

    public function members(Department $department): JsonResponse
    {
        $members = $department->users()
            ->withCount([
                'ownedBranches as active_tasks_count' => fn($q) => $q->whereNotIn('status', ['completed', 'cancelled']),
                'ownedBranches as completed_tasks_count' => fn($q) => $q->where('status', 'completed'),
            ])
            ->latest('id')
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'gender' => $u->gender ?? 'female',
                'avatar_url' => $u->avatar_url,
                'is_active' => (bool) $u->is_active,
                'active_tasks_count' => (int) $u->active_tasks_count,
                'completed_tasks_count' => (int) $u->completed_tasks_count,
                'created_at' => $u->created_at?->format('d M Y'),
            ])
            ->values()
            ->all();

        return response()->json([
            'department' => [
                'id' => $department->id,
                'name' => $department->name,
                'description' => $department->description,
                'is_active' => (bool) $department->is_active,
                'members_count' => count($members),
                'tasks_count' => $department->tasks()->count(),
            ],
            'members' => $members,
        ]);
    }
}
