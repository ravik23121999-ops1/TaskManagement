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
            'branches.*.expected_result' => ['nullable', 'string'],
            'branches.*.acceptance_criteria' => ['nullable', 'string'],
            'branches.*.owner_id' => ['required_with:branches', 'exists:users,id'],
            'branches.*.start_date' => ['nullable', 'date'],
            'branches.*.due_date' => ['nullable', 'date'],
            'branches.*.files' => ['nullable', 'array'],
            'branches.*.files.*' => ['file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg'],
            'branches.*.copied_shared_attachment_ids' => ['nullable', 'array'],
            'branches.*.copied_shared_attachment_ids.*' => ['integer'],
            'branch_files' => ['nullable', 'array'],
            'branch_files.*' => ['nullable', 'array'],
            'branch_files.*.*' => ['file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg'],
            'shared_files' => ['nullable', 'array'],
            'shared_files.*' => ['file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg'],
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

            // Enforce rule: Subtask due date cannot exceed parent task due date
            $parentDueDate = $this->input('due_date');
            if ($parentDueDate) {
                $parentTimestamp = strtotime($parentDueDate);
                $branches = (array) $this->input('branches', []);
                foreach ($branches as $index => $branch) {
                    if (!empty($branch['due_date'])) {
                        $branchTimestamp = strtotime($branch['due_date']);
                        if ($branchTimestamp > $parentTimestamp) {
                            $branchTitle = $branch['title'] ?? 'Subtask #' . ($index + 1);
                            $validator->errors()->add(
                                "branches.{$index}.due_date",
                                "The subtask \"{$branchTitle}\" due date cannot be later than the parent task due date."
                            );
                        }
                    }
                }
            }
        });
    }
}
