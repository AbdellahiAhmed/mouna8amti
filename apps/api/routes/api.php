<?php

use App\Http\Controllers\Auth\CurrentUserController;
use App\Http\Controllers\Auth\RegistrationController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Organizations\AuditLogController;
use App\Http\Controllers\Organizations\MemberController;
use App\Http\Controllers\Organizations\OrganizationController;
use App\Http\Controllers\Organizations\RoleController;
use App\Http\Middleware\ActAsDatabaseUser;
use App\Http\Middleware\ResolveOrganization;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::post('register', [RegistrationController::class, 'store'])->middleware('throttle:10,1');
        Route::post('login', [SessionController::class, 'store']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [SessionController::class, 'destroy']);
        Route::get('me', [CurrentUserController::class, 'show'])->middleware(ActAsDatabaseUser::class);
    });
});

Route::middleware(['auth:sanctum', ActAsDatabaseUser::class])->group(function () {
    Route::post('organizations', [OrganizationController::class, 'store'])->middleware('throttle:10,1');

    Route::prefix('orgs/{organization}')->middleware(ResolveOrganization::class)->group(function () {
        Route::get('/', [OrganizationController::class, 'show']);
        Route::get('members', [MemberController::class, 'index']);
        Route::get('roles', [RoleController::class, 'index']);
        Route::get('audit-logs', [AuditLogController::class, 'index']);
    });
});
