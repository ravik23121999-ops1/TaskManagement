<?php

use Illuminate\Database\Migrations\Migration;
use App\Services\TestingDataCleaner;

return new class extends Migration
{
    public function up(): void
    {
        TestingDataCleaner::clean();
    }

    public function down(): void
    {
        // Testing data wipe is irreversible
    }
};
