<?php

namespace App\Http\Controllers\Operations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Operations\Models\Asset;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\AssetResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AssetController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        $assets = Asset::query()
            ->with('project')
            ->when(in_array($request->string('category')->value(), Asset::CATEGORIES, true), fn ($q) => $q->where('category', $request->string('category')->value()))
            ->orderBy('name')
            ->paginate(100);

        return AssetResource::collection($assets);
    }

    public function store(Request $request, TenantContext $tenant): JsonResponse
    {
        Gate::authorize(Permission::AssetsManage->value);
        $asset = Asset::query()->create($this->validated($request, $tenant));

        return (new AssetResource($asset->load('project')))->response()->setStatusCode(201);
    }

    public function update(Request $request, TenantContext $tenant, string $organization, Asset $asset): AssetResource
    {
        Gate::authorize(Permission::AssetsManage->value);
        $asset->update($this->validated($request, $tenant, $asset));

        return new AssetResource($asset->load('project'));
    }

    public function destroy(string $organization, Asset $asset): Response
    {
        Gate::authorize(Permission::AssetsManage->value);
        $asset->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, TenantContext $tenant, ?Asset $asset = null): array
    {
        $organizationId = $tenant->organizationId();

        return $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'category' => ['required', Rule::in(Asset::CATEGORIES)],
            'tag' => ['nullable', 'string', 'max:40', Rule::unique('assets', 'tag')->where('organization_id', $organizationId)->ignore($asset?->id)],
            'project_id' => ['nullable', 'integer', Rule::exists('projects', 'id')->where('organization_id', $organizationId)->whereNull('deleted_at')],
            'location' => ['nullable', 'string', 'max:120'],
            'holder' => ['nullable', 'string', 'max:160'],
            'acquired_on' => ['nullable', 'date'],
            'value' => ['nullable', 'integer', 'min:0', 'max:999999999999999'],
            'condition' => ['required', Rule::in(Asset::CONDITIONS)],
        ], attributes: (array) trans('fields'));
    }
}
