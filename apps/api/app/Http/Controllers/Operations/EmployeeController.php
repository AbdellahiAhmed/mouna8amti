<?php

namespace App\Http\Controllers\Operations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Operations\Models\Employee;
use App\Domain\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/** The staff list is visible to the team; salaries only to HR (see EmployeeResource). */
class EmployeeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize(Permission::MembersView->value);

        return EmployeeResource::collection(Employee::query()->with('project')->orderBy('full_name')->paginate(100));
    }

    public function store(Request $request, TenantContext $tenant): JsonResponse
    {
        Gate::authorize(Permission::HrManage->value);
        $employee = Employee::query()->create($this->validated($request, $tenant));

        return (new EmployeeResource($employee->load('project')))->response()->setStatusCode(201);
    }

    public function update(Request $request, TenantContext $tenant, string $organization, Employee $employee): EmployeeResource
    {
        Gate::authorize(Permission::HrManage->value);
        $employee->update($this->validated($request, $tenant));

        return new EmployeeResource($employee->load('project'));
    }

    public function destroy(string $organization, Employee $employee): Response
    {
        Gate::authorize(Permission::HrManage->value);
        $employee->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, TenantContext $tenant): array
    {
        return $request->validate([
            'full_name' => ['required', 'string', 'max:160'],
            'position' => ['required', 'string', 'max:160'],
            'project_id' => ['nullable', 'integer', Rule::exists('projects', 'id')->where('organization_id', $tenant->organizationId())->whereNull('deleted_at')],
            'contract_type' => ['required', Rule::in(Employee::CONTRACTS)],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'monthly_salary' => ['nullable', 'integer', 'min:0', 'max:999999999999'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
        ], attributes: (array) trans('fields'));
    }
}
