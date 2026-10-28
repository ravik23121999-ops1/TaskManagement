<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TaskBranch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskBranchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $branches = TaskBranch::with(['owner', 'task'])->paginate($request->input('per_page', 15));
        return response()->json(['data' => $branches]);
    }

    public function store(Request $request): JsonResponse
    {
        $branch = TaskBranch::create($request->validate([
            'task_id' => 'required|exists:tasks,id',
            'title' => 'required|string',
            'description' => 'nullable|string',
            'owner_id' => 'required|exists:users,id',
            'due_date' => 'nullable|date',
        ]));

        return response()->json(['data' => $branch->load(['owner', 'task'])], 201);
    }

    public function show(TaskBranch $branch): JsonResponse
    {
        return response()->json(['data' => $branch->load(['owner', 'task', 'collaborators'])]);
    }

    public function update(Request $request, TaskBranch $branch): JsonResponse
    {
        $branch->update($request->validate([
            'title' => 'sometimes|string',
            'description' => 'sometimes|nullable|string',
            'status' => 'sometimes|in:pending,in_progress,review,on_hold,post_comment,completed,cancelled',
            'due_date' => 'sometimes|nullable|date',
            'owner_id' => 'sometimes|exists:users,id',
        ]));

        // If owner changed, create new assignment record
        if ($request->has('owner_id') && $request->owner_id !== $branch->owner_id) {
            $branch->assignments()->create([
                'assigned_to_id' => $request->owner_id,
                'assigned_by_id' => $request->user()->id,
                'is_current' => true,
                'assigned_at' => now(),
            ]);

            // Mark previous assignments as not current
            $branch->assignments()
                ->where('assigned_to_id', '!=', $request->owner_id)
                ->update(['is_current' => false]);
        }

        return response()->json(['data' => $branch->load(['owner', 'task'])]);
    }

    public function delegate(Request $request, TaskBranch $branch): JsonResponse
    {
        $request->validate([
            'new_owner_id' => 'required|exists:users,id',
        ]);

        $oldOwnerId = $branch->owner_id;

        $branch->update(['owner_id' => $request->new_owner_id]);

        $branch->assignments()->create([
            'assigned_to_id' => $request->new_owner_id,
            'assigned_by_id' => $request->user()->id,
            'is_current' => true,
            'assigned_at' => now(),
        ]);

        // Mark previous assignment as not current
        $branch->assignments()
            ->where('assigned_to_id', $oldOwnerId)
            ->update(['is_current' => false]);

        return response()->json(['message' => 'Branch delegated successfully']);
    }
}
