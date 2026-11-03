<?php

namespace App\Mail;

use App\Models\Task;
use App\Models\TaskBranch;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TaskAssignedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Task $task,
        public User $assignee,
        public User $assigner,
        public ?TaskBranch $branch = null,
        public ?string $note = null,
        public string $type = 'new_assignment'
    ) {}

    public function build(): self
    {
        $taskCode = $this->task->code ?? 'T-' . str_pad($this->task->id, 3, '0', STR_PAD_LEFT);
        $branchTitle = $this->branch?->title ?? $this->task->title;
        $dueDate = $this->branch?->due_date ?? $this->task->due_date;
        $instructions = $this->branch?->description ?? $this->task->description;

        $subjectTitle = match ($this->type) {
            'transferred' => "[{$taskCode}] Task Assignment Transferred: {$branchTitle}",
            default => "[{$taskCode}] New Task Assigned: {$branchTitle}",
        };

        $emailHeading = match ($this->type) {
            'transferred' => "Task Assignment Transferred",
            default => "New Task Assigned to You",
        };

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $taskUrl = rtrim($frontendUrl, '/') . '/tasks/' . $this->task->id;

        return $this->subject($subjectTitle)
            ->from(config('mail.from.address', 'hello@example.com'), $this->assigner->name . ' via TaskHub')
            ->replyTo($this->assigner->email, $this->assigner->name)
            ->view('emails.task_assigned', [
                'task' => $this->task,
                'taskCode' => $taskCode,
                'branchTitle' => $branchTitle,
                'dueDate' => $dueDate,
                'instructions' => $instructions,
                'assignee' => $this->assignee,
                'assigner' => $this->assigner,
                'note' => $this->note,
                'type' => $this->type,
                'subjectTitle' => $subjectTitle,
                'emailHeading' => $emailHeading,
                'taskUrl' => $taskUrl,
            ]);
    }

    /**
     * Safe helper to send mail without throwing exceptions or blocking workflow.
     */
    public static function safeSend(
        Task $task,
        User $assignee,
        User $assigner,
        ?TaskBranch $branch = null,
        ?string $note = null,
        string $type = 'new_assignment'
    ): void {
        try {
            if (!empty($assignee->email)) {
                Mail::to($assignee->email)->send(
                    new self($task, $assignee, $assigner, $branch, $note, $type)
                );
            }
        } catch (\Throwable $e) {
            Log::error('TaskAssignedMail safeSend failed: ' . $e->getMessage(), [
                'task_id' => $task->id,
                'assignee_id' => $assignee->id,
                'assigner_id' => $assigner->id,
            ]);
        }
    }
}
