<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Access\Models\Role;
use App\Domain\Organizations\Actions\CreateOrganization;
use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/** Creates an organisation through the real onboarding action and leaves no tenant context behind. */
function createOrganization(?User $founder = null, string $name = 'منظمة الأمل للتنمية'): Organization
{
    $founder ??= User::factory()->create();

    $organization = app(CreateOrganization::class)->handle($founder, [
        'name' => $name,
        'country' => 'MR',
        'currency' => 'MRU',
        'locale' => 'ar',
        'fiscal_year_start_month' => 1,
    ]);

    app(TenantContext::class)->forget();

    return $organization;
}

function founderOf(Organization $organization): User
{
    app(TenantContext::class)->enter($organization);
    $user = Membership::query()->oldest('id')->firstOrFail()->user;
    app(TenantContext::class)->forget();

    return $user;
}

function addMember(Organization $organization, SystemRole $role, MembershipStatus $status = MembershipStatus::Active): User
{
    $tenant = app(TenantContext::class);
    $tenant->enter($organization);

    $user = User::factory()->create();
    $membership = Membership::query()->create(['user_id' => $user->id, 'status' => $status]);
    $membership->assignRoles([Role::query()->where('key', $role->value)->value('id')]);

    $tenant->forget();

    return $user;
}

/** Requests from the SPA origin, so Sanctum starts a session. */
function spa(): TestCase
{
    return test()->withHeader('Origin', 'http://localhost:3000');
}
