<?php

namespace App\Http\Controllers\Organizations;

use App\Domain\Organizations\Actions\CreateOrganization;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organizations\StoreOrganizationRequest;
use App\Http\Requests\Organizations\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class OrganizationController extends Controller
{
    public function store(StoreOrganizationRequest $request, CreateOrganization $createOrganization): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var array{name: string, legal_name?: string|null, country: string, currency: string, locale: string, fiscal_year_start_month: int} $attributes */
        $attributes = $request->validated();

        $organization = $createOrganization->handle($user, $attributes);

        return (new OrganizationResource($organization))->response()->setStatusCode(201);
    }

    public function show(TenantContext $tenant): OrganizationResource
    {
        return new OrganizationResource($tenant->organization());
    }

    public function update(UpdateOrganizationRequest $request, TenantContext $tenant): OrganizationResource
    {
        $organization = $tenant->organization() ?? throw new \LogicException('No tenant.');
        $organization->update($request->validated());

        return new OrganizationResource($organization);
    }
}
