<?php

use App\Models\User;

it('registers a user and signs them in', function () {
    spa()->postJson('/api/auth/register', [
        'name' => 'Fatima Mint Ahmed',
        'email' => 'fatima@example.org',
        'password' => 'correct-horse-42',
        'password_confirmation' => 'correct-horse-42',
        'locale' => 'fr',
    ])->assertCreated()->assertJsonPath('data.email', 'fatima@example.org');

    $this->assertAuthenticated();
    expect(User::query()->where('email', 'fatima@example.org')->value('locale'))->toBe('fr');
});

it('rejects weak passwords and duplicate emails', function () {
    User::factory()->create(['email' => 'taken@example.org']);

    spa()->postJson('/api/auth/register', [
        'name' => 'X',
        'email' => 'taken@example.org',
        'password' => 'short',
        'password_confirmation' => 'short',
    ])->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['email', 'password']);
});

it('logs in with valid credentials and records the login time', function () {
    $user = User::factory()->create(['password' => 'correct-horse-42']);

    spa()->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'correct-horse-42'])
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()?->last_login_at)->not->toBeNull();
});

it('refuses invalid credentials without saying which part was wrong', function () {
    $user = User::factory()->create(['password' => 'correct-horse-42']);

    spa()->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'wrong-password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    $this->assertGuest();
});

it('locks out after five failed attempts', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $_) {
        spa()->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'nope']);
    }

    spa()->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'nope'])
        ->assertStatus(429)
        ->assertJsonPath('code', 'too_many_attempts');
});

it('returns the current user with their active memberships', function () {
    $organization = createOrganization();
    $founder = founderOf($organization);

    $this->actingAs($founder)->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('data.memberships.0.organization.slug', $organization->slug)
        ->assertJsonPath('data.memberships.0.roles.0.key', 'admin');
});

it('answers 401 with the error contract when unauthenticated', function () {
    $this->getJson('/api/auth/me')
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'Unauthenticated.', 'code' => 'unauthenticated']);
});

it('logs out', function () {
    $user = User::factory()->create(['password' => 'correct-horse-42']);
    spa()->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'correct-horse-42']);

    spa()->postJson('/api/auth/logout')->assertNoContent();

    $this->assertGuest('web');
});
