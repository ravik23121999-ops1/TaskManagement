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
        Schema::table('task_branches', function (Blueprint $table) {
            if (!Schema::hasColumn('task_branches', 'expected_result')) {
                $table->text('expected_result')->nullable()->after('description');
            }
            if (!Schema::hasColumn('task_branches', 'acceptance_criteria')) {
                $table->text('acceptance_criteria')->nullable()->after('expected_result');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_branches', function (Blueprint $table) {
            if (Schema::hasColumn('task_branches', 'acceptance_criteria')) {
                $table->dropColumn('acceptance_criteria');
            }
            if (Schema::hasColumn('task_branches', 'expected_result')) {
                $table->dropColumn('expected_result');
            }
        });
    }
};
