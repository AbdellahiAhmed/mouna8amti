<?php

namespace App\Http\Controllers\Projects;

use App\Domain\Access\Enums\Permission;
use App\Domain\Projects\Enums\ProjectStatus;
use App\Domain\Projects\Models\Project;
use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\ProjectRequest;
use App\Http\Resources\ProjectResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ProjectController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        $status = ProjectStatus::tryFrom($request->string('status')->value());
        $search = $request->string('search')->trim()->value();

        $projects = Project::query()
            ->with('manager.user')
            ->when($status, fn ($query, ProjectStatus $status) => $query->where('status', $status))
            ->when($search, fn ($query, string $search) => $query->where(
                fn ($q) => $q->whereLike('name', "%{$search}%")->orWhereLike('code', "%{$search}%"),
            ))
            ->orderByDesc('starts_on')
            ->orderBy('id')
            ->paginate(25);

        return ProjectResource::collection($projects);
    }

    public function store(ProjectRequest $request): JsonResponse
    {
        $project = Project::query()->create($request->validated());

        return (new ProjectResource($project->load('manager.user')))->response()->setStatusCode(201);
    }

    public function show(string $organization, Project $project): ProjectResource
    {
        Gate::authorize(Permission::ProjectsView->value);

        return new ProjectResource($project->load('manager.user'));
    }

    public function update(ProjectRequest $request, string $organization, Project $project): ProjectResource
    {
        $project->update($request->validated());

        return new ProjectResource($project->load('manager.user'));
    }

    public function destroy(string $organization, Project $project): Response
    {
        Gate::authorize(Permission::ProjectsManage->value);
        $project->delete();

        return response()->noContent();
    }
}
