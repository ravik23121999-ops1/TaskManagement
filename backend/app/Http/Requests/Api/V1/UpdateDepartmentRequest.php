<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageUsers() ?? false;
    }

    public function rules(): array
    {
        $departmentId = $this->route('department')->id;

        return [
            'name' => ['sometimes', 'string', 'max:255', 'unique:departments,name,' . $departmentId],
            'description' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
