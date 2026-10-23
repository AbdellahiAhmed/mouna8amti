<?php

namespace App\Http\Requests\Organizations;

use App\Domain\Access\Enums\Permission;
use App\Http\Requests\Concerns\LocalizesFieldNames;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/** Country and currency are fixed at creation: every amount on record is in that currency. */
class UpdateOrganizationRequest extends FormRequest
{
    use LocalizesFieldNames;

    public function authorize(): bool
    {
        return Gate::allows(Permission::OrganizationManage->value);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:200'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'locale' => ['required', Rule::in(['ar', 'fr', 'en'])],
            'fiscal_year_start_month' => ['required', 'integer', 'between:1,12'],
        ];
    }
}
