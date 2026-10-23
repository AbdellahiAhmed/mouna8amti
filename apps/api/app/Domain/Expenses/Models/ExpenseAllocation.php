<?php

namespace App\Domain\Expenses\Models;

use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The share (in %) of an expense charged to one budget line; an expense's shares sum to 100.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $expense_id
 * @property int $budget_line_id
 * @property int $percent
 * @property-read BudgetLine $budgetLine
 */
class ExpenseAllocation extends Model
{
    use BelongsToOrganization;

    public $timestamps = false;

    protected $fillable = ['budget_line_id', 'percent'];

    protected function casts(): array
    {
        return [
            'percent' => 'integer',
        ];
    }

    /** @return BelongsTo<Expense, $this> */
    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    /** @return BelongsTo<BudgetLine, $this> */
    public function budgetLine(): BelongsTo
    {
        return $this->belongsTo(BudgetLine::class);
    }
}
