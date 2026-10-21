<?php

namespace App\Domain\Organizations\Models;

use App\Domain\Access\Models\Role;
use App\Domain\Audit\RecordsAudit;
use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $legal_name
 * @property string $country
 * @property string $currency
 * @property string $locale
 * @property int $fiscal_year_start_month
 * @property string|null $logo_path
 * @property array<string, mixed> $settings
 */
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use HasFactory, RecordsAudit;

    protected $fillable = [
        'name', 'slug', 'legal_name', 'country', 'currency', 'locale', 'fiscal_year_start_month', 'logo_path',
    ];

    protected $attributes = [
        'settings' => '{}',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'fiscal_year_start_month' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return HasMany<Membership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /** @return HasMany<Role, $this> */
    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    protected static function newFactory(): OrganizationFactory
    {
        return OrganizationFactory::new();
    }
}
