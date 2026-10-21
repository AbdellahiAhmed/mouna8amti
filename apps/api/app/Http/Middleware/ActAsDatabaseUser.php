<?php

namespace App\Http\Middleware;

use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Lets RLS policies recognise the authenticated user's own cross-tenant rows (memberships, roles). */
final class ActAsDatabaseUser
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User) {
            $this->tenant->actAs($user);
        }

        return $next($request);
    }
}
