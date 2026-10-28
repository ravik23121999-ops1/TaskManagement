<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $targetUser = $this->route('user');

        return $user && (
            $user->id === $targetUser->id ||
            $user->canManageUsers()
        );
    }

    public function rules(): array
    {
        $userId = $this->route('user')->id;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,' . $userId],
            'password' => ['sometimes', 'string', Password::defaults()],
            'role' => ['sometimes', 'in:admin,sub_admin,employee'],
            'department_id' => ['sometimes', 'nullable', 'exists:departments,id'],
        ];
    }
}
