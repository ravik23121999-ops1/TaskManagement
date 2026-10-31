<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\File;

class TestingDataCleaner
{
    /**
     * Wipes all test tasks, branches, assignments, submissions, reviews,
     * comments, attachments, chat messages, status logs and notifications.
     * Preserves core departments and verified corporate users.
     */
    public static function clean(): array
    {
        $tables = [
            'task_messages',
            'task_attachments',
            'task_comments',
            'task_reviews',
            'task_submissions',
            'task_hold_records',
            'task_status_history',
            'task_assignments',
            'task_collaborators',
            'task_branches',
            'tasks',
            'notifications',
            'activity_logs',
        ];

        $counts = [];
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    $counts[$table] = DB::table($table)->count();
                    DB::table($table)->truncate();
                }
            }
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        } elseif ($driver === 'pgsql') {
            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    $counts[$table] = DB::table($table)->count();
                    DB::statement("TRUNCATE TABLE \"{$table}\" RESTART IDENTITY CASCADE;");
                }
            }
        } else {
            // SQLite or fallback
            if ($driver === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = OFF;');
            }
            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    $counts[$table] = DB::table($table)->count();
                    DB::table($table)->delete();
                }
            }
            if ($driver === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = ON;');
            }
        }

        // Clean test attachment files from storage/app/public/attachments
        $deletedFiles = 0;
        $attachmentsPath = storage_path('app/public/attachments');
        if (File::isDirectory($attachmentsPath)) {
            $files = File::files($attachmentsPath);
            foreach ($files as $file) {
                if ($file->getFilename() !== '.gitignore') {
                    File::delete($file->getPathname());
                    $deletedFiles++;
                }
            }
        }

        return [
            'tables_cleared' => $counts,
            'files_deleted' => $deletedFiles,
        ];
    }
}
