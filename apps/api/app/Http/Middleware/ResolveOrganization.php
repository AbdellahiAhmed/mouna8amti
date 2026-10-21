<?php

namespace App\Http\Middleware;

use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Enters the tenant named by the {organization} route segment. Anyone who is
 * not an active member gets a 404, never a 403, so the existence of other
 * organisations is not revealed.
 */
final class ResolveOrganization
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function handle(Request $request, Closure $next): Response
    {
        /** @var User $user */
        $user = $request->user();
        $this->tenant->actAs($user);
        $parameter = $request->route('organization');

        $organization = $parameter instanceof Organization
            ? $parameter
            : Organization::query()->where('slug', (string) $parameter)->first();

        $membership = $organization === null ? null : Membership::query()
            ->withoutGlobalScope('organization')
            ->where('organization_id', $organization->getKey())
            ->where('user_id', $user->getKey())
            ->where('status', MembershipStatus::Active)
            ->with('roles')
            ->first();

        if ($organization === null || $membership === null) {
            throw new NotFoundHttpException;
        }

        $this->tenant->enter($organization, $membership);

        return $next($request);
    }
}
