<?php

namespace App\Domain\Operations\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A staff member or volunteer. Not every employee uses the platform, so this is
 * separate from memberships.
 *
 * @property int $id
 * @property int $organization_id
 * @property string $full_name
 * @property string $position
 * @property int|null $project_id
 * @property string $contract_type
 * @property Carbon $starts_on
 * @property Carbon|null $ends_on
 * @property int|null $monthly_salary Minor units; HR only.
 * @property string|null $phone
 * @property string|null $email
 */
class Employee extends Model
{
    use BelongsToOrganization, RecordsAudit, SoftDeletes;

    public const CONTRACTS = ['permanent', 'fixed_term', 'consultant', 'volunteer'];

    protected $fillable = ['full_name', 'position', 'project_id', 'contract_type', 'starts_on', 'ends_on', 'monthly_salary', 'phone', 'email'];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'monthly_salary' => 'integer',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }
}
