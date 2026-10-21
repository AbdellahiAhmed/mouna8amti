<?php

namespace App\Domain\Tenancy;

use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * The single source of truth for "who is acting, inside which organisation"
 * for the current request or job. Entering a tenant also sets the PostgreSQL
 * session settings read by the Row-Level Security policies, so isolation holds
 * even for queries that bypass Eloquent.
 */
final class TenantContext
{
    private ?Organization $organization = null;

    private ?Membership $membership = null;

    public function actAs(User $user): void
    {
        DB::select("SELECT set_config('app.user_id', ?, false)", [(string) $user->getKey()]);
    }

    public function enter(Organization $organization, ?Membership $membership = null): void
    {
        $this->organization = $organization;
        $this->membership = $membership;

        DB::select("SELECT set_config('app.org_id', ?, false)", [(string) $organization->getKey()]);
    }

    public function forget(): void
    {
        $this->organization = null;
        $this->membership = null;

        DB::select("SELECT set_config('app.org_id', '', false), set_config('app.user_id', '', false)");
    }

    public function organization(): ?Organization
    {
        return $this->organization;
    }

    public function organizationId(): ?int
    {
        return $this->organization?->getKey();
    }

    public function membership(): ?Membership
    {
        return $this->membership;
    }
}
