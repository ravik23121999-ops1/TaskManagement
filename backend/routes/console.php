<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Services\TestingDataCleaner;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:clear-testing-data', function () {
    $this->info('==> Wiping all testing tasks, attachments, messages, comments and logs...');
    $result = TestingDataCleaner::clean();
    $this->info('==> Cleared table records:');
    foreach ($result['tables_cleared'] as $table => $count) {
        $this->line("   - {$table}: {$count} records removed");
    }
    $this->info("==> Deleted {$result['files_deleted']} test attachment files from storage.");
    $this->info('==> All testing data successfully cleared! System is pristine.');
})->purpose('Clear all testing tasks, branches, attachments, messages, logs and notifications');
