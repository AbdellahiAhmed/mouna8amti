<?php

use App\Domain\Access\Enums\SystemRole;
use App\Domain\Access\Models\Role;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use App\Notifications\MemberInvited;
use Illuminate\Support\Facades\Notification;

function roleId(Organization $organization, SystemRole $role): int
{
    app(TenantContext::class)->enter($organization);
    $id = (int) Role::query()->where('key', $role->value)->value('id');
    app(TenantContext::class)->forget();

    return $id;
}

it('invites a newcomer who sets a password and becomes an active member', function () {
    Notification::fake();
    $organization = createOrganization();
    $admin = founderOf($organization);

    $this->actingAs($admin)->postJson("/api/orgs/{$organization->slug}/members", [
        'name' => 'سيدي محمد',
        'email' => 'Accountant@Example.org',
        'title' => 'محاسب',
        'role_id' => roleId($organization, SystemRole::Accountant),
    ])->assertCreated()->assertJsonPath('data.status', 'invited')->assertJsonPath('data.permissions', fn ($p) => in_array('expenses.review', $p, true));

    $invitee = User::query()->where('email', 'accountant@example.org')->firstOrFail();
    $token = null;
    Notification::assertSentTo($invitee, MemberInvited::class, function (MemberInvited $n) use (&$token) {
        $token = $n->token;

        return $token !== null;
    });

    // An invited seat grants nothing yet: the organisation stays hidden.
    $this->actingAs($invitee)->getJson("/api/orgs/{$organization->slug}/projects")->assertNotFound();

    auth()->forgetGuards();
    spa()->postJson('/api/auth/invitations/accept', [
        'email' => 'accountant@example.org', 'token' => 'wrong', 'password' => 'Invite-2026x', 'password_confirmation' => 'Invite-2026x',
    ])->assertUnprocessable()->assertJsonValidationErrors('token');

    spa()->postJson('/api/auth/invitations/accept', [
        'email' => 'accountant@example.org', 'token' => $token, 'password' => 'Invite-2026x', 'password_confirmation' => 'Invite-2026x',
    ])->assertOk();

    $this->assertAuthenticatedAs($invitee);
    app(TenantContext::class)->enter($organization);
    expect(Membership::query()->where('user_id', $invitee->id)->value('status')->value)->toBe('active');
});

it('adds an existing account directly and refuses duplicates', function () {
    Notification::fake();
    $organization = createOrganization();
    $admin = founderOf($organization);
    $existing = User::factory()->create(['email' => 'known@example.org']);
    $payload = ['name' => 'x', 'email' => 'known@example.org', 'role_id' => roleId($organization, SystemRole::HrOfficer)];

    $this->actingAs($admin)->postJson("/api/orgs/{$organization->slug}/members", $payload)
        ->assertCreated()->assertJsonPath('data.status', 'active');
    Notification::assertSentTo($existing, MemberInvited::class, fn (MemberInvited $n) => $n->token === null);

    $this->actingAs($admin)->postJson("/api/orgs/{$organization->slug}/members", $payload)
        ->assertUnprocessable()->assertJsonValidationErrors('email');
});

it('lets only member managers invite, and only with this organisation\'s roles', function () {
    $organization = createOrganization();
    $other = createOrganization(name: 'Other');
    $payload = ['name' => 'x', 'email' => 'new@example.org', 'role_id' => roleId($organization, SystemRole::Accountant)];

    $this->actingAs(addMember($organization, SystemRole::Director))
        ->postJson("/api/orgs/{$organization->slug}/members", $payload)->assertForbidden();

    $this->actingAs(founderOf($organization))
        ->postJson("/api/orgs/{$organization->slug}/members", [...$payload, 'role_id' => roleId($other, SystemRole::Admin)])
        ->assertUnprocessable()->assertJsonValidationErrors('role_id');
});
