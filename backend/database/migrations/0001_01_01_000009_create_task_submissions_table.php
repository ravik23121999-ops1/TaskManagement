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
        Schema::create('task_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_branch_id')->nullable()->constrained('task_branches')->onDelete('cascade');
            $table->foreignId('submitted_by_id')->constrained('users')->onDelete('cascade');
            $table->text('description')->nullable();
            $table->timestamp('submitted_at');
            $table->boolean('is_final')->default(false);

            $table->index('task_branch_id');
            $table->index('submitted_by_id');
            $table->index('submitted_at');
            $table->index('is_final');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_submissions');
    }
};
