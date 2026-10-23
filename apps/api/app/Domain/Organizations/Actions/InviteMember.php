<?php

namespace App\Domain\Organizations\Actions;

use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Models\User;
use App\Notifications\MemberInvited;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Offers a person a seat in the current organisation. The seat stays "invited"
 * (no access) until the person accepts it themselves after signing in; a
 * newcomer first sets a password from the e-mailed link.
 */
final class InviteMember
{
    /** @param  array{name: string, email: string, role_id: int, title?: string|null}  $data */
    public function handle(Organization $organization, array $data): Membership
    {
        $email = Str::lower($data['email']);

        [$membership, $user, $token] = DB::transaction(function () use ($organization, $data, $email): array {
            $user = User::query()->where('email', $email)->first();
            $isNew = $user === null;

            $user ??= User::query()->create([
                'name' => $data['name'],
                'email' => $email,
                'password' => Str::password(40), // Unusable until the invitation sets a real one.
                'locale' => $organization->locale,
            ]);

            if (Membership::query()->where('user_id', $user->id)->exists()) {
                throw ValidationException::withMessages(['email' => __('This person is already a member of the organisation.')]);
            }

            $membership = Membership::query()->create([
                'user_id' => $user->id,
                'status' => MembershipStatus::Invited,
                'title' => $data['title'] ?? null,
            ]);
            $membership->assignRoles([$data['role_id']]);

            return [$membership, $user, $isNew ? Password::broker('invitations')->createToken($user) : null];
        });

        $user->notify(new MemberInvited($organization, $token));

        return $membership;
    }
}
