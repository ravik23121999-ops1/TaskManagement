<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()->load('department')),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        $user->update([
            'name' => $request->name,
            'department_id' => $request->department_id,
        ]);

        return response()->json([
            'message' => 'Profile updated successfully',
            'data' => new UserResource($user->load('department')),
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|current_password',
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->hasFile('photo')) {
            $request->validate([
                'photo' => 'required|image|max:5120',
            ]);

            $path = $request->file('photo')->store('avatars', 'public');

            $user->update([
                'avatar_type' => 'custom',
                'custom_avatar_path' => $path,
                'avatar_url' => asset('storage/' . $path),
            ]);

            return response()->json([
                'message' => 'Custom profile photo uploaded successfully',
                'data' => new UserResource($user->load('department')),
            ]);
        }

        $request->validate([
            'gender' => 'required|in:male,female',
        ]);

        $gender = $request->gender;
        $role = $user->role ?: 'employee';
        $presetUrl = "/assets/roles/{$role}_{$gender}.png";

        $user->update([
            'gender' => $gender,
            'avatar_type' => 'preset',
            'custom_avatar_path' => null,
            'avatar_url' => $presetUrl,
        ]);

        return response()->json([
            'message' => 'Avatar preference updated successfully',
            'data' => new UserResource($user->load('department')),
        ]);
    }
}
