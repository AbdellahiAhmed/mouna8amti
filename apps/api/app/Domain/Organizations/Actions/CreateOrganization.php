<?php

namespace App\Domain\Organizations\Actions;

use App\Domain\Access\Enums\Permission;
use App\Domain\Access\Enums\SystemRole;
use App\Domain\Access\Models\Role;
use App\Domain\Organizations\Enums\MembershipStatus;
use App\Domain\Organizations\Models\Membership;
use App\Domain\Organizations\Models\Organization;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateOrganization
{
    public function __construct(private readonly TenantContext $tenant) {}

    /**
     * Creates the organisation, its system roles and the founder's Admin seat
     * in one transaction, then leaves the context inside the new tenant.
     *
     * @param  array{name: string, legal_name?: string|null, country: string, currency: string, locale: string, fiscal_year_start_month: int}  $attributes
     */
    public function handle(User $founder, array $attributes): Organization
    {
        return DB::transaction(function () use ($founder, $attributes): Organization {
            $organization = new Organization([...$attributes, 'slug' => $this->uniqueSlug($attributes['name'])]);

            // Saved quietly: the audit row needs the tenant context, which needs the id.
            $organization->saveQuietly();
            $this->tenant->enter($organization);
            $organization->recordCreationAudit();

            $adminRoleId = null;

            foreach (SystemRole::cases() as $systemRole) {
                $role = Role::query()->create([
                    'key' => $systemRole->value,
                    'name' => $systemRole->names(),
                    'permissions' => array_map(fn (Permission $p): string => $p->value, $systemRole->permissions()),
                    'is_system' => true,
                ]);

                if ($systemRole === SystemRole::Admin) {
                    $adminRoleId = $role->id;
                }
            }

            $membership = Membership::query()->create([
                'user_id' => $founder->getKey(),
                'status' => MembershipStatus::Active,
            ]);
            $membership->assignRoles([(int) $adminRoleId]);

            $this->tenant->enter($organization, $membership);

            return $organization;
        });
    }

    private function uniqueSlug(string $name): string
    {
        // Arabic names transliterate poorly or to nothing; a random suffix keeps slugs unique and unguessable.
        $base = Str::limit(Str::slug($name), 40, '') ?: 'org';

        do {
            $slug = $base.'-'.Str::lower(Str::random(5));
        } while (Organization::query()->where('slug', $slug)->exists());

        return $slug;
    }
}
