<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('task_branches', 'can_assign_further')) {
            Schema::table('task_branches', function (Blueprint $table) {
                $table->boolean('can_assign_further')->default(true);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('task_branches', 'can_assign_further')) {
            Schema::table('task_branches', function (Blueprint $table) {
                $table->dropColumn('can_assign_further');
            });
        }
    }
};
