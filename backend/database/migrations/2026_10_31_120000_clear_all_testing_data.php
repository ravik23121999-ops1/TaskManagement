<?php

use Illuminate\Database\Migrations\Migration;
use App\Services\TestingDataCleaner;

return new class extends Migration
{
    public function up(): void
    {
        // Guard against wiping data if run in a production environment
        if (!app()->isProduction()) {
            TestingDataCleaner::clean();
        }
    }

    public function down(): void
    {
        // Testing data wipe is irreversible
    }
};
