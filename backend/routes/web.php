<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }
    return response()->json(['message' => 'QuickLifeNow Enterprise API']);
});

// Single Page Application (SPA) catch-all route for React Router
Route::get('{any}', function () {
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }
    return response()->json(['message' => 'QuickLifeNow Enterprise API']);
})->where('any', '^(?!api|sanctum|up).*$');
