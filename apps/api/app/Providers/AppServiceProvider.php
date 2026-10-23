<?php

namespace App\Providers;

use App\Domain\Access\Enums\Permission;
use App\Domain\Access\Models\Role;
use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Grants\Models\Donor;
use App\Domain\Grants\Models\Grant;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(TenantContext::class);
    }

    public function boot(): void
    {
        // Not shouldBeStrict(): freshly created rows lack DB-defaulted columns, which
        // would make missing-attribute checks fire on perfectly valid models.
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        // Stable public names in audit_logs and API payloads instead of PHP class names.
        Relation::enforceMorphMap([
            'organization' => Organization::class,
            'membership' => Membership::class,
            'role' => Role::class,
            'donor' => Donor::class,
            'project' => Project::class,
            'grant' => Grant::class,
            'budget_line' => BudgetLine::class,
            'expense' => Expense::class,
        ]);

        // Every Permission value is a Gate ability, answered by the current membership.
        Gate::before(function (mixed $user, string $ability): ?bool {
            $permission = Permission::tryFrom($ability);

            if ($permission === null) {
                return null;
            }

            return app(TenantContext::class)->membership()?->hasPermission($permission) ?? false;
        });
    }
}
