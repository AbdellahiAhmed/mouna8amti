<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;

function projectPayload(array $overrides = []): array
{
    return [
        'code' => 'EDU-2026',
        'name' => 'مشروع التعليم الأساسي',
        'description' => null,
        'manager_membership_id' => null,
        'starts_on' => '2026-01-01',
        'ends_on' => '2026-12-31',
        'status' => 'active',
        'progress' => 30,
        ...$overrides,
    ];
}

function membershipIdOf(Organization $organization, int $userId): int
{
    app(TenantContext::class)->enter($organization);
    $id = Membership::query()->where('user_id', $userId)->value('id');
    app(TenantContext::class)->forget();

    return (int) $id;
}

it('creates a project with a manager from the same organisation and audits it', function () {
    $organization = createOrganization();
    $founder = founderOf($organization);
    $coordinator = addMember($organization, SystemRole::ProjectCoordinator);

    $this->actingAs($founder)
        ->postJson("/api/orgs/{$organization->slug}/projects", projectPayload([
            'manager_membership_id' => membershipIdOf($organization, $coordinator->id),
        ]))
        ->assertCreated()
        ->assertJsonPath('data.code', 'EDU-2026')
        ->assertJsonPath('data.manager.name', $coordinator->name);

    app(TenantContext::class)->enter($organization);
    expect(AuditLog::query()->where('auditable_type', 'project')->where('event', 'created')->exists())->toBeTrue();
});

it('rejects a manager who belongs to another organisation', function () {
    $mine = createOrganization(name: 'Mine');
    $theirs = createOrganization(name: 'Theirs');
    $founder = founderOf($mine);

    // The founder's own seat in a second organisation is visible to them through RLS; it must still be refused.
    $foreignSeat = membershipIdOf($theirs, founderOf($theirs)->id);

    $this->actingAs($founder)
        ->postJson("/api/orgs/{$mine->slug}/projects", projectPayload(['manager_membership_id' => $foreignSeat]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('manager_membership_id');
});

it('keeps project codes unique per organisation only', function () {
    $first = createOrganization(name: 'First');
    $second = createOrganization(name: 'Second');

    $this->actingAs(founderOf($first))->postJson("/api/orgs/{$first->slug}/projects", projectPayload())->assertCreated();
    $this->actingAs(founderOf($first))->postJson("/api/orgs/{$first->slug}/projects", projectPayload())
        ->assertUnprocessable()->assertJsonValidationErrors('code');
    $this->actingAs(founderOf($second))->postJson("/api/orgs/{$second->slug}/projects", projectPayload())->assertCreated();
});

it('validates dates, status and progress', function () {
    $organization = createOrganization();

    $this->actingAs(founderOf($organization))
        ->postJson("/api/orgs/{$organization->slug}/projects", projectPayload([
            'ends_on' => '2025-01-01',
            'status' => 'finished',
            'progress' => 140,
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['ends_on', 'status', 'progress']);
});

it('filters and searches the project list', function () {
    $organization = createOrganization();
    $founder = founderOf($organization);
    $base = "/api/orgs/{$organization->slug}/projects";

    $this->actingAs($founder)->postJson($base, projectPayload(['code' => 'EDU', 'name' => 'Education']));
    $this->actingAs($founder)->postJson($base, projectPayload(['code' => 'WAT', 'name' => 'Water', 'status' => 'on_hold']));

    $this->actingAs($founder)->getJson("{$base}?status=on_hold")->assertJsonCount(1, 'data')->assertJsonPath('data.0.code', 'WAT');
    $this->actingAs($founder)->getJson("{$base}?search=educ")->assertJsonCount(1, 'data')->assertJsonPath('data.0.code', 'EDU');
});

it('lets donor viewers read projects but not change them', function () {
    $organization = createOrganization();
    $viewer = addMember($organization, SystemRole::DonorViewer);
    $base = "/api/orgs/{$organization->slug}/projects";

    $this->actingAs($viewer)->getJson($base)->assertOk();
    $this->actingAs($viewer)->postJson($base, projectPayload())->assertForbidden();
});

it('answers 404 for a project id that belongs to another organisation', function () {
    $mine = createOrganization(name: 'Mine');
    $theirs = createOrganization(name: 'Theirs');
    $this->actingAs(founderOf($theirs))->postJson("/api/orgs/{$theirs->slug}/projects", projectPayload())->assertCreated();

    app(TenantContext::class)->enter($theirs);
    $foreignProjectId = Project::query()->value('id');
    app(TenantContext::class)->forget();

    $this->actingAs(founderOf($mine))
        ->getJson("/api/orgs/{$mine->slug}/projects/{$foreignProjectId}")
        ->assertNotFound();
});

it('updates and soft-deletes a project', function () {
    $organization = createOrganization();
    $founder = founderOf($organization);
    $base = "/api/orgs/{$organization->slug}/projects";
    $id = $this->actingAs($founder)->postJson($base, projectPayload())->json('data.id');

    $this->actingAs($founder)->putJson("{$base}/{$id}", projectPayload(['progress' => 75]))
        ->assertOk()->assertJsonPath('data.progress', 75);

    $this->actingAs($founder)->deleteJson("{$base}/{$id}")->assertNoContent();
    $this->actingAs($founder)->getJson("{$base}/{$id}")->assertNotFound();

    app(TenantContext::class)->enter($organization);
    expect(Project::withTrashed()->find($id))->not->toBeNull();
});
