<?php

namespace App\Domain\Grants\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $grant_id
 * @property string $title
 * @property Carbon $due_on
 * @property Carbon|null $submitted_on
 * @property-read Grant $grant
 */
class DonorReport extends Model
{
    use BelongsToOrganization, RecordsAudit;

    protected $fillable = ['title', 'due_on', 'submitted_on'];

    protected function casts(): array
    {
        return [
            'due_on' => 'date',
            'submitted_on' => 'date',
        ];
    }

    /** @return BelongsTo<Grant, $this> */
    public function grant(): BelongsTo
    {
        return $this->belongsTo(Grant::class)->withTrashed();
    }
}
