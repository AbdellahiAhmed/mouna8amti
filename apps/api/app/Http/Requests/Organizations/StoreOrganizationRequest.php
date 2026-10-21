<?php

namespace App\Http\Requests\Organizations;

use App\Http\Requests\Concerns\LocalizesFieldNames;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrganizationRequest extends FormRequest
{
    use LocalizesFieldNames;

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'country' => ['required', 'string', 'size:2', 'alpha'],
            'currency' => ['required', 'string', 'size:3', 'alpha'],
            'locale' => ['required', Rule::in(['ar', 'fr', 'en'])],
            'fiscal_year_start_month' => ['required', 'integer', 'between:1,12'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'country' => strtoupper((string) $this->input('country')),
            'currency' => strtoupper((string) $this->input('currency')),
        ]);
    }
}
