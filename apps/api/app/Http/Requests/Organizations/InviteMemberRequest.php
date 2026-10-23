<?php

namespace App\Http\Requests\Organizations;

use App\Domain\Access\Enums\Permission;
use App\Domain\Tenancy\TenantContext;
use App\Http\Requests\Concerns\LocalizesFieldNames;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class InviteMemberRequest extends FormRequest
{
    use LocalizesFieldNames;

    public function authorize(): bool
    {
        return Gate::allows(Permission::MembersManage->value);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'title' => ['nullable', 'string', 'max:120'],
            'role_id' => ['required', 'integer', Rule::exists('roles', 'id')->where('organization_id', app(TenantContext::class)->organizationId())],
        ];
    }
}
