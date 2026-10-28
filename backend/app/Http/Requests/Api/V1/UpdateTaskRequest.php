<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
            'expected_result' => ['sometimes', 'nullable', 'string'],
            'acceptance_criteria' => ['sometimes', 'nullable', 'string'],
            'priority' => ['sometimes', 'in:low,medium,high,urgent'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'department_id' => ['sometimes', 'nullable', 'exists:departments,id'],
        ];
    }
}
