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
        Schema::create('task_branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'review', 'on_hold', 'post_comment', 'completed', 'cancelled'])->default('pending');
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->unsignedBigInteger('parent_assignment_id')->nullable();
            $table->dateTime('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('task_id');
            $table->index('owner_id');
            $table->index('status');
            $table->index('parent_assignment_id');
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_branches');
    }
};
