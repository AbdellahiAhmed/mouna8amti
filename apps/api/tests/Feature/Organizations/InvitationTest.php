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

function seatStatus(Organization $organization, User $user): ?string
{
    app(TenantContext::class)->enter($organization);
    $status = Membership::query()->where('user_id', $user->id)->first()?->status->value;
    app(TenantContext::class)->forget();

    return $status;
}

it('lets a newcomer set a password, then accept the seat themselves', function () {
    Notification::fake();
    $organization = createOrganization();

    $seatId = $this->actingAs(founderOf($organization))->postJson("/api/orgs/{$organization->slug}/members", [
        'name' => 'سيدي محمد',
        'email' => 'Accountant@Example.org',
        'title' => 'محاسب',
        'role_id' => roleId($organization, SystemRole::Accountant),
    ])->assertCreated()->assertJsonPath('data.status', 'invited')->json('data.id');

    $invitee = User::query()->where('email', 'accountant@example.org')->firstOrFail();
    $token = null;
    Notification::assertSentTo($invitee, MemberInvited::class, function (MemberInvited $n) use (&$token) {
        $token = $n->token;

        return $token !== null;
    });

    auth()->forgetGuards();
    $password = ['email' => 'accountant@example.org', 'password' => 'Invite-2026x', 'password_confirmation' => 'Invite-2026x'];
    spa()->postJson('/api/auth/invitations/password', [...$password, 'token' => 'wrong'])
        ->assertUnprocessable()->assertJsonValidationErrors('token');
    spa()->postJson('/api/auth/invitations/password', [...$password, 'token' => $token])->assertOk();
    $this->assertAuthenticatedAs($invitee);

    // Setting a password accepts nothing: the seat stays closed until the person says yes.
    expect(seatStatus($organization, $invitee))->toBe('invited');
    $this->getJson("/api/orgs/{$organization->slug}/projects")->assertNotFound();
    $this->getJson('/api/auth/me')->assertJsonPath('data.invitations.0.organization.slug', $organization->slug);

    $this->postJson("/api/auth/invitations/{$seatId}/accept")->assertNoContent();
    expect(seatStatus($organization, $invitee))->toBe('active');
    $this->getJson("/api/orgs/{$organization->slug}/projects")->assertOk();
});

it('never adds an existing account without its consent', function () {
    Notification::fake();
    $organization = createOrganization();
    $admin = founderOf($organization);
    $existing = User::factory()->create(['email' => 'known@example.org']);
    $payload = ['name' => 'x', 'email' => 'known@example.org', 'role_id' => roleId($organization, SystemRole::HrOfficer)];

    // Same answer as for a newcomer, so the response does not reveal that the account exists.
    $seatId = $this->actingAs($admin)->postJson("/api/orgs/{$organization->slug}/members", $payload)
        ->assertCreated()->assertJsonPath('data.status', 'invited')->json('data.id');
    Notification::assertSentTo($existing, MemberInvited::class, fn (MemberInvited $n) => $n->token === null);

    $this->actingAs($admin)->postJson("/api/orgs/{$organization->slug}/members", $payload)
        ->assertUnprocessable()->assertJsonValidationErrors('email');

    // Nobody else can accept it for them.
    $this->actingAs($admin)->postJson("/api/auth/invitations/{$seatId}/accept")->assertNotFound();

    $this->actingAs($existing)->postJson("/api/auth/invitations/{$seatId}/decline")->assertNoContent();
    expect(seatStatus($organization, $existing))->toBeNull();
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

it('escapes names in the invitation e-mail', function () {
    $organization = createOrganization(name: '[Click here](https://evil.example)');
    $user = User::factory()->create(['name' => '**Boss**']);

    $mail = (new MemberInvited($organization, 'token'))->toMail($user);

    expect(implode(' ', [$mail->greeting, ...$mail->introLines]))
        ->not->toContain('](https://evil')
        ->not->toContain('**Boss**');
});
