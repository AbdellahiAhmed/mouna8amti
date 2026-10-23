<?php

namespace App\Domain\Budgets\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Expenses\Enums\ExpenseStatus;
use App\Domain\Expenses\Models\ExpenseAllocation;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $project_id
 * @property string $name
 * @property int $amount Planned, minor units.
 * @property int|null $spent Only when selected with withSpent().
 */
class BudgetLine extends Model
{
    use BelongsToOrganization, RecordsAudit;

    protected $fillable = ['project_id', 'name', 'amount'];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'spent' => 'integer',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return HasMany<ExpenseAllocation, $this> */
    public function allocations(): HasMany
    {
        return $this->hasMany(ExpenseAllocation::class);
    }

    /**
     * Adds `spent`: this line's share of approved expenses.
     *
     * @param  Builder<BudgetLine>  $query
     */
    public function scopeWithSpent(Builder $query): void
    {
        // ponytail: integer division per allocation can lose a minor unit on odd splits; fine for reporting.
        $query->addSelect(['spent' => ExpenseAllocation::query()
            ->selectRaw('COALESCE(SUM(expenses.amount * expense_allocations.percent / 100), 0)')
            ->join('expenses', 'expenses.id', '=', 'expense_allocations.expense_id')
            ->whereColumn('expense_allocations.budget_line_id', 'budget_lines.id')
            ->where('expenses.status', ExpenseStatus::Approved->value),
        ]);
    }
}
