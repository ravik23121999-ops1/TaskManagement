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
        Schema::create('task_hold_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->onDelete('cascade');
            $table->foreignId('task_branch_id')->nullable()->constrained('task_branches')->onDelete('cascade');
            $table->foreignId('put_on_hold_by_id')->constrained('users')->onDelete('cascade');
            $table->text('reason');
            $table->timestamp('held_at');
            $table->timestamp('resumed_at')->nullable();
            $table->foreignId('resumed_by_id')->nullable()->constrained('users')->onDelete('set null');

            $table->index('task_id');
            $table->index('task_branch_id');
            $table->index('put_on_hold_by_id');
            $table->index('held_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_hold_records');
    }
};
