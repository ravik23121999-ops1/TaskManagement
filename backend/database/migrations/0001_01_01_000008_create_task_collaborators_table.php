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
        Schema::create('task_collaborators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_branch_id')->constrained('task_branches')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('invited_by_id')->constrained('users')->onDelete('cascade');
            $table->boolean('can_assign')->default(false);
            $table->boolean('can_collaborate')->default(true);
            $table->timestamp('invited_at');
            $table->timestamp('removed_at')->nullable();

            $table->unique(['task_branch_id', 'user_id']);
            $table->index('user_id');
            $table->index('invited_by_id');
            $table->index('invited_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_collaborators');
    }
};
