<?php

namespace App\Providers;

use App\Domain\Access\Enums\Permission;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Model;
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
