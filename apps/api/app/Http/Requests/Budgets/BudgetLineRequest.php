<?php

namespace App\Http\Requests\Budgets;

use App\Domain\Access\Enums\Permission;
use App\Http\Requests\Concerns\LocalizesFieldNames;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class BudgetLineRequest extends FormRequest
{
    use LocalizesFieldNames;

    public function authorize(): bool
    {
        return Gate::allows(Permission::BudgetsManage->value);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:0', 'max:999999999999999'],
        ];
    }
}
