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
        if (!Schema::hasColumn('task_branches', 'share_parent_details')) {
            Schema::table('task_branches', function (Blueprint $table) {
                $table->boolean('share_parent_details')->default(true)->after('due_date');
            });
        }
        if (!Schema::hasColumn('task_branches', 'can_assign_further')) {
            Schema::table('task_branches', function (Blueprint $table) {
                $table->boolean('can_assign_further')->default(true)->after('due_date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('task_branches', 'share_parent_details')) {
            Schema::table('task_branches', function (Blueprint $table) {
                $table->dropColumn('share_parent_details');
            });
        }
    }
};
