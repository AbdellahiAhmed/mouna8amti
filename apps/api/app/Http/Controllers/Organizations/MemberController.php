<?php

namespace App\Http\Controllers\Organizations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Organizations\Models\Membership;
use App\Http\Controllers\Controller;
use App\Http\Resources\MembershipResource;
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
}
