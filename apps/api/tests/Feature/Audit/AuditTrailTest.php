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
