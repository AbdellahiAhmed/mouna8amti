<?php

namespace App\Domain\Projects\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $project_id
 * @property string $title
 * @property Carbon|null $due_on
 * @property Carbon|null $done_on
 */
class ProjectActivity extends Model
{
    use BelongsToOrganization, RecordsAudit;

    protected $fillable = ['title', 'due_on', 'done_on'];

    protected function casts(): array
    {
        return [
            'due_on' => 'date',
            'done_on' => 'date',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
