<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class RegistrationController extends Controller
{
    public function store(RegisterRequest $request): JsonResponse
    {
        $user = User::query()->create([
            ...$request->safe()->only(['name', 'email', 'password']),
            'locale' => $request->validated('locale', 'ar'),
        ]);

        event(new Registered($user));
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return (new UserResource($user))->response()->setStatusCode(201);
    }
}
