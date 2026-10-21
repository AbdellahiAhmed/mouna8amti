<?php

namespace App\Http\Controllers\Organizations;

use App\Domain\Access\Models\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RoleController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return RoleResource::collection(Role::query()->orderByDesc('is_system')->orderBy('id')->get());
    }
}
