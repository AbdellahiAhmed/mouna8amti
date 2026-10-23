<?php

namespace App\Domain\Grants\Models;

use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One scheduled payment of a grant; received once `received_on` is set.
 * Changes are audited through the parent grant's update.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $grant_id
 * @property int $amount Minor units.
 * @property Carbon $expected_on
 * @property Carbon|null $received_on
 * @property-read Grant $grant
 */
class GrantTranche extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['amount', 'expected_on', 'received_on'];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'expected_on' => 'date',
            'received_on' => 'date',
        ];
    }

    /** @return BelongsTo<Grant, $this> */
    public function grant(): BelongsTo
    {
        return $this->belongsTo(Grant::class)->withTrashed();
    }
}
