<?php

namespace App\Domain\Access\Models;

use App\Domain\Audit\RecordsAudit;
use App\Domain\Tenancy\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $key
 * @property array{ar: string, fr: string, en: string} $name
 * @property list<string> $permissions
 * @property bool $is_system
 */
class Role extends Model
{
    use BelongsToOrganization, RecordsAudit;

    protected $fillable = ['organization_id', 'key', 'name', 'permissions', 'is_system'];

    protected function casts(): array
    {
        return [
            'name' => 'array',
            'permissions' => 'array',
            'is_system' => 'boolean',
        ];
    }
}
