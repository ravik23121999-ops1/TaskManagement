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
        Schema::create('task_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->onDelete('cascade');
            $table->foreignId('task_branch_id')->nullable()->constrained('task_branches')->onDelete('cascade');
            $table->foreignId('task_comment_id')->nullable()->constrained('task_comments')->onDelete('cascade');
            $table->foreignId('uploaded_by_id')->constrained('users')->onDelete('cascade');
            $table->string('file_name');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size');
            $table->string('file_type');
            $table->timestamps();

            $table->index('task_id');
            $table->index('task_branch_id');
            $table->index('task_comment_id');
            $table->index('uploaded_by_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_attachments');
    }
};
