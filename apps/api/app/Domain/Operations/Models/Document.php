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
 * Archive entry: a contract, report or letter, with its scan.
 *
 * @property int $id
 * @property int $organization_id
 * @property string $title
 * @property string $category
 * @property string $direction
 * @property string|null $reference
 * @property Carbon $dated_on
 * @property int|null $project_id
 * @property string|null $file_path
 * @property string|null $file_name
 */
class Document extends Model
{
    use BelongsToOrganization, RecordsAudit, SoftDeletes;

    public const CATEGORIES = ['contract', 'report', 'letter', 'invoice', 'other'];

    public const DIRECTIONS = ['incoming', 'outgoing', 'internal'];

    protected $fillable = ['title', 'category', 'direction', 'reference', 'dated_on', 'project_id', 'file_path', 'file_name'];

    protected $hidden = ['file_path'];

    protected function casts(): array
    {
        return [
            'dated_on' => 'date',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }
}
