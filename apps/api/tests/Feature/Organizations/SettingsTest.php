<?php

use App\Domain\Access\Enums\SystemRole;

it('lets organisation managers rename the organisation but never change its currency', function () {
    $organization = createOrganization();
    $url = "/api/orgs/{$organization->slug}";
    $payload = ['name' => 'جمعية الأمل', 'legal_name' => null, 'locale' => 'fr', 'fiscal_year_start_month' => 7, 'currency' => 'EUR'];

    $this->actingAs(addMember($organization, SystemRole::Director))->putJson($url, $payload)->assertForbidden();

    $this->actingAs(founderOf($organization))->putJson($url, $payload)
        ->assertOk()
        ->assertJsonPath('data.name', 'جمعية الأمل')
        ->assertJsonPath('data.fiscal_year_start_month', 7)
        ->assertJsonPath('data.currency', 'MRU');
});

it('updates the profile and changes the password only with the current one', function () {
    $user = founderOf(createOrganization());

    $this->actingAs($user)->putJson('/api/auth/profile', ['name' => 'أحمد', 'locale' => 'en'])
        ->assertOk()->assertJsonPath('data.locale', 'en');

    $this->actingAs($user)->putJson('/api/auth/password', ['current_password' => 'wrong', 'password' => 'NewPass-2026', 'password_confirmation' => 'NewPass-2026'])
        ->assertUnprocessable()->assertJsonValidationErrors('current_password');
    $this->actingAs($user)->putJson('/api/auth/password', ['current_password' => 'password', 'password' => 'NewPass-2026', 'password_confirmation' => 'NewPass-2026'])
        ->assertNoContent();
});
