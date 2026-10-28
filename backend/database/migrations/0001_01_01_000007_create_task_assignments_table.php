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
        Schema::create('task_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_branch_id')->constrained('task_branches')->onDelete('cascade');
            $table->foreignId('assigned_to_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_by_id')->constrained('users')->onDelete('cascade');
            $table->boolean('is_current')->default(true);
            $table->timestamp('assigned_at');
            $table->timestamp('revoked_at')->nullable();

            $table->index('task_branch_id');
            $table->index('assigned_to_id');
            $table->index('assigned_by_id');
            $table->index('is_current');
            $table->index('assigned_at');
        });

        Schema::table('task_branches', function (Blueprint $table) {
            $table->foreign('parent_assignment_id')->references('id')->on('task_assignments')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_branches', function (Blueprint $table) {
            $table->dropForeign(['parent_assignment_id']);
        });
        Schema::dropIfExists('task_assignments');
    }
};
