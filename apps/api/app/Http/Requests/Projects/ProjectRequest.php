<?php

namespace App\Http\Requests\Projects;

use App\Domain\Access\Enums\Permission;
use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Projects\Enums\ProjectStatus;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\TenantContext;
use App\Http\Requests\Concerns\LocalizesFieldNames;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ProjectRequest extends FormRequest
{
    use LocalizesFieldNames;

    public function authorize(): bool
    {
        return Gate::allows(Permission::ProjectsManage->value);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $organizationId = app(TenantContext::class)->organizationId();
        $project = $this->route('project');

        return [
            'code' => [
                'required', 'string', 'max:32', 'regex:/^[A-Za-z0-9._-]+$/',
                Rule::unique('projects', 'code')
                    ->where('organization_id', $organizationId)
                    ->ignore($project instanceof Project ? $project->id : null),
            ],
            'name' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'location' => ['nullable', 'string', 'max:120'],
            // Scoped explicitly: RLS lets a user see their own memberships in *other* organisations.
            'manager_membership_id' => [
                'nullable', 'integer',
                Rule::exists('memberships', 'id')
                    ->where('organization_id', $organizationId)
                    ->where('status', MembershipStatus::Active->value),
            ],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'status' => ['required', Rule::enum(ProjectStatus::class)],
            'progress' => ['required', 'integer', 'between:0,100'],
        ];
    }
}
