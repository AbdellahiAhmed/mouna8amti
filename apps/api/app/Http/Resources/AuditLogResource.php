<?php

namespace App\Http\Resources;

use App\Domain\Access\Models\Role;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\Organizations\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Turns a raw audit row into something a director can read: who did what to
 * which named thing, and the business fields that changed (never ids or keys).
 *
 * @mixin AuditLog
 */
class AuditLogResource extends JsonResource
{
    /** Bookkeeping columns that mean nothing to a reader. */
    private const HIDDEN_FIELDS = [
        'id', 'organization_id', 'user_id', 'created_at', 'updated_at', 'deleted_at',
        'password', 'remember_token', 'settings', 'slug', 'key', 'is_system',
    ];

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event' => $this->event,
            'subject' => [
                'type' => $this->auditable_type,
                'id' => $this->auditable_id,
                'label' => $this->subjectLabel(),
            ],
            'actor' => $this->actor === null ? null : ['id' => $this->actor->id, 'name' => $this->actor->name],
            'changes' => $this->event === 'updated' ? $this->changes() : [],
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }

    private function subjectLabel(): ?string
    {
        $subject = $this->auditable;

        return match (true) {
            $subject instanceof Membership => $subject->user?->name,
            $subject instanceof Role => $this->localized($subject->name),
            $subject !== null => $this->stringOrNull($subject->getAttribute('name')),
            // Hard- or soft-deleted subjects: fall back to the name captured in the trail.
            default => $this->localized($this->old_values['name'] ?? $this->new_values['name'] ?? null),
        };
    }

    /** @return list<array{field: string, old: mixed, new: mixed}> */
    private function changes(): array
    {
        $changes = [];

        foreach ($this->new_values ?? [] as $field => $new) {
            if ($field === 'manager_membership_id') {
                $changes[] = ['field' => 'manager', 'old' => $this->memberName($this->old_values[$field] ?? null), 'new' => $this->memberName($new)];

                continue;
            }

            if (in_array($field, self::HIDDEN_FIELDS, true) || str_ends_with($field, '_id')) {
                continue;
            }

            $changes[] = ['field' => $field, 'old' => $this->decode($this->old_values[$field] ?? null), 'new' => $this->decode($new)];
        }

        return $changes;
    }

    private function memberName(mixed $membershipId): ?string
    {
        return is_numeric($membershipId)
            ? Membership::query()->with('user')->find((int) $membershipId)?->user?->name
            : null;
    }

    /** JSON columns (role names, permission lists) are stored raw in the trail. */
    private function decode(mixed $value): mixed
    {
        if (is_string($value) && in_array($value[0] ?? '', ['[', '{'], true)) {
            return json_decode($value, true) ?? $value;
        }

        return $value;
    }

    private function localized(mixed $value): ?string
    {
        $value = $this->decode($value);

        if (is_array($value)) {
            return $this->stringOrNull($value[app()->getLocale()] ?? reset($value));
        }

        return $this->stringOrNull($value);
    }

    private function stringOrNull(mixed $value): ?string
    {
        return is_string($value) ? $value : null;
    }
}
