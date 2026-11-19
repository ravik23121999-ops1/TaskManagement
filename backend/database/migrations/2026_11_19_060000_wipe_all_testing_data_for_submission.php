<?php

use Illuminate\Database\Migrations\Migration;
use App\Services\TestingDataCleaner;
use Illuminate\Support\Facades\Cache;

return new class extends Migration
{
    public function up(): void
    {
        // Wipe all testing tasks, logs, reviews, submissions, and attachments
        TestingDataCleaner::clean();

        // Flush all dashboard and metric caches
        try {
            Cache::flush();
        } catch (\Throwable $e) {
            // Ignore if cache flush fails
        }
    }

    public function down(): void
    {
        // Irreversible clean-up
    }
};
