<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Organizations\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;

class CurrentUserController extends Controller
{
    public function show(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        $user->load(['memberships' => fn (HasMany $query) => $query
            ->where('status', MembershipStatus::Active)
            ->with(['organization', 'roles'])
            ->oldest(),
            'invitations' => fn (HasMany $query) => $query->where('status', MembershipStatus::Invited)->with('organization')->latest(),
        ]);

        return new UserResource($user);
    }
}
