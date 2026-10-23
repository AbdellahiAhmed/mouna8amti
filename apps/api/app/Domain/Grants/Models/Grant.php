<?php

namespace App\Domain\Grants\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Projects\Models\Project;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A donor's commitment to fund one project, paid in tranches.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $donor_id
 * @property int $project_id
 * @property string|null $reference
 * @property int $amount Minor units.
 * @property Carbon|null $signed_on
 * @property-read Donor $donor
 * @property-read Project $project
 */
class Grant extends Model
{
    use BelongsToOrganization, RecordsAudit, SoftDeletes;

    protected $fillable = ['donor_id', 'project_id', 'reference', 'amount', 'signed_on'];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'signed_on' => 'date',
        ];
    }

    /** @return BelongsTo<Donor, $this> */
    public function donor(): BelongsTo
    {
        return $this->belongsTo(Donor::class)->withTrashed();
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    /** @return HasMany<GrantTranche, $this> */
    public function tranches(): HasMany
    {
        return $this->hasMany(GrantTranche::class)->orderBy('expected_on')->orderBy('id');
    }

    /**
     * Replaces the tranche schedule: rows with a known id are updated, new rows
     * created, and rows missing from the list removed.
     *
     * @param  list<array{id?: int|null, amount: int, expected_on: string, received_on?: string|null}>  $tranches
     */
    public function syncTranches(array $tranches): void
    {
        $keep = array_filter(array_map(fn (array $t) => $t['id'] ?? null, $tranches));
        $this->tranches()->whereNotIn('id', $keep)->delete();

        foreach ($tranches as $tranche) {
            $attributes = ['amount' => $tranche['amount'], 'expected_on' => $tranche['expected_on'], 'received_on' => $tranche['received_on'] ?? null];

            isset($tranche['id'])
                ? $this->tranches()->whereKey($tranche['id'])->firstOrFail()->update($attributes)
                : $this->tranches()->create($attributes);
        }

        $this->unsetRelation('tranches');
    }
}
