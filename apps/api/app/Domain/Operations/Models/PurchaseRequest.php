<?php

namespace App\Domain\Operations\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * requested → approved (by someone else) → ordered → received; cancellable until received.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $sequence
 * @property int $project_id
 * @property string $title
 * @property string|null $details
 * @property string|null $supplier
 * @property int $estimated_amount Minor units.
 * @property Carbon|null $needed_by
 * @property string $status
 * @property int $requested_by
 * @property int|null $approved_by
 * @property Carbon|null $approved_at
 * @property-read Project $project
 */
class PurchaseRequest extends Model
{
    use BelongsToOrganization, RecordsAudit;

    public const STATUSES = ['requested', 'approved', 'ordered', 'received', 'cancelled'];

    /** Allowed next statuses. */
    public const FLOW = [
        'requested' => ['approved', 'cancelled'],
        'approved' => ['ordered', 'cancelled'],
        'ordered' => ['received', 'cancelled'],
        'received' => [],
        'cancelled' => [],
    ];

    protected $fillable = ['sequence', 'project_id', 'title', 'details', 'supplier', 'estimated_amount', 'needed_by', 'status', 'requested_by', 'approved_by', 'approved_at'];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'estimated_amount' => 'integer',
            'needed_by' => 'date',
            'requested_by' => 'integer',
            'approved_by' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    public function number(): string
    {
        return sprintf('PR-%04d', $this->sequence);
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    /** @return BelongsTo<Membership, $this> */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'requested_by');
    }

    /** @return BelongsTo<Membership, $this> */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'approved_by');
    }
}
