<?php

namespace App\Domain\Projects\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Projects\Enums\ProjectStatus;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $code
 * @property string $name
 * @property string|null $description
 * @property int|null $manager_membership_id
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property ProjectStatus $status
 * @property int $progress
 */
class Project extends Model
{
    use BelongsToOrganization, RecordsAudit, SoftDeletes;

    protected $fillable = ['code', 'name', 'description', 'manager_membership_id', 'starts_on', 'ends_on', 'status', 'progress'];

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
        ];
    }

    /** @return BelongsTo<Membership, $this> */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'manager_membership_id');
    }
}
