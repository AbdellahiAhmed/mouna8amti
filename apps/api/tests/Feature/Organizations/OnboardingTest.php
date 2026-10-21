<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Access\Models\Role;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;

it('creates an organisation with system roles and the founder as admin', function () {
    $founder = User::factory()->create();

    $response = $this->actingAs($founder)->postJson('/api/organizations', [
        'name' => 'منظمة الأمل للتنمية',
        'country' => 'mr',
        'currency' => 'mru',
        'locale' => 'ar',
        'fiscal_year_start_month' => 1,
    ])->assertCreated()
        ->assertJsonPath('data.country', 'MR')
        ->assertJsonPath('data.currency', 'MRU');

    $organization = Organization::query()->where('slug', $response->json('data.slug'))->firstOrFail();
    app(TenantContext::class)->enter($organization);

    expect(Role::query()->pluck('key')->sort()->values()->all())
        ->toBe(collect(SystemRole::cases())->pluck('value')->sort()->values()->all());

    $membership = Membership::query()->with('roles')->sole();
    expect($membership->user_id)->toBe($founder->id)
        ->and($membership->roles->pluck('key')->all())->toBe(['admin']);
});

it('generates a unique slug even for names that do not transliterate', function () {
    $first = createOrganization(name: 'منظمة');
    $second = createOrganization(name: 'منظمة');

    expect($first->slug)->not->toBe($second->slug)
        ->and($first->slug)->toMatch('/^[a-z0-9-]+$/');
});

it('validates the onboarding payload', function () {
    $this->actingAs(User::factory()->create())->postJson('/api/organizations', [
        'name' => '',
        'country' => 'MRT',
        'currency' => 'M',
        'locale' => 'de',
        'fiscal_year_start_month' => 13,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'country', 'currency', 'locale', 'fiscal_year_start_month']);
});

it('requires authentication to create an organisation', function () {
    $this->postJson('/api/organizations', [])->assertUnauthorized();
});
