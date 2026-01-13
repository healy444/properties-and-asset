<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\UserController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Reference Data (Read: Shared, Write: Admin)
    Route::prefix('references')->group(function () {
        Route::get('/{type}', [ReferenceController::class, 'index']);
        Route::post('/{type}', [ReferenceController::class, 'store'])->middleware('role:super_admin,admin');
        Route::put('/{type}/{id}', [ReferenceController::class, 'update'])->middleware('role:super_admin,admin');
        Route::post('/{type}/{id}/toggle-status', [ReferenceController::class, 'toggleStatus'])->middleware('role:super_admin,admin');
    });

    // Assets (Admin & Branch Custodian)
    Route::middleware(['role:super_admin,admin,branch_custodian'])->group(function () {
        Route::get('/assets/export', [AssetController::class, 'export']);
        Route::post('/assets/{asset}/finalize-draft', [AssetController::class, 'finalizeDraft']);
        Route::post('/assets/{asset}/request-delete', [AssetController::class, 'requestDelete']);
        Route::get('/assets/{asset}', [AssetController::class, 'show'])->withTrashed();
        Route::apiResource('assets', AssetController::class)->except(['show']);

        // Profile
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::post('/profile/change-password', [ProfileController::class, 'changePassword']);

        // Dashboard
        Route::get('/dashboard/metrics', [DashboardController::class, 'getMetrics']);
    });

    // Admin Only
    Route::middleware(['role:super_admin,admin'])->group(function () {
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
        Route::post('/users/{user}/toggle-status', [UserController::class, 'toggleStatus']);
        Route::apiResource('users', UserController::class);
        Route::post('/assets/{asset}/approve-delete', [AssetController::class, 'approveDelete']);
        Route::post('/assets/{asset}/reject-delete', [AssetController::class, 'rejectDelete']);
    });

    Route::middleware(['role:super_admin'])->group(function () {
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::post('/assets/{asset}/restore', [AssetController::class, 'restore'])->withTrashed();
    });
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
