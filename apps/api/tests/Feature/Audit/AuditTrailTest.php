<?php

use App\Domain\Access\Models\Role;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Database\QueryException;

it('records who created the organisation and its initial setup', function () {
    $founder = User::factory()->create();
    $this->actingAs($founder);

    $organization = createOrganization($founder);
    app(TenantContext::class)->enter($organization);

    $created = AuditLog::query()->where('auditable_type', (new Organization)->getMorphClass())->sole();
    expect($created->event)->toBe('created')
        ->and($created->actor_id)->toBe($founder->id)
        ->and($created->new_values['name'] ?? null)->toBe($organization->name);

    // 7 system roles + 1 membership, each audited.
    expect(AuditLog::query()->where('event', 'created')->count())->toBe(9);
});

it('stores only the changed attributes on update', function () {
    $organization = createOrganization();
    app(TenantContext::class)->enter($organization);

    $role = Role::query()->where('key', 'accountant')->firstOrFail();
    $role->update(['permissions' => ['projects.view']]);

    $entry = AuditLog::query()->where('event', 'updated')->sole();
    expect(array_keys($entry->new_values ?? []))->toBe(['permissions'])
        ->and(array_keys($entry->old_values ?? []))->toBe(['permissions']);
});

it('is append-only at the database level', function () {
    $organization = createOrganization();
    app(TenantContext::class)->enter($organization);

    AuditLog::query()->firstOrFail()->update(['event' => 'tampered']);
})->throws(QueryException::class, 'append-only');

it('serves a readable trail: named subjects and business fields only', function () {
    $organization = createOrganization();
    $founder = founderOf($organization);
    $base = "/api/orgs/{$organization->slug}";

    $id = $this->actingAs($founder)->postJson("{$base}/projects", [
        'code' => 'EDU', 'name' => 'Education', 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31',
        'status' => 'draft', 'progress' => 0,
    ])->json('data.id');
    $this->actingAs($founder)->putJson("{$base}/projects/{$id}", [
        'code' => 'EDU', 'name' => 'Education', 'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31',
        'status' => 'active', 'progress' => 10,
    ]);

    $entry = $this->actingAs($founder)->getJson("{$base}/audit-logs?subject=project")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->json('data.0');

    expect($entry['subject']['label'])->toBe('Education')
        ->and($entry['actor']['name'])->toBe($founder->name)
        ->and(collect($entry['changes'])->pluck('field')->all())->toBe(['status', 'progress'])
        ->and($entry['changes'][0])->toMatchArray(['old' => 'draft', 'new' => 'active']);
});
