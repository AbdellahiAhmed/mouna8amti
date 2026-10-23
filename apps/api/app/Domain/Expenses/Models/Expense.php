<?php

namespace App\Domain\Expenses\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Expenses\Enums\ExpenseStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $sequence Per-organisation running number.
 * @property int $project_id
 * @property string $description
 * @property string|null $payee
 * @property int $amount Minor units.
 * @property Carbon $spent_on
 * @property ExpenseStatus $status
 * @property string|null $attachment_path
 * @property string|null $attachment_name
 * @property int $submitted_by
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property int|null $approved_by
 * @property Carbon|null $approved_at
 * @property int|null $rejected_by
 * @property Carbon|null $rejected_at
 * @property string|null $rejection_reason
 * @property Carbon $created_at
 * @property-read Project $project
 */
class Expense extends Model
{
    use BelongsToOrganization, RecordsAudit;

    protected $fillable = [
        'sequence', 'project_id', 'description', 'payee', 'amount', 'spent_on', 'status',
        'attachment_path', 'attachment_name', 'submitted_by',
        'reviewed_by', 'reviewed_at', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason',
    ];

    /** Storage paths are internal; the audit trail and API never expose them. */
    protected $hidden = ['attachment_path'];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'amount' => 'integer',
            'spent_on' => 'date',
            'status' => ExpenseStatus::class,
            'submitted_by' => 'integer',
            'reviewed_by' => 'integer',
            'approved_by' => 'integer',
            'rejected_by' => 'integer',
            'reviewed_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function number(): string
    {
        return sprintf('EXP-%04d', $this->sequence);
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    /** @return HasMany<ExpenseAllocation, $this> */
    public function allocations(): HasMany
    {
        return $this->hasMany(ExpenseAllocation::class);
    }

    /** @return BelongsTo<Membership, $this> */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'submitted_by');
    }

    /** @return BelongsTo<Membership, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'reviewed_by');
    }

    /** @return BelongsTo<Membership, $this> */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'approved_by');
    }

    /** @return BelongsTo<Membership, $this> */
    public function rejecter(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'rejected_by');
    }
}
