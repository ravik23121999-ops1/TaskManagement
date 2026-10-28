<?php

namespace App\Jobs;

use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendTaskNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
        public string $type,
        public string $message,
        public ?int $taskId = null,
        public ?string $title = null,
        public ?int $taskBranchId = null
    ) {
        $this->title = $title ?? ucfirst(str_replace('_', ' ', $type));
    }

    public function handle(): void
    {
        SystemNotification::create([
            'user_id' => $this->userId,
            'type' => $this->type,
            'title' => $this->title ?? 'Task Notification',
            'message' => $this->message,
            'task_id' => $this->taskId,
            'task_branch_id' => $this->taskBranchId,
            'is_read' => false,
            'created_at' => now(),
        ]);
    }
}
