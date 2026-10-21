<?php

namespace App\Domain\Organizations\Models;

use App\Domain\Access\Enums\Permission;
use App\Domain\Access\Models\Role;
use App\Domain\Audit\RecordsAudit;
use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Tenancy\BelongsToOrganization;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A user's seat inside one organisation. Permissions are resolved here, not
 * on the user, because the same person can hold different roles in
 * different organisations.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $user_id
 * @property MembershipStatus $status
 * @property string|null $title
 */
class Membership extends Model
{
    use BelongsToOrganization, RecordsAudit;

    protected $fillable = ['organization_id', 'user_id', 'status', 'title'];

    protected function casts(): array
    {
        return [
            'status' => MembershipStatus::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsToMany<Role, $this> */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)->withPivot('organization_id')->withTimestamps();
    }

    /** @param  list<int>  $roleIds */
    public function assignRoles(array $roleIds): void
    {
        $this->roles()->syncWithPivotValues($roleIds, ['organization_id' => $this->organization_id]);
        $this->unsetRelation('roles');
    }

    /** @return list<string> */
    public function permissions(): array
    {
        $permissions = [];

        foreach ($this->roles as $role) {
            foreach ($role->permissions as $permission) {
                $permissions[$permission] = true;
            }
        }

        return array_keys($permissions);
    }

    public function hasPermission(Permission $permission): bool
    {
        return $this->status === MembershipStatus::Active
            && in_array($permission->value, $this->permissions(), true);
    }
}
