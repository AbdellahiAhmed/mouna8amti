<?php

namespace App\Domain\Tenancy;

use App\Domain\Organizations\Models\Organization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Application-level half of tenant isolation (RLS is the database-level half):
 * scopes reads to the current organisation and stamps it on new rows.
 *
 * @mixin Model
 */
trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope('organization', function (Builder $query): void {
            $organizationId = app(TenantContext::class)->organizationId();

            if ($organizationId !== null) {
                $query->where($query->qualifyColumn('organization_id'), $organizationId);
            }
        });

        static::creating(function (Model $model): void {
            if ($model->getAttribute('organization_id') === null) {
                $model->setAttribute('organization_id', app(TenantContext::class)->organizationId());
            }
        });
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
