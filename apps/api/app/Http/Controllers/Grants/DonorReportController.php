<?php

namespace App\Http\Controllers\Grants;

use App\Domain\Access\Enums\Permission;
use App\Domain\Grants\Models\DonorReport;
use App\Domain\Grants\Models\Grant;
use App\Http\Controllers\Controller;
use App\Http\Resources\DonorReportResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/** Reports owed to donors under their grant agreements. */
class DonorReportController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        $reports = DonorReport::query()
            ->with(['grant.donor', 'grant.project'])
            ->when($request->boolean('pending'), fn ($query) => $query->whereNull('submitted_on'))
            ->orderBy('due_on')
            ->get();

        return DonorReportResource::collection($reports);
    }

    public function store(Request $request, string $organization, Grant $grant): JsonResponse
    {
        Gate::authorize(Permission::GrantsManage->value);
        $report = $grant->reports()->create($this->validated($request));

        return (new DonorReportResource($report->load(['grant.donor', 'grant.project'])))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $organization, DonorReport $report): DonorReportResource
    {
        Gate::authorize(Permission::GrantsManage->value);
        $report->update($this->validated($request));

        return new DonorReportResource($report->load(['grant.donor', 'grant.project']));
    }

    public function destroy(string $organization, DonorReport $report): Response
    {
        Gate::authorize(Permission::GrantsManage->value);
        $report->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'due_on' => ['required', 'date'],
            'submitted_on' => ['nullable', 'date'],
        ], attributes: (array) trans('fields'));
    }
}
