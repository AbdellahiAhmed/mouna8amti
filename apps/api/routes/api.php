<?php

use App\Http\Controllers\Auth\CurrentUserController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\Auth\MembershipInvitationController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Auth\RegistrationController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Budgets\BudgetLineController;
use App\Http\Controllers\Expenses\ExpenseController;
use App\Http\Controllers\Expenses\ExpenseDecisionController;
use App\Http\Controllers\Grants\DonorController;
use App\Http\Controllers\Grants\DonorReportController;
use App\Http\Controllers\Grants\GrantController;
use App\Http\Controllers\Organizations\AuditLogController;
use App\Http\Controllers\Organizations\MemberController;
use App\Http\Controllers\Organizations\OrganizationController;
use App\Http\Controllers\Organizations\RoleController;
use App\Http\Controllers\Projects\ActivityController;
use App\Http\Controllers\Projects\ProjectController;
use App\Http\Controllers\Reports\ReportController;
use App\Http\Middleware\ActAsDatabaseUser;
use App\Http\Middleware\ResolveOrganization;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::post('register', [RegistrationController::class, 'store'])->middleware('throttle:10,1');
        Route::post('login', [SessionController::class, 'store']);
        Route::post('invitations/password', [InvitationController::class, 'store'])->middleware('throttle:10,1');
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [SessionController::class, 'destroy']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::put('password', [ProfileController::class, 'password'])->middleware('throttle:6,1');
        Route::get('me', [CurrentUserController::class, 'show'])->middleware(ActAsDatabaseUser::class);
        Route::post('invitations/{membership}/accept', [MembershipInvitationController::class, 'accept'])->whereNumber('membership')->middleware(ActAsDatabaseUser::class);
        Route::post('invitations/{membership}/decline', [MembershipInvitationController::class, 'decline'])->whereNumber('membership')->middleware(ActAsDatabaseUser::class);
    });
});

Route::middleware(['auth:sanctum', ActAsDatabaseUser::class])->group(function () {
    Route::post('organizations', [OrganizationController::class, 'store'])->middleware('throttle:10,1');

    Route::prefix('orgs/{organization}')->middleware(ResolveOrganization::class)->group(function () {
        Route::get('/', [OrganizationController::class, 'show']);
        Route::put('/', [OrganizationController::class, 'update']);
        Route::get('members', [MemberController::class, 'index']);
        Route::post('members', [MemberController::class, 'store'])->middleware('throttle:30,1');
        Route::get('roles', [RoleController::class, 'index']);
        Route::get('audit-logs', [AuditLogController::class, 'index']);

        Route::apiResource('donors', DonorController::class)->except('show');
        Route::apiResource('projects', ProjectController::class);
        Route::apiResource('grants', GrantController::class)->except('show');
        Route::apiResource('projects.budget-lines', BudgetLineController::class)->shallow()->except('show');
        Route::apiResource('projects.activities', ActivityController::class)->shallow()->except('show');
        Route::get('donor-reports', [DonorReportController::class, 'index']);
        Route::apiResource('grants.donor-reports', DonorReportController::class)->shallow()->only(['store', 'update', 'destroy'])->parameters(['donor-reports' => 'report']);

        Route::apiResource('expenses', ExpenseController::class);
        Route::get('expenses/{expense}/attachment', [ExpenseController::class, 'attachment']);
        Route::post('expenses/{expense}/review', [ExpenseDecisionController::class, 'review']);
        Route::post('expenses/{expense}/approve', [ExpenseDecisionController::class, 'approve']);
        Route::post('expenses/{expense}/reject', [ExpenseDecisionController::class, 'reject']);

        Route::get('dashboard', [ReportController::class, 'dashboard']);
        Route::get('reports/monthly', [ReportController::class, 'monthly']);
    });
});
