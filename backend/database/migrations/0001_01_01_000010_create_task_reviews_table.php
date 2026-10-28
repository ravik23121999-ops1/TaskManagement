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
        Schema::create('task_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_branch_id')->nullable()->constrained('task_branches')->onDelete('cascade');
            $table->foreignId('task_submission_id')->constrained('task_submissions')->onDelete('cascade');
            $table->foreignId('reviewer_id')->constrained('users')->onDelete('cascade');
            $table->enum('decision', ['approved', 'returned', 'rejected']);
            $table->text('comments')->nullable();
            $table->timestamp('reviewed_at');
            $table->foreignId('next_reviewer_id')->nullable()->constrained('users')->onDelete('set null');

            $table->index('task_branch_id');
            $table->index('task_submission_id');
            $table->index('reviewer_id');
            $table->index('decision');
            $table->index('reviewed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_reviews');
    }
};
