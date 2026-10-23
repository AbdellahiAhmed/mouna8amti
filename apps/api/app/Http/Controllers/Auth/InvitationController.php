<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/** A newcomer opens the e-mailed link and chooses a password; each seat is then accepted on its own. */
class InvitationController extends Controller
{
    public function store(Request $request): UserResource
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

        return new UserResource($accepted);
    }
}
