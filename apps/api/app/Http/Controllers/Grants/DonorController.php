<?php

namespace App\Http\Controllers\Grants;

use App\Domain\Access\Enums\Permission;
use App\Domain\Grants\Models\Donor;
use App\Http\Controllers\Controller;
use App\Http\Requests\Grants\DonorRequest;
use App\Http\Resources\DonorResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DonorController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        $donors = Donor::query()
            ->withSum('grants as promised', 'amount')
            ->withSum(['tranches as received' => fn ($query) => $query->whereNotNull('grant_tranches.received_on')], 'grant_tranches.amount')
            ->with(['grants' => fn ($query) => $query->with(['project', 'tranches'])])
            ->when($request->string('search')->trim()->value(), fn ($query, string $search) => $query->whereLike('name', "%{$search}%"))
            ->orderBy('name')
            ->paginate(50);

        return DonorResource::collection($donors);
    }

    public function store(DonorRequest $request): JsonResponse
    {
        $donor = Donor::query()->create($request->validated());

        return (new DonorResource($donor))->response()->setStatusCode(201);
    }

    public function update(DonorRequest $request, string $organization, Donor $donor): DonorResource
    {
        $donor->update($request->validated());

        return new DonorResource($donor);
    }

    public function destroy(string $organization, Donor $donor): Response
    {
        Gate::authorize(Permission::DonorsManage->value);
        $donor->delete();

        return response()->noContent();
    }
}
