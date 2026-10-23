<?php

namespace App\Http\Controllers\Grants;

use App\Domain\Access\Enums\Permission;
use App\Domain\Grants\Models\Grant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Grants\GrantRequest;
use App\Http\Resources\GrantResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class GrantController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        // ponytail: unpaginated — an organisation holds dozens of grants, not thousands.
        $grants = Grant::query()
            ->with(['donor', 'project', 'tranches'])
            ->when($request->integer('project_id'), fn ($query, int $id) => $query->where('project_id', $id))
            ->when($request->integer('donor_id'), fn ($query, int $id) => $query->where('donor_id', $id))
            ->orderByDesc('signed_on')
            ->orderBy('id')
            ->get();

        return GrantResource::collection($grants);
    }

    public function store(GrantRequest $request): JsonResponse
    {
        $grant = DB::transaction(function () use ($request): Grant {
            $grant = Grant::query()->create($request->safe()->except('tranches'));
            $grant->syncTranches($request->validated('tranches'));

            return $grant;
        });

        return (new GrantResource($grant->load(['donor', 'project', 'tranches'])))->response()->setStatusCode(201);
    }

    public function update(GrantRequest $request, string $organization, Grant $grant): GrantResource
    {
        DB::transaction(function () use ($request, $grant): void {
            $grant->update($request->safe()->except('tranches'));
            $grant->syncTranches($request->validated('tranches'));
        });

        return new GrantResource($grant->load(['donor', 'project', 'tranches']));
    }

    public function destroy(string $organization, Grant $grant): Response
    {
        Gate::authorize(Permission::GrantsManage->value);
        $grant->delete();

        return response()->noContent();
    }
}
