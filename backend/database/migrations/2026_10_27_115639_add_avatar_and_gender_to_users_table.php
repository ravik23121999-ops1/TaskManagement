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
            $table->string('gender', 20)->default('female')->after('role');
            $table->string('avatar_type', 30)->default('preset')->after('gender');
            $table->string('custom_avatar_path')->nullable()->after('avatar_type');
            $table->string('avatar_url')->nullable()->after('custom_avatar_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['gender', 'avatar_type', 'custom_avatar_path', 'avatar_url']);
        });
    }
};
