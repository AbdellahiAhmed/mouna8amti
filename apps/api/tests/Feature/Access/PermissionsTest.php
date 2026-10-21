<?php

use App\Domain\Access\Enums\Permission;
use App\Domain\Access\Enums\SystemRole;

it('lets the admin read the audit trail', function () {
    $organization = createOrganization();

    $this->actingAs(founderOf($organization))
        ->getJson("/api/orgs/{$organization->slug}/audit-logs")
        ->assertOk();
});

it('forbids roles without audit.view from reading the audit trail', function () {
    $organization = createOrganization();
    $coordinator = addMember($organization, SystemRole::ProjectCoordinator);

    $this->actingAs($coordinator)
        ->getJson("/api/orgs/{$organization->slug}/audit-logs")
        ->assertForbidden()
        ->assertJsonPath('code', 'forbidden');
});

it('exposes the effective permissions of each membership on /me', function () {
    $organization = createOrganization();
    $viewer = addMember($organization, SystemRole::DonorViewer);

    $this->actingAs($viewer)->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('data.memberships.0.permissions', [Permission::ProjectsView->value]);
});

it('gives the admin every permission in the catalogue', function () {
    expect(array_map(fn (Permission $p) => $p->value, SystemRole::Admin->permissions()))
        ->toBe(Permission::values());
});
