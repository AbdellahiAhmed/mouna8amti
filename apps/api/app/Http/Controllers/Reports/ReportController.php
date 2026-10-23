<?php

namespace App\Http\Controllers\Reports;

use App\Domain\Access\Enums\Permission;
use App\Domain\Reports\FinanceSummary;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Http\Resources\ProjectResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

class ReportController extends Controller
{
    public function dashboard(FinanceSummary $summary): JsonResponse
    {
        Gate::authorize(Permission::ProjectsView->value);

        $data = $summary->dashboard(app(TenantContext::class)->membership());
        $data['projects'] = ProjectResource::collection($data['projects']);
        $data['recent_expenses'] = ExpenseResource::collection($data['recent_expenses']);

        return response()->json(['data' => $data]);
    }

    public function monthly(Request $request, FinanceSummary $summary): JsonResponse
    {
        Gate::authorize(Permission::ProjectsView->value);

        $month = $request->validate(['month' => ['nullable', 'date_format:Y-m']])['month'] ?? null;

        return response()->json([
            'data' => $summary->month(($month ? Carbon::createFromFormat('!Y-m', $month) : null) ?? now()),
        ]);
    }
}
