<?php

namespace App\Http\Controllers\Organizations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Organizations\Actions\InviteMember;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\InviteMemberRequest;
use App\Http\Resources\MembershipResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MemberController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize(Permission::MembersView->value);

        $members = Membership::query()
            ->with(['user', 'roles'])
            ->oldest()
            ->paginate(50);

        return MembershipResource::collection($members);
    }

    public function store(InviteMemberRequest $request, InviteMember $invite, TenantContext $tenant): JsonResponse
    {
        $organization = $tenant->organization() ?? throw new \LogicException('No tenant.');
        /** @var array{name: string, email: string, role_id: int, title?: string|null} $data */
        $data = $request->validated();
        $membership = $invite->handle($organization, $data);

        return (new MembershipResource($membership->load(['user', 'roles'])))->response()->setStatusCode(201);
    }
}
