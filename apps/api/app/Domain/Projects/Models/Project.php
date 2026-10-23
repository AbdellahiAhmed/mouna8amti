<?php

namespace App\Domain\Projects\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Budgets\Models\BudgetLine;
use App\Domain\Expenses\Enums\ExpenseStatus;
use App\Domain\Expenses\Models\Expense;
use App\Domain\Grants\Models\Grant;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Projects\Enums\ProjectStatus;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $code
 * @property string $name
 * @property string|null $description
 * @property string|null $location
 * @property int|null $budget Only when loaded with withFinancials().
 * @property int|null $spent Only when loaded with withFinancials().
 * @property int|null $manager_membership_id
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property ProjectStatus $status
 * @property int $progress
 */
class Project extends Model
{
    use BelongsToOrganization, RecordsAudit, SoftDeletes;

    protected $fillable = ['code', 'name', 'description', 'location', 'manager_membership_id', 'starts_on', 'ends_on', 'status', 'progress'];

    protected $attributes = [
        'status' => 'draft',
        'progress' => 0,
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'status' => ProjectStatus::class,
            'progress' => 'integer',
            'budget' => 'integer',
            'spent' => 'integer',
        ];
    }

    /** @return BelongsTo<Membership, $this> */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'manager_membership_id');
    }

    /** @return HasMany<Grant, $this> */
    public function grants(): HasMany
    {
        return $this->hasMany(Grant::class);
    }

    /** @return HasMany<BudgetLine, $this> */
    public function budgetLines(): HasMany
    {
        return $this->hasMany(BudgetLine::class)->orderBy('id');
    }

    /** @return HasMany<Expense, $this> */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Adds `budget` (sum of budget lines), `spent` (approved expenses) and the funding grants.
     *
     * @param  Builder<Project>  $query
     */
    public function scopeWithFinancials(Builder $query): void
    {
        $query
            ->withSum('budgetLines as budget', 'amount')
            ->withSum(['expenses as spent' => fn (Builder $q) => $q->where('status', ExpenseStatus::Approved)], 'amount')
            ->with(['grants' => fn ($q) => $q->with('donor')->withSum(['tranches as received' => fn (Builder $t) => $t->whereNotNull('received_on')], 'amount')]);
    }
}
