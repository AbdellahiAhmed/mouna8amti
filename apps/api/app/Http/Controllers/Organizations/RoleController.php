<?php

namespace App\Http\Controllers\Organizations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Access\Models\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class RoleController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize(Permission::MembersView->value);

        return RoleResource::collection(Role::query()->orderByDesc('is_system')->orderBy('id')->get());
    }
}
