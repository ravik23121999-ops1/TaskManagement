<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'expected_result' => ['nullable', 'string'],
            'acceptance_criteria' => ['nullable', 'string'],
            'handling_method' => ['required', 'in:work_alone,assign,collaborate'],
            'priority' => ['nullable', 'in:low,medium,high,urgent'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'assignees' => ['nullable', 'array'],
            'assignees.*' => ['exists:users,id'],
            'collaborators' => ['nullable', 'array'],
            'collaborators.*' => ['exists:users,id'],
            'branches' => ['nullable', 'array'],
            'branches.*.title' => ['required_with:branches', 'string', 'max:255'],
            'branches.*.description' => ['nullable', 'string'],
            'branches.*.owner_id' => ['required_with:branches', 'exists:users,id'],
            'branches.*.due_date' => ['nullable', 'date'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:10240'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            if ($this->input('handling_method') === 'assign') {
                $assignees = (array) $this->input('assignees', []);
                $branches = (array) $this->input('branches', []);

                $allAssigneeIds = !empty($branches)
                    ? array_filter(array_column($branches, 'owner_id'))
                    : $assignees;

                if (empty($allAssigneeIds)) {
                    $validator->errors()->add('assignees', 'Please select at least one assignee for this task.');
                } elseif ($user && in_array($user->id, $allAssigneeIds)) {
                    $validator->errors()->add('assignees', 'You cannot assign a task to yourself. Use "Work Alone" if you want to execute this task.');
                }
            }
        });
    }
}
