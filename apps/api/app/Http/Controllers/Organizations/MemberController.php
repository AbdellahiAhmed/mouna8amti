<?php

namespace App\Http\Controllers\Organizations;

use App\Domain\Organizations\Models\Membership;
use App\Http\Controllers\Controller;
use App\Http\Resources\MembershipResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MemberController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $members = Membership::query()
            ->with(['user', 'roles'])
            ->oldest()
            ->paginate(50);

        return MembershipResource::collection($members);
    }
}
