<?php

namespace App\Http\Requests\Grants;

use App\Domain\Access\Enums\Permission;
use App\Domain\Grants\Models\Grant;
use App\Domain\Tenancy\TenantContext;
use App\Http\Requests\Concerns\LocalizesFieldNames;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class GrantRequest extends FormRequest
{
    use LocalizesFieldNames;

    public function authorize(): bool
    {
        return Gate::allows(Permission::GrantsManage->value);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $organizationId = app(TenantContext::class)->organizationId();
        $grant = $this->route('grant');

        return [
            'donor_id' => ['required', 'integer', Rule::exists('donors', 'id')->where('organization_id', $organizationId)->whereNull('deleted_at')],
            'project_id' => ['required', 'integer', Rule::exists('projects', 'id')->where('organization_id', $organizationId)->whereNull('deleted_at')],
            'reference' => ['nullable', 'string', 'max:64'],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999999999'],
            'signed_on' => ['nullable', 'date'],
            'tranches' => ['present', 'array', 'max:24'],
            // Existing tranche ids must belong to this grant, so a payload cannot move another grant's tranche.
            'tranches.*.id' => ['nullable', 'integer', Rule::exists('grant_tranches', 'id')->where('grant_id', $grant instanceof Grant ? $grant->id : 0)],
            'tranches.*.amount' => ['required', 'integer', 'min:1'],
            'tranches.*.expected_on' => ['required', 'date'],
            'tranches.*.received_on' => ['nullable', 'date'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $scheduled = array_sum(array_column($this->input('tranches', []), 'amount'));

            if ($scheduled > (int) $this->input('amount')) {
                $validator->errors()->add('tranches', __('The tranches add up to more than the grant amount.'));
            }
        }];
    }
}
