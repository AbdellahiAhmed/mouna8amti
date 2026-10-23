<?php

namespace App\Http\Controllers\Projects;

use App\Domain\Access\Enums\Permission;
use App\Domain\Projects\Models\Project;
use App\Domain\Projects\Models\ProjectActivity;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ActivityController extends Controller
{
    public function index(string $organization, Project $project): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        return ActivityResource::collection($project->activities()->get());
    }

    public function store(Request $request, string $organization, Project $project): JsonResponse
    {
        Gate::authorize(Permission::ProjectsManage->value);
        $activity = $project->activities()->create($this->validated($request));

        return (new ActivityResource($activity))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $organization, ProjectActivity $activity): ActivityResource
    {
        Gate::authorize(Permission::ProjectsManage->value);
        $activity->update($this->validated($request));

        return new ActivityResource($activity);
    }

    public function destroy(string $organization, ProjectActivity $activity): Response
    {
        Gate::authorize(Permission::ProjectsManage->value);
        $activity->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'due_on' => ['nullable', 'date'],
            'done_on' => ['nullable', 'date'],
        ], attributes: (array) trans('fields'));
    }
}
