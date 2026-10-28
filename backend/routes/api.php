<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\TaskBranchController;
use App\Http\Controllers\Api\V1\CommentController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\TaskSubmissionController;
use App\Http\Controllers\Api\V1\TaskReviewController;
use App\Http\Controllers\Api\V1\TaskClarificationController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\ReportsController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\WorkLogController;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/auth/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download']);
Route::get('/v1/attachments/{attachment}/download', [AttachmentController::class, 'download']);

Route::middleware('auth:sanctum')->group(function () {
    // Profile & Settings
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']);

    // Dashboards & Reports
    Route::get('/dashboard/admin', [ReportsController::class, 'adminDashboard']);
    Route::get('/dashboard/employee', [ReportsController::class, 'employeeDashboard']);
    Route::get('/reports', [ReportsController::class, 'reports']);

    // Users
    Route::apiResource('users', UserController::class);
    Route::put('/users/{user}/activate', [UserController::class, 'activate']);
    Route::put('/users/{user}/deactivate', [UserController::class, 'deactivate']);

    // Departments
    Route::apiResource('departments', DepartmentController::class);
    Route::put('/departments/{department}/activate', [DepartmentController::class, 'activate']);
    Route::put('/departments/{department}/deactivate', [DepartmentController::class, 'deactivate']);

    // Tasks
    Route::apiResource('tasks', TaskController::class);
    Route::post('/tasks/{task}/cancel', [TaskController::class, 'cancel']);
    Route::post('/tasks/{task}/submit', [TaskSubmissionController::class, 'submit']);
    Route::post('/tasks/{task}/final-submit', [TaskSubmissionController::class, 'finalSubmit']);
    Route::put('/tasks/{task}/hold', [TaskController::class, 'hold']);
    Route::put('/tasks/{task}/resume', [TaskController::class, 'resume']);
    Route::post('/tasks/{task}/assignees', [TaskController::class, 'addAssignees']);
    Route::post('/tasks/{task}/collaborators', [TaskController::class, 'addCollaborators']);
    Route::post('/tasks/{task}/request-details', [TaskClarificationController::class, 'requestDetails']);
    Route::post('/tasks/{task}/provide-details', [TaskClarificationController::class, 'provideDetails']);
    Route::post('/v1/tasks/{task}/request-details', [TaskClarificationController::class, 'requestDetails']);
    Route::post('/v1/tasks/{task}/provide-details', [TaskClarificationController::class, 'provideDetails']);

    // Branches & delegation
    Route::apiResource('task-branches', TaskBranchController::class);
    Route::post('/task-branches/{branch}/submit', [TaskSubmissionController::class, 'submit']);
    Route::post('/task-branches/{branch}/delegate', [TaskBranchController::class, 'delegate']);

    // Comments & Notifications
    Route::apiResource('comments', CommentController::class);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Reviews
    Route::post('/submissions/{submission}/review', [TaskReviewController::class, 'review']);

    // Attachments
    Route::post('/attachments', [AttachmentController::class, 'upload']);
    Route::get('/attachments', [AttachmentController::class, 'index']);

    // Work Logs & Audit Trail (Admin / Sub-Admin)
    Route::get('/work-logs', [WorkLogController::class, 'index']);
    Route::get('/work-logs/stats', [WorkLogController::class, 'stats']);
    Route::get('/work-logs/tasks', [WorkLogController::class, 'tasksList']);
    Route::get('/work-logs/users', [WorkLogController::class, 'usersList']);
    Route::get('/work-logs/journeys', [WorkLogController::class, 'journeys']);
    Route::get('/work-logs/task/{task}', [WorkLogController::class, 'taskJourney']);
});
