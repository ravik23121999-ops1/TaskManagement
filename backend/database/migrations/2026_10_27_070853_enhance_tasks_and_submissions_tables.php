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
        Schema::table('tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('tasks', 'start_date')) {
                $table->dateTime('start_date')->nullable()->after('priority');
            }
        });

        Schema::table('task_branches', function (Blueprint $table) {
            if (!Schema::hasColumn('task_branches', 'start_date')) {
                $table->dateTime('start_date')->nullable()->after('owner_id');
            }
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            if (!Schema::hasColumn('task_submissions', 'task_id')) {
                $table->foreignId('task_id')->nullable()->after('id')->constrained('tasks')->onDelete('cascade');
            }
        });

        Schema::table('task_reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('task_reviews', 'task_id')) {
                $table->foreignId('task_id')->nullable()->after('id')->constrained('tasks')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            if (Schema::hasColumn('tasks', 'start_date')) {
                $table->dropColumn('start_date');
            }
        });

        Schema::table('task_branches', function (Blueprint $table) {
            if (Schema::hasColumn('task_branches', 'start_date')) {
                $table->dropColumn('start_date');
            }
        });

        Schema::table('task_submissions', function (Blueprint $table) {
            if (Schema::hasColumn('task_submissions', 'task_id')) {
                $table->dropForeign(['task_id']);
                $table->dropColumn('task_id');
            }
        });

        Schema::table('task_reviews', function (Blueprint $table) {
            if (Schema::hasColumn('task_reviews', 'task_id')) {
                $table->dropForeign(['task_id']);
                $table->dropColumn('task_id');
            }
        });
    }
};
