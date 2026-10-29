<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create system_settings table
        if (!Schema::hasTable('system_settings')) {
            Schema::create('system_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique()->index();
                $table->text('value')->nullable();
                $table->string('type')->default('boolean'); // boolean, string, json, integer
                $table->string('description')->nullable();
                $table->timestamps();
            });

            // Seed default settings
            DB::table('system_settings')->insert([
                [
                    'key' => 'allow_subadmin_delete_records',
                    'value' => 'false',
                    'type' => 'boolean',
                    'description' => 'Allow Sub-Admins to delete users, departments, and task records',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'key' => 'allow_subadmin_cancel_tasks',
                    'value' => 'false',
                    'type' => 'boolean',
                    'description' => 'Allow Sub-Admins to cancel tasks with required cancellation note',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        // 2. Add cancelled_by_id to tasks table if not exists
        if (Schema::hasTable('tasks') && !Schema::hasColumn('tasks', 'cancelled_by_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->foreignId('cancelled_by_id')->nullable()->after('cancelled_at')->constrained('users')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'cancelled_by_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->dropForeign(['cancelled_by_id']);
                $table->dropColumn('cancelled_by_id');
            });
        }

        Schema::dropIfExists('system_settings');
    }
};
