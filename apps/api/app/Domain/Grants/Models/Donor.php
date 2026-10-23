<?php

namespace App\Domain\Grants\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Grants\Enums\DonorType;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property DonorType $type
 * @property string|null $country
 * @property string|null $contact_name
 * @property string|null $contact_email
 * @property int|null $promised Only when summed in DonorController.
 * @property int|null $received Only when summed in DonorController.
 */
class Donor extends Model
{
    use BelongsToOrganization, RecordsAudit, SoftDeletes;

    protected $fillable = ['name', 'type', 'country', 'contact_name', 'contact_email'];

    protected function casts(): array
    {
        return [
            'type' => DonorType::class,
            'promised' => 'integer',
            'received' => 'integer',
        ];
    }

    /** @return HasMany<Grant, $this> */
    public function grants(): HasMany
    {
        return $this->hasMany(Grant::class);
    }

    /** @return HasManyThrough<GrantTranche, Grant, $this> */
    public function tranches(): HasManyThrough
    {
        return $this->hasManyThrough(GrantTranche::class, Grant::class);
    }
}
