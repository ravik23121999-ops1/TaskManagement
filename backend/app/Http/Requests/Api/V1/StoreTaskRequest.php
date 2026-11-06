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
            'branches.*.files.*' => ['file', 'max:25600', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm'],
            'branches.*.copied_shared_attachment_ids' => ['nullable', 'array'],
            'branches.*.copied_shared_attachment_ids.*' => ['integer'],
            'branch_files' => ['nullable', 'array'],
            'branch_files.*' => ['nullable', 'array'],
            'branch_files.*.*' => ['file', 'max:25600', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:25600', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm'],
            'shared_files' => ['nullable', 'array'],
            'shared_files.*' => ['file', 'max:25600', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,7z,jpg,jpeg,png,gif,webp,svg,mp4,webm'],
        ];
    }

    public function messages(): array
    {
        return [
            'branches.*.files.*.max' => 'Subtask attachment exceeds the maximum allowed size (25MB).',
            'branches.*.files.*.uploaded' => 'A subtask attachment failed to upload. Please ensure the file size is under 25MB.',
            'branches.*.files.*.mimes' => 'Subtask attachment must be a supported document, image, or archive file.',
            'branch_files.*.*.max' => 'Subtask attachment exceeds the maximum allowed size (25MB).',
            'branch_files.*.*.uploaded' => 'A subtask attachment failed to upload. Please ensure the file size is under 25MB.',
            'branch_files.*.*.mimes' => 'Subtask attachment must be a supported document, image, or archive file.',
            'shared_files.*.max' => 'Shared attachment exceeds the maximum allowed size (25MB).',
            'shared_files.*.uploaded' => 'Shared attachment failed to upload. Please ensure the file size is under 25MB.',
            'shared_files.*.mimes' => 'Shared attachment must be a supported document, image, or archive file.',
            'files.*.max' => 'Task attachment exceeds the maximum allowed size (25MB).',
            'files.*.uploaded' => 'Task attachment failed to upload. Please ensure the file size is under 25MB.',
            'files.*.mimes' => 'Task attachment must be a supported document, image, or archive file.',
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
