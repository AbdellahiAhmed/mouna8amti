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
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property string $category
 * @property string|null $tag Inventory code painted or stuck on the item.
 * @property int|null $project_id
 * @property string|null $location
 * @property string|null $holder
 * @property Carbon|null $acquired_on
 * @property int|null $value Minor units.
 * @property string $condition
 */
class Asset extends Model
{
    use BelongsToOrganization, RecordsAudit, SoftDeletes;

    public const CATEGORIES = ['vehicle', 'it', 'furniture', 'equipment', 'other'];

    public const CONDITIONS = ['good', 'fair', 'broken', 'disposed'];

    protected $fillable = ['name', 'category', 'tag', 'project_id', 'location', 'holder', 'acquired_on', 'value', 'condition'];

    protected function casts(): array
    {
        return [
            'acquired_on' => 'date',
            'value' => 'integer',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }
}
