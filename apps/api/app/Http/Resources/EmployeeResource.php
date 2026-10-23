<?php

namespace App\Http\Resources;

use App\Domain\Access\Enums\Permission;
use App\Domain\Operations\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

/** @mixin Employee */
class EmployeeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'position' => $this->position,
            'contract_type' => $this->contract_type,
            'starts_on' => $this->starts_on->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            // Pay is confidential: only HR sees it.
            'monthly_salary' => $this->when(Gate::allows(Permission::HrManage->value), $this->monthly_salary),
            'phone' => $this->phone,
            'email' => $this->email,
            'project' => $this->whenLoaded('project', fn () => $this->project === null ? null : ['id' => $this->project->id, 'name' => $this->project->name]),
        ];
    }
}
