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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'sub_admin', 'employee'])->default('employee')->after('email');
            $table->foreignId('department_id')->nullable()->after('role');
            $table->boolean('is_active')->default(true)->after('department_id');
            $table->timestamp('email_verified_at')->nullable()->after('password');

            $table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
            $table->index('role');
            $table->index('department_id');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropIndex(['role']);
            $table->dropIndex(['department_id']);
            $table->dropIndex(['is_active']);
            $table->dropColumn(['role', 'department_id', 'is_active', 'email_verified_at']);
        });
    }
};
