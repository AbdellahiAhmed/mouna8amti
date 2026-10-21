<?php

use App\Domain\Access\Enums\SystemRole;

it('manages donors within the organisation', function () {
    $organization = createOrganization();
    $founder = founderOf($organization);
    $base = "/api/orgs/{$organization->slug}/donors";

    $id = $this->actingAs($founder)->postJson($base, [
        'name' => 'الاتحاد الأوروبي',
        'type' => 'multilateral',
        'country' => 'be',
        'contact_email' => 'programme@example.eu',
    ])->assertCreated()->assertJsonPath('data.country', 'BE')->json('data.id');

    $this->actingAs($founder)->putJson("{$base}/{$id}", ['name' => 'European Union', 'type' => 'multilateral'])
        ->assertOk()->assertJsonPath('data.name', 'European Union');

    $this->actingAs($founder)->getJson("{$base}?search=europ")->assertJsonCount(1, 'data');

    $this->actingAs($founder)->deleteJson("{$base}/{$id}")->assertNoContent();
    $this->actingAs($founder)->getJson($base)->assertJsonCount(0, 'data');
});

it('rejects unknown donor types', function () {
    $organization = createOrganization();

    $this->actingAs(founderOf($organization))
        ->postJson("/api/orgs/{$organization->slug}/donors", ['name' => 'X', 'type' => 'friend'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('type');
});

it('reserves donor management to roles holding donors.manage', function () {
    $organization = createOrganization();
    $coordinator = addMember($organization, SystemRole::ProjectCoordinator);

    $this->actingAs($coordinator)
        ->postJson("/api/orgs/{$organization->slug}/donors", ['name' => 'X', 'type' => 'other'])
        ->assertForbidden();
});

it('never lists another organisation\'s donors', function () {
    $mine = createOrganization(name: 'Mine');
    $theirs = createOrganization(name: 'Theirs');
    $this->actingAs(founderOf($theirs))->postJson("/api/orgs/{$theirs->slug}/donors", ['name' => 'Secret donor', 'type' => 'private']);

    $this->actingAs(founderOf($mine))->getJson("/api/orgs/{$mine->slug}/donors")->assertJsonCount(0, 'data');
});
