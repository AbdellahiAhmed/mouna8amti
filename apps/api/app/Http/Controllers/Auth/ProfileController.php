<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function update(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();
        $user->update($request->validate([
            'name' => ['required', 'string', 'max:120'],
            'locale' => ['required', Rule::in(['ar', 'fr', 'en'])],
        ]));

        return new UserResource($user);
    }

    /** Needs the current password, and signs out the user's other sessions. */
    public function password(Request $request): Response
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()],
        ]);

        /** @var User $user */
        $user = $request->user();
        $user->forceFill(['password' => $validated['password']])->save();
        Auth::guard('web')->logoutOtherDevices($validated['password']);

        return response()->noContent();
    }
}
