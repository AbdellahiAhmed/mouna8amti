<?php

namespace App\Domain\Audit;

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes an append-only audit entry for every create, update and delete.
 * Only changed attributes are stored, and hidden attributes never are.
 *
 * @mixin Model
 */
trait RecordsAudit
{
    public static function bootRecordsAudit(): void
    {
        static::created(fn (Model $model) => self::writeAudit($model, 'created', null, self::auditable($model, $model->getAttributes())));

        static::updated(function (Model $model): void {
            $changed = array_keys($model->getChanges());
            $changed = array_diff($changed, [$model->getUpdatedAtColumn()]);

            if ($changed === []) {
                return;
            }

            self::writeAudit(
                $model,
                'updated',
                self::auditable($model, array_intersect_key($model->getOriginal(), array_flip($changed))),
                self::auditable($model, array_intersect_key($model->getAttributes(), array_flip($changed))),
            );
        });

        static::deleted(fn (Model $model) => self::writeAudit($model, 'deleted', self::auditable($model, $model->getOriginal()), null));
    }

    /** For rows saved quietly before a tenant context existed (see CreateOrganization). */
    public function recordCreationAudit(): void
    {
        self::writeAudit($this, 'created', null, self::auditable($this, $this->getAttributes()));
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private static function auditable(Model $model, array $attributes): array
    {
        return array_diff_key($attributes, array_flip([...$model->getHidden(), 'created_at', 'updated_at']));
    }

    /**
     * @param  array<string, mixed>|null  $old
     * @param  array<string, mixed>|null  $new
     */
    private static function writeAudit(Model $model, string $event, ?array $old, ?array $new): void
    {
        $organizationId = $model instanceof Organization
            ? $model->getKey()
            : ($model->getAttribute('organization_id') ?? app(TenantContext::class)->organizationId());

        $request = request();

        AuditLog::query()->create([
            'organization_id' => $organizationId,
            'actor_id' => auth()->id(),
            'event' => $event,
            'auditable_type' => $model->getMorphClass(),
            'auditable_id' => $model->getKey(),
            'old_values' => $old,
            'new_values' => $new,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
