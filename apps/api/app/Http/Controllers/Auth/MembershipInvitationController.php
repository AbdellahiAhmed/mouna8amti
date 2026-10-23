<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** The invited person, and only them, accepts or declines a seat offered by an organisation. */
class MembershipInvitationController extends Controller
{
    public function accept(Request $request, TenantContext $tenant, int $membership): Response
    {
        $seat = $this->pendingSeat($request, $tenant, $membership);
        $seat->update(['status' => MembershipStatus::Active]);

        return response()->noContent();
    }

    public function decline(Request $request, TenantContext $tenant, int $membership): Response
    {
        $seat = $this->pendingSeat($request, $tenant, $membership);
        $seat->roles()->detach();
        $seat->delete();

        return response()->noContent();
    }

    /** RLS shows the user only their own seats; the tenant is then entered so the write passes the org check. */
    private function pendingSeat(Request $request, TenantContext $tenant, int $id): Membership
    {
        $seat = Membership::query()
            ->where('user_id', $request->user()?->getAuthIdentifier())
            ->where('status', MembershipStatus::Invited)
            ->findOrFail($id);

        $tenant->enter($seat->organization()->firstOrFail());

        return $seat;
    }
}
