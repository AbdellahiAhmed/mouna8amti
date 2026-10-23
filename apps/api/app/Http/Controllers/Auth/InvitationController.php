<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/** A newcomer opens the e-mailed link, chooses a password, and their invited seats become active. */
class InvitationController extends Controller
{
    public function store(Request $request, TenantContext $tenant): UserResource
    {
        $credentials = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(10)->letters()->numbers()],
        ]);

        $accepted = null;
        $status = Password::broker('invitations')->reset($credentials, function (User $user, string $password) use (&$accepted): void {
            $user->forceFill(['password' => $password])->save();
            $accepted = $user;
        });

        if ($accepted === null) {
            throw ValidationException::withMessages(['token' => $status === Password::RESET_THROTTLED
                ? __($status)
                : __('This invitation link is invalid or has expired.')]);
        }

        Auth::guard('web')->login($accepted);
        $request->session()->regenerate();

        // RLS writes need each seat's organisation as the tenant, so activate them one by one.
        $tenant->actAs($accepted);
        foreach (Membership::query()->where('user_id', $accepted->id)->where('status', MembershipStatus::Invited)->get() as $seat) {
            $tenant->enter($seat->organization()->firstOrFail());
            $seat->update(['status' => MembershipStatus::Active]);
        }
        $tenant->forget();

        return new UserResource($accepted);
    }
}
