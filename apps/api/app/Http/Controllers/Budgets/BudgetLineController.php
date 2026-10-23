<?php

namespace App\Http\Controllers\Budgets;

use App\Domain\Access\Enums\Permission;
use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Projects\Models\Project;
use App\Http\Controllers\Controller;
use App\Http\Requests\Budgets\BudgetLineRequest;
use App\Http\Resources\BudgetLineResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class BudgetLineController extends Controller
{
    public function index(string $organization, Project $project): AnonymousResourceCollection
    {
        Gate::authorize(Permission::ProjectsView->value);

        $lines = $project->budgetLines()->select('budget_lines.*')->withSpent()->get();

        return BudgetLineResource::collection($lines);
    }

    public function store(BudgetLineRequest $request, string $organization, Project $project): JsonResponse
    {
        $line = $project->budgetLines()->create($request->validated());

        return (new BudgetLineResource($line))->response()->setStatusCode(201);
    }

    public function update(BudgetLineRequest $request, string $organization, BudgetLine $budgetLine): BudgetLineResource
    {
        $budgetLine->update($request->validated());

        return new BudgetLineResource(BudgetLine::query()->select('budget_lines.*')->withSpent()->findOrFail($budgetLine->id));
    }

    public function destroy(string $organization, BudgetLine $budgetLine): Response
    {
        Gate::authorize(Permission::BudgetsManage->value);

        if ($budgetLine->allocations()->exists()) {
            throw new ConflictHttpException(__('This budget line already carries expenses and cannot be deleted.'));
        }

        $budgetLine->delete();

        return response()->noContent();
    }
}
