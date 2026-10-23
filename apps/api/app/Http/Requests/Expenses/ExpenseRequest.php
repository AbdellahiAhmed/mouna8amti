<?php

namespace App\Http\Requests\Expenses;

use App\Domain\Access\Enums\Permission;
use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Tenancy\TenantContext;
use App\Http\Requests\Concerns\LocalizesFieldNames;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * @phpstan-type ExpenseData array{project_id: int, description: string, payee?: string|null, amount: int, spent_on: string,
 *     allocations: list<array{budget_line_id: int, percent: int}>}
 */
class ExpenseRequest extends FormRequest
{
    use LocalizesFieldNames;

    public function authorize(): bool
    {
        return Gate::allows(Permission::ExpensesCreate->value);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $organizationId = app(TenantContext::class)->organizationId();

        return [
            'project_id' => ['required', 'integer', Rule::exists('projects', 'id')->where('organization_id', $organizationId)->whereNull('deleted_at')],
            'description' => ['required', 'string', 'max:500'],
            'payee' => ['nullable', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999999999'],
            'spent_on' => ['required', 'date', 'before_or_equal:today'],
            'allocations' => ['required', 'array', 'min:1', 'max:10'],
            'allocations.*.budget_line_id' => ['required', 'integer', 'distinct'],
            'allocations.*.percent' => ['required', 'integer', 'between:1,100'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var list<array{budget_line_id: int|string, percent: int|string}> $allocations */
            $allocations = $this->input('allocations');

            if (array_sum(array_column($allocations, 'percent')) !== 100) {
                $validator->errors()->add('allocations', __('The budget line shares must add up to 100%.'));
            }

            $lineIds = array_map('intval', array_column($allocations, 'budget_line_id'));
            $matching = BudgetLine::query()->whereIn('id', $lineIds)->where('project_id', $this->integer('project_id'))->count();

            if ($matching !== count($lineIds)) {
                $validator->errors()->add('allocations', __('Every budget line must belong to the selected project.'));
            }
        }];
    }

    /** @return ExpenseData */
    public function expenseData(): array
    {
        /** @var ExpenseData */
        return $this->safe()->except('attachment');
    }
}
